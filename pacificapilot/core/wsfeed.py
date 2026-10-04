"""
Live market feed over Pacifica WebSocket — stdlib only, no extra dependencies.

Public channels only (no account data crosses this feed):
    trades            last trade price per symbol (taker side)
    book              order-book snapshots (250ms cadence)
    mark_price_candle mark-price candles (same shape as REST /kline/mark)

Run in a background daemon thread; the loop agent (or anything else) polls
the in-memory caches via get_price()/get_book(). Auto-reconnects with
backoff. Enable via config flag `use_ws_feed` — REST remains the default.

WS URLs (docs): mainnet wss://ws.pacifica.fi/ws, testnet wss://test-ws.pacifica.fi/ws.
Heartbeat: {"method":"ping"} every <60s or the server closes the connection.
"""

import base64
import hashlib
import json
import os
import socket
import ssl
import struct
import threading
import time

from .urls import get_base_url

_WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


def _ws_url(mode=None) -> str:
    """Map REST mode to the matching WS endpoint."""
    base = get_base_url(mode)
    host = "test-ws.pacifica.fi" if "test-api" in base else "ws.pacifica.fi"
    return f"wss://{host}/ws"


class _RawWebSocket:
    """Minimal RFC 6455 client: handshake, masked text send, frame recv."""

    def __init__(self, url: str, timeout: float = 10.0):
        self.url = url
        self.timeout = timeout
        self.sock = None

    def connect(self):
        from urllib.parse import urlparse

        parts = urlparse(self.url)
        host = parts.hostname
        port = parts.port or 443
        path = parts.path or "/"

        raw = socket.create_connection((host, port), timeout=self.timeout)
        ctx = ssl.create_default_context()
        self.sock = ctx.wrap_socket(raw, server_hostname=host)
        self.sock.settimeout(self.timeout)

        key = base64.b64encode(os.urandom(16)).decode("ascii")
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        self.sock.sendall(request.encode("ascii"))

        response = b""
        while b"\r\n\r\n" not in response:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError("WebSocket handshake got no response")
            response += chunk

        head = response.decode("latin1")
        if " 101 " not in head.split("\r\n", 1)[0]:
            raise ConnectionError(f"WebSocket handshake rejected: {head.splitlines()[0]}")

        accept = hashlib.sha1((key + _WS_GUID).encode("ascii")).digest()
        expected = base64.b64encode(accept).decode("ascii")
        if expected not in head:
            raise ConnectionError("WebSocket handshake accept-key mismatch")

    def send_text(self, text: str):
        payload = text.encode("utf-8")
        mask = os.urandom(4)
        header = bytes([0x81])
        length = len(payload)
        if length < 126:
            header += struct.pack("!B", 0x80 | length)
        elif length < 65536:
            header += struct.pack("!B", 0x80 | 126) + struct.pack("!H", length)
        else:
            header += struct.pack("!B", 0x80 | 127) + struct.pack("!Q", length)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.sock.sendall(header + mask + masked)

    def _recv_exact(self, n: int) -> bytes:
        buf = b""
        while len(buf) < n:
            chunk = self.sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("WebSocket connection closed by peer")
            buf += chunk
        return buf

    def recv_text(self):
        """Return next complete text message, or None on ping/pong/close."""
        fragments = []
        while True:
            b1, b2 = struct.unpack("!BB", self._recv_exact(2))
            fin = b1 & 0x80
            opcode = b1 & 0x0F
            masked = b2 & 0x80
            length = b2 & 0x7F
            if length == 126:
                length = struct.unpack("!H", self._recv_exact(2))[0]
            elif length == 127:
                length = struct.unpack("!Q", self._recv_exact(8))[0]
            if masked:
                mask = self._recv_exact(4)
            payload = self._recv_exact(length) if length else b""
            if masked:
                payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))

            if opcode == 0x8:  # close
                raise ConnectionError("WebSocket close frame received")
            if opcode == 0x9:  # ping -> pong
                self._send_frame(0xA, payload)
                continue
            if opcode == 0xA:  # pong
                continue
            if opcode == 0x1:  # text (start)
                fragments = [payload]
            elif opcode == 0x0:  # continuation
                fragments.append(payload)
            else:
                continue
            if fin:
                return b"".join(fragments).decode("utf-8", errors="replace")

    def _send_frame(self, opcode: int, payload: bytes):
        mask = os.urandom(4)
        header = bytes([0x80 | opcode])
        length = len(payload)
        if length < 126:
            header += struct.pack("!B", 0x80 | length)
        elif length < 65536:
            header += struct.pack("!B", 0x80 | 126) + struct.pack("!H", length)
        else:
            header += struct.pack("!B", 0x80 | 127) + struct.pack("!Q", length)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.sock.sendall(header + mask + masked)

    def close(self):
        try:
            if self.sock:
                self._send_frame(0x8, b"")
                self.sock.close()
        except Exception:
            pass
        finally:
            self.sock = None


class PacificaFeed:
    """
    Background live-price feed for a set of symbols.

    Usage:
        feed = PacificaFeed(["BTC", "ETH"])
        feed.start()
        ...
        price = feed.get_price("BTC")  # float | None
        book = feed.get_book("BTC")    # {"bids": [...], "asks": [...]} | None
        feed.stop()
    """

    def __init__(self, symbols, on_trade=None, book_levels: int = 5):
        self.symbols = [s.upper() for s in symbols]
        self.on_trade = on_trade
        self.book_levels = book_levels
        self._prices: dict = {}
        self._books: dict = {}
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.connected = False

    # -- public API -----------------------------------------------------
    def start(self) -> "PacificaFeed":
        """Start the background thread (daemon). Idempotent."""
        if self._thread and self._thread.is_alive():
            return self
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, daemon=True, name="pacifica-wsfeed")
        self._thread.start()
        return self

    def stop(self):
        self._stop.set()

    def get_price(self, symbol: str):
        """Last trade price, or None if nothing received yet."""
        with self._lock:
            entry = self._prices.get(symbol.upper())
            return entry["price"] if entry else None

    def get_book(self, symbol: str):
        """Latest order book snapshot, or None."""
        with self._lock:
            return self._books.get(symbol.upper())

    # -- internals ------------------------------------------------------
    def _run(self):
        backoff = 1.0
        while not self._stop.is_set():
            try:
                self._serve()
                backoff = 1.0
            except Exception:
                self.connected = False
                if self._stop.wait(min(backoff, 30.0)):
                    break
                backoff = min(backoff * 2.0, 30.0)

    def _serve(self):
        ws = _RawWebSocket(_ws_url())
        try:
            ws.connect()
            for symbol in self.symbols:
                ws.send_text(json.dumps({"method": "subscribe", "params": {"source": "trades", "symbol": symbol}}))
                ws.send_text(json.dumps({"method": "subscribe", "params": {"source": "book", "symbol": symbol, "agg_level": 1}}))
            self.connected = True
            last_ping = time.time()
            while not self._stop.is_set():
                if time.time() - last_ping > 30:
                    ws.send_text(json.dumps({"method": "ping"}))
                    last_ping = time.time()
                ws.sock.settimeout(5.0)
                try:
                    raw = ws.recv_text()
                except socket.timeout:
                    continue
                if raw is None:
                    continue
                try:
                    self._handle(json.loads(raw))
                except Exception:
                    continue
        finally:
            self.connected = False
            ws.close()

    def _handle(self, msg: dict):
        channel = msg.get("channel")
        data = msg.get("data")
        if channel == "trades" and isinstance(data, list):
            for t in data:
                try:
                    price = float(t["p"])
                except (KeyError, TypeError, ValueError):
                    continue
                symbol = str(t.get("s", "")).upper()
                with self._lock:
                    self._prices[symbol] = {"price": price, "t": t.get("t")}
                if self.on_trade:
                    try:
                        self.on_trade(symbol, price, t)
                    except Exception:
                        pass
        elif channel == "book" and isinstance(data, dict):
            symbol = str(data.get("s", "")).upper()
            levels = data.get("l") or [[], []]
            try:
                bids = [{"price": float(x["p"]), "amount": float(x["a"])} for x in (levels[0] or [])[: self.book_levels]]
                asks = [{"price": float(x["p"]), "amount": float(x["a"])} for x in (levels[1] or [])[: self.book_levels]]
            except (TypeError, ValueError, KeyError, IndexError):
                return
            with self._lock:
                self._books[symbol] = {"bids": bids, "asks": asks, "t": data.get("t")}
        # pong + unknown channels intentionally ignored


# Module-level shared feed (lazy): keeps one connection per process.
_shared_feed: PacificaFeed | None = None
_shared_lock = threading.Lock()


def get_shared_feed(symbols=None) -> PacificaFeed | None:
    """
    Return the process-wide feed, starting it on first use.

    Returns None if the feed cannot start (caller must fall back to REST).
    """
    global _shared_feed
    with _shared_lock:
        if _shared_feed is None and symbols:
            try:
                _shared_feed = PacificaFeed(symbols).start()
            except Exception:
                return None
        return _shared_feed


def live_price(symbol: str):
    """Best-effort live price from the shared feed, else None (use REST)."""
    feed = get_shared_feed()
    if feed is None:
        return None
    return feed.get_price(symbol)
