"""
Order execution and position management against Pacifica API.

Pure functions — position state is passed in/out, not stored here.
"""

import time
import uuid
import hashlib
import json
import base58
from typing import Optional
import requests
from solders.keypair import Keypair
from solders.pubkey import Pubkey

BASE_URL = "https://test-api.pacifica.fi/api/v1"

_session = requests.Session()
_session.headers.update({
    "Accept": "application/json",
    "User-Agent": "PacificaPilot/0.1.0"
})


def place_order(
    symbol: str,
    side: str,
    usdc_size: float,
    keypair: Keypair,
    agent_keypair: Keypair,
    mark_price: float,
    order_type: str = "market",
    slippage_pct: float = 0.5,
    dry_run: bool = True,
) -> dict:
    """
    Place a market or limit order on Pacifica.

    Args:
        symbol: Market symbol (e.g., "BTC", "ETH")
        side: "bid" (long) or "ask" (short)
        usdc_size: USDC amount to trade
        keypair: User's Solana keypair for signing
        agent_keypair: Agent's keypair (if delegated signing is used)
        mark_price: Current mark price for quantity calculation
        order_type: "market" or "limit"
        slippage_pct: Slippage tolerance percentage
        dry_run: If True, skip actual order placement

    Returns:
        {
            "success": bool,
            "order_id": str | None,
            "quantity": float,
            "avg_price": float | None,
            "message": str,
            "dry_run": bool,
        }
    """
    if usdc_size <= 0:
        return {
            "success": False,
            "order_id": None,
            "quantity": 0,
            "avg_price": None,
            "message": "Invalid USDC size",
            "dry_run": dry_run,
        }

    # Get market info for lot size and min order size
    market_info = _get_market_info(symbol)
    if not market_info:
        return {
            "success": False,
            "order_id": None,
            "quantity": 0,
            "avg_price": None,
            "message": f"Could not fetch market info for {symbol}",
            "dry_run": dry_run,
        }

    lot_size = market_info["lot_size"]
    min_order_size = market_info["min_order_size"]

    if usdc_size < min_order_size:
        return {
            "success": False,
            "order_id": None,
            "quantity": 0,
            "avg_price": None,
            "message": f"Order size ${usdc_size:.2f} below minimum ${min_order_size:.2f}",
            "dry_run": dry_run,
        }

    # Calculate quantity from USDC size
    quantity = (usdc_size / mark_price)
    quantity = round(quantity / lot_size) * lot_size

    if quantity <= 0:
        return {
            "success": False,
            "order_id": None,
            "quantity": 0,
            "avg_price": None,
            "message": "Calculated quantity is zero after lot size rounding",
            "dry_run": dry_run,
        }

    if dry_run:
        return {
            "success": True,
            "order_id": f"dry-{uuid.uuid4().hex[:8]}",
            "quantity": quantity,
            "avg_price": mark_price,
            "message": f"[DRY RUN] Would place {side.upper()} {quantity} {symbol} @ ~${mark_price:,.2f}",
            "dry_run": True,
        }

    # Build and sign order request per Pacifica spec
    timestamp = int(time.time() * 1000)
    order_id = str(uuid.uuid4())

    # Operation data (the actual order fields)
    operation_data = {
        "symbol": symbol,
        "amount": str(quantity),
        "side": side,  # "bid" or "ask"
        "slippage_percent": str(slippage_pct),
        "reduce_only": False,
        "client_order_id": order_id,
    }

    # Signature header
    signature_header = {
        "timestamp": timestamp,
        "expiry_window": 30000,
        "type": "create_market_order",
    }

    # Build, sort, and sign the message
    message_to_sign = _build_order_message({**signature_header, "data": operation_data})
    signature = _sign_message(message_to_sign, keypair)

    # Final request: auth header + operation data (NOT wrapped in "data")
    final_request = {
        "account": str(keypair.pubkey()),
        "signature": signature,
        "timestamp": timestamp,
        "expiry_window": 30000,
        **operation_data,
    }

    headers = {
        **_session.headers,
        "Content-Type": "application/json",
    }

    try:
        # Correct Pacifica endpoint: /api/v1/orders/create_market
        endpoint = "orders/create_market" if order_type == "market" else "orders/create"
        r = requests.post(
            f"{BASE_URL}/{endpoint}",
            json=final_request,
            headers=headers,
            timeout=15,
        )
        r.raise_for_status()
        result = r.json()

        # Response: {"order_id": 12345, ...}
        return {
            "success": True,
            "order_id": str(result.get("order_id", order_id)),
            "quantity": quantity,
            "avg_price": float(result.get("avg_price", mark_price)),
            "message": f"Order placed: {side.upper()} {quantity} {symbol}",
            "dry_run": False,
        }
    except requests.exceptions.HTTPError as e:
        # Get full error response from server for debugging
        try:
            error_json = e.response.json()
            error_detail = f"{e.response.status_code} - {error_json}"
        except Exception:
            error_detail = f"{e.response.status_code} - {e.response.text if e.response else str(e)}"
        # Also log the request payload for debugging (without signature)
        debug_payload = {k: v for k, v in final_request.items() if k != 'signature'}
        import sys
        print(f"[place_order] Request payload: {json.dumps(debug_payload, indent=2)}", file=sys.stderr)
        return {
            "success": False,
            "order_id": None,
            "quantity": quantity,
            "avg_price": None,
            "message": f"Order failed: {error_detail}",
            "dry_run": False,
        }
    except Exception as e:
        return {
            "success": False,
            "order_id": None,
            "quantity": quantity,
            "avg_price": None,
            "message": f"Order error: {str(e)}",
            "dry_run": False,
        }


def place_limit_order(
    symbol: str,
    side: str,
    usdc_size: float,
    limit_price: float,
    keypair: Keypair,
    agent_keypair: Keypair,
    dry_run: bool = True,
    time_in_force: str = "GTC",
) -> dict:
    """
    Place a limit order on Pacifica at a specific price.

    Args:
        symbol: Market symbol (e.g., "BTC", "ETH")
        side: "bid" (long) or "ask" (short)
        usdc_size: USDC amount to trade
        limit_price: Limit price to execute at
        keypair: User's Solana keypair for signing
        agent_keypair: Agent's keypair (if delegated signing is used)
        dry_run: If True, skip actual order placement
        time_in_force: "GTC" (Good Till Cancel), "IOC" (Immediate or Cancel), "FOK" (Fill or Kill)

    Returns:
        {
            "success": bool,
            "order_id": str | None,
            "quantity": float,
            "limit_price": float,
            "message": str,
            "dry_run": bool,
        }
    """
    if usdc_size <= 0:
        return {
            "success": False,
            "order_id": None,
            "quantity": 0,
            "limit_price": limit_price,
            "message": "Invalid USDC size",
            "dry_run": dry_run,
        }

    # Get market info for lot size and min order size
    market_info = _get_market_info(symbol)
    if not market_info:
        return {
            "success": False,
            "order_id": None,
            "quantity": 0,
            "limit_price": limit_price,
            "message": f"Could not fetch market info for {symbol}",
            "dry_run": dry_run,
        }

    lot_size = market_info["lot_size"]
    min_order_size = market_info["min_order_size"]

    if usdc_size < min_order_size:
        return {
            "success": False,
            "order_id": None,
            "quantity": 0,
            "limit_price": limit_price,
            "message": f"Order size ${usdc_size:.2f} below minimum ${min_order_size:.2f}",
            "dry_run": dry_run,
        }

    # Calculate quantity from USDC size
    quantity = (usdc_size / limit_price)
    quantity = round(quantity / lot_size) * lot_size

    if quantity <= 0:
        return {
            "success": False,
            "order_id": None,
            "quantity": 0,
            "limit_price": limit_price,
            "message": "Calculated quantity is zero after lot size rounding",
            "dry_run": dry_run,
        }

    if dry_run:
        return {
            "success": True,
            "order_id": f"dry-limit-{uuid.uuid4().hex[:8]}",
            "quantity": quantity,
            "limit_price": limit_price,
            "message": f"[DRY RUN] Would place LIMIT {side.upper()} {quantity} {symbol} @ ${limit_price:,.2f}",
            "dry_run": True,
        }

    # Build and sign limit order request
    timestamp = int(time.time() * 1000)
    order_id = str(uuid.uuid4())

    order_payload = {
        "symbol": symbol,
        "side": side,
        "quantity": str(quantity),
        "price": str(limit_price),
        "order_type": "limit",
        "time_in_force": time_in_force,
        "client_order_id": order_id,
        "timestamp": timestamp,
    }

    # Sign with user's keypair
    message_to_sign = _build_order_message(order_payload)
    signature = _sign_message(message_to_sign, keypair)

    headers = {
        **_session.headers,
        "PF-SIGNATURE": signature,
        "PF-PUBLIC-KEY": str(keypair.pubkey()),
        "PF-TIMESTAMP": str(timestamp),
    }

    try:
        r = requests.post(
            f"{BASE_URL}/limit-order",
            json=order_payload,
            headers=headers,
            timeout=15,
        )
        r.raise_for_status()
        result = r.json()

        return {
            "success": True,
            "order_id": result.get("order_id", order_id),
            "quantity": quantity,
            "limit_price": limit_price,
            "message": f"Limit order placed: {side.upper()} {quantity} {symbol} @ ${limit_price:,.2f}",
            "dry_run": False,
        }
    except requests.exceptions.HTTPError as e:
        error_detail = e.response.text if e.response else str(e)
        return {
            "success": False,
            "order_id": None,
            "quantity": quantity,
            "limit_price": limit_price,
            "message": f"Limit order failed: {error_detail}",
            "dry_run": False,
        }
    except Exception as e:
        return {
            "success": False,
            "order_id": None,
            "quantity": quantity,
            "limit_price": limit_price,
            "message": f"Limit order error: {str(e)}",
            "dry_run": False,
        }


def close_position(
    symbol: str,
    keypair: Keypair,
    position_side: str,
    quantity: float,
    dry_run: bool = True,
) -> dict:
    """
    Close an open position by placing an opposing market order.

    Args:
        symbol: Market symbol
        keypair: User's Solana keypair
        position_side: Current position side ("bid" or "ask")
        quantity: Position quantity to close
        dry_run: If True, skip actual order placement

    Returns:
        {
            "success": bool,
            "order_id": str | None,
            "message": str,
            "dry_run": bool,
        }
    """
    # Close a long (bid) position by selling (ask), and vice versa
    close_side = "ask" if position_side == "bid" else "bid"

    if dry_run:
        return {
            "success": True,
            "order_id": f"dry-close-{uuid.uuid4().hex[:8]}",
            "message": f"[DRY RUN] Would close {position_side.upper()} position: {close_side.upper()} {quantity} {symbol}",
            "dry_run": True,
        }

    timestamp = int(time.time() * 1000)
    order_id = str(uuid.uuid4())

    # Operation data
    operation_data = {
        "symbol": symbol,
        "amount": str(quantity),
        "side": close_side,
        "slippage_percent": str(slippage_pct if 'slippage_pct' in dir() else 0.5),
        "reduce_only": True,
        "client_order_id": order_id,
    }

    # Signature header
    signature_header = {
        "timestamp": timestamp,
        "expiry_window": 30000,
        "type": "create_market_order",
    }

    message_to_sign = _build_order_message({**signature_header, "data": operation_data})
    signature = _sign_message(message_to_sign, keypair)

    final_request = {
        "account": str(keypair.pubkey()),
        "signature": signature,
        "timestamp": timestamp,
        "expiry_window": 30000,
        **operation_data,
    }

    try:
        r = requests.post(
            f"{BASE_URL}/orders/create_market",
            json=final_request,
            headers={**_session.headers, "Content-Type": "application/json"},
            timeout=15,
        )
        r.raise_for_status()
        result = r.json()

        return {
            "success": True,
            "order_id": str(result.get("order_id", order_id)),
            "message": f"Position closed: {close_side.upper()} {quantity} {symbol}",
            "dry_run": False,
        }
    except Exception as e:
        return {
            "success": False,
            "order_id": None,
            "message": f"Close failed: {str(e)}",
            "dry_run": False,
        }


def get_open_positions(wallet_address: str) -> dict:
    """
    Fetch all open positions for a wallet from Pacifica API.

    Uses GET /api/v1/positions?account=... (no signing required for GET).

    Returns:
        {
            "BTC": {
                "symbol": "BTC",
                "side": "bid" | "ask",
                "amount": float,        # base asset amount
                "entry_price": float,
                "mark_price": float,    # current mark (fetched separately)
                "unrealized_pnl": float,
                "quantity": float,      # same as amount
                "liquidation_price": float | None,
                "funding": float,
                "created_at": int,
                "updated_at": int,
            },
            ...
        }
    """
    try:
        # GET endpoint - no signing needed, but no empty body allowed
        r = _session.get(
            f"{BASE_URL}/positions",
            params={"account": wallet_address},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json().get("data", [])

        positions = {}
        for pos in data:
            symbol = pos.get("symbol")
            amount_str = pos.get("amount", "0")
            amount = float(amount_str) if amount_str else 0

            if symbol and amount != 0:
                # Fetch current mark price for PnL calculation
                mark_price = 0
                try:
                    from .market_data import fetch_pacifica_price
                    price_data = fetch_pacifica_price(symbol)
                    if price_data:
                        mark_price = price_data.get("mark_price", 0)
                except Exception:
                    pass

                entry_price = float(pos.get("entry_price", 0))
                side = pos.get("side", "bid")

                # Calculate unrealized PnL
                if mark_price > 0 and entry_price > 0:
                    if side == "bid":
                        unrealized_pnl = (mark_price - entry_price) * amount
                    else:
                        unrealized_pnl = (entry_price - mark_price) * amount
                else:
                    unrealized_pnl = 0

                positions[symbol] = {
                    "symbol": symbol,
                    "side": side,
                    "amount": amount,
                    "size": amount,  # alias for backward compat
                    "quantity": amount,
                    "entry_price": entry_price,
                    "mark_price": mark_price,
                    "unrealized_pnl": unrealized_pnl,
                    "liquidation_price": pos.get("liquidation_price"),
                    "funding": float(pos.get("funding", 0)),
                    "isolated": pos.get("isolated", False),
                    "created_at": pos.get("created_at"),
                    "updated_at": pos.get("updated_at"),
                }
        return positions
    except Exception as e:
        # Log the error for debugging
        import sys
        print(f"[get_open_positions] Error fetching positions: {e}", file=sys.stderr)
        return {}


def get_account_info(wallet_address: str) -> Optional[dict]:
    """
    Fetch account balance and margin info.

    Returns:
        {
            "balance": float,
            "account_equity": float,
            "available_to_spend": float,
            "total_margin_used": float,
            "spot_balances": [{"symbol": str, "amount": float}, ...],
        }
    """
    try:
        r = _session.get(f"{BASE_URL}/account", params={"account": wallet_address}, timeout=10)
        r.raise_for_status()
        data = r.json().get("data", {})

        return {
            "balance": float(data.get("balance", 0)),
            "account_equity": float(data.get("account_equity", 0)),
            "available_to_spend": float(data.get("available_to_spend", 0)),
            "total_margin_used": float(data.get("total_margin_used", 0)),
            "spot_balances": data.get("spot_balances", []),
        }
    except Exception:
        return None


def should_exit_position(
    symbol: str,
    current_price: float,
    entry_price: float,
    side: str,
    stop_loss_pct: float,
    take_profit_pct: float,
    trailing_high: Optional[float] = None,
    trailing_low: Optional[float] = None,
) -> tuple[bool, str]:
    """
    Check if a position should be closed based on SL/TP rules.

    Args:
        symbol: Market symbol
        current_price: Current mark price
        entry_price: Entry price
        side: "bid" (long) or "ask" (short)
        stop_loss_pct: Stop loss percentage
        take_profit_pct: Take profit percentage
        trailing_high: Highest price seen (for long trailing stop)
        trailing_low: Lowest price seen (for short trailing stop)

    Returns:
        (should_exit: bool, reason: str)
    """
    if side == "bid":
        # Long position
        pnl_pct = ((current_price - entry_price) / entry_price) * 100

        # Take profit
        if pnl_pct >= take_profit_pct:
            return True, f"Take profit hit: {pnl_pct:.2f}% >= {take_profit_pct}%"

        # Trailing stop loss
        if trailing_high and trailing_high > entry_price:
            trailing_stop = trailing_high * (1 - stop_loss_pct / 100)
            if current_price <= trailing_stop:
                return True, f"Trailing stop hit: ${current_price:,.2f} <= ${trailing_stop:,.2f}"

        # Fixed stop loss
        if pnl_pct <= -stop_loss_pct:
            return True, f"Stop loss hit: {pnl_pct:.2f}% <= -{stop_loss_pct}%"

    else:
        # Short position
        pnl_pct = ((entry_price - current_price) / entry_price) * 100

        # Take profit
        if pnl_pct >= take_profit_pct:
            return True, f"Take profit hit: {pnl_pct:.2f}% >= {take_profit_pct}%"

        # Trailing stop loss
        if trailing_low and trailing_low < entry_price:
            trailing_stop = trailing_low * (1 + stop_loss_pct / 100)
            if current_price >= trailing_stop:
                return True, f"Trailing stop hit: ${current_price:,.2f} >= ${trailing_stop:,.2f}"

        # Fixed stop loss
        if pnl_pct <= -stop_loss_pct:
            return True, f"Stop loss hit: {pnl_pct:.2f}% <= -{stop_loss_pct}%"

    return False, ""


def compute_pnl(
    entry_price: float,
    current_price: float,
    quantity: float,
    side: str,
) -> float:
    """
    Calculate unrealized PnL in USDC.

    Args:
        entry_price: Entry price
        current_price: Current mark price
        quantity: Position quantity
        side: "bid" (long) or "ask" (short)

    Returns:
        PnL in USDC
    """
    if side == "bid":
        return (current_price - entry_price) * quantity
    else:
        return (entry_price - current_price) * quantity


def _get_market_info(symbol: str) -> Optional[dict]:
    """Fetch market info (lot size, tick size, min order size) from Pacifica."""
    try:
        r = _session.get(f"{BASE_URL}/info", timeout=10)
        r.raise_for_status()
        data = r.json().get("data", [])

        for market in data:
            if market.get("symbol") == symbol:
                return {
                    "lot_size": float(market.get("lot_size", 0.0001)),
                    "tick_size": float(market.get("tick_size", 0.01)),
                    "min_order_size": float(market.get("min_order_size", 10)),
                }

        # Fallback: return sensible defaults if symbol not found
        return {
            "lot_size": 0.0001,
            "tick_size": 0.01,
            "min_order_size": 10.0,
        }
    except Exception:
        # Fallback: return sensible defaults if API fails
        return {
            "lot_size": 0.0001,
            "tick_size": 0.01,
            "min_order_size": 10.0,
        }


def _build_order_message(data: dict) -> str:
    """
    Build the message to sign for order authentication per Pacifica spec.

    Steps:
    1. Recursively sort all JSON keys alphabetically
    2. Serialize as compact JSON (no whitespace, comma/colon separators)
    3. Encode as UTF-8 bytes (caller handles this)
    """
    import json

    def _sort_keys(value):
        if isinstance(value, dict):
            return {k: _sort_keys(value[k]) for k in sorted(value.keys())}
        elif isinstance(value, list):
            return [_sort_keys(item) for item in value]
        return value

    sorted_data = _sort_keys(data)
    return json.dumps(sorted_data, separators=(",", ":"))


def _sign_message(message: str, keypair: Keypair) -> str:
    """Sign a message with the Solana keypair and return base58-encoded signature."""
    message_bytes = message.encode("utf-8")
    signature = keypair.sign_message(message_bytes)
    return base58.b58encode(bytes(signature)).decode("utf-8")
