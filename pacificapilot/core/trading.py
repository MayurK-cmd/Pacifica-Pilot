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

from .urls import get_base_url

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
    limit_price: Optional[float] = None,
    time_in_force: str = "GTC",
) -> dict:
    """
    Place a market or limit order on Pacifica.

    Market orders use POST /api/v1/orders/create_market (op "create_market_order").
    Limit orders use POST /api/v1/orders/create (op "create_order") and require
    limit_price.

    Args:
        symbol: Market symbol (e.g., "BTC", "ETH")
        side: "bid" (long) or "ask" (short)
        usdc_size: USDC amount to trade
        keypair: User's Solana keypair for signing
        agent_keypair: Agent's keypair (if delegated signing is used)
        mark_price: Current mark price for quantity calculation
        order_type: "market" or "limit"
        slippage_pct: Slippage tolerance percentage (market orders only)
        dry_run: If True, skip actual order placement
        limit_price: Required when order_type="limit"
        time_in_force: "GTC" (default), "IOC", "ALO", or "TOB" (limit orders)

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
    if order_type not in ("market", "limit"):
        return {
            "success": False,
            "order_id": None,
            "quantity": 0,
            "avg_price": None,
            "message": f"Invalid order_type {order_type!r}. Use 'market' or 'limit'",
            "dry_run": dry_run,
        }
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

    # Reference price depends on order type (limit orders size off limit_price)
    ref_price = limit_price if order_type == "limit" else mark_price
    if order_type == "limit":
        if limit_price is None or limit_price <= 0:
            return {
                "success": False,
                "order_id": None,
                "quantity": 0,
                "avg_price": None,
                "message": "limit_price is required for limit orders",
                "dry_run": dry_run,
            }
        tif = time_in_force.upper()
        if tif not in VALID_TIF:
            return {
                "success": False,
                "order_id": None,
                "quantity": 0,
                "avg_price": None,
                "message": f"Invalid time_in_force {time_in_force!r}. Valid: {', '.join(VALID_TIF)}",
                "dry_run": dry_run,
            }

    # Calculate quantity from USDC size
    quantity = (usdc_size / ref_price)
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
        if order_type == "limit":
            return {
                "success": True,
                "order_id": f"dry-limit-{uuid.uuid4().hex[:8]}",
                "quantity": quantity,
                "avg_price": limit_price,
                "message": f"[DRY RUN] Would place LIMIT {side.upper()} {quantity} {symbol} @ ${limit_price:,.2f}",
                "dry_run": True,
            }
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

    if order_type == "limit":
        # POST /api/v1/orders/create, signing op type "create_order"
        endpoint = "orders/create"
        operation_data = {
            "symbol": symbol,
            "price": str(limit_price),
            "amount": str(quantity),
            "side": side,  # "bid" or "ask"
            "tif": tif,
            "reduce_only": False,
            "client_order_id": order_id,
        }
        op_type = "create_order"
    else:
        # POST /api/v1/orders/create_market, signing op "create_market_order"
        endpoint = "orders/create_market"
        operation_data = {
            "symbol": symbol,
            "amount": str(quantity),
            "side": side,  # "bid" or "ask"
            "slippage_percent": str(slippage_pct),
            "reduce_only": False,
            "client_order_id": order_id,
        }
        op_type = "create_market_order"

    # Signature header
    signature_header = {
        "timestamp": timestamp,
        "expiry_window": 30000,
        "type": op_type,
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
        r = requests.post(
            f"{get_base_url()}/{endpoint}",
            json=final_request,
            headers=headers,
            timeout=15,
        )
        r.raise_for_status()
        result = r.json()

        # Response is only {"order_id": 12345} — read the real fill back
        # from order history instead of assuming the pre-trade price.
        placed_id = str(result.get("order_id", order_id))
        avg_price = ref_price
        fill_status: Optional[str] = None
        filled_amount = 0.0
        try:
            fill = get_order_fill(
                str(keypair.pubkey()),
                order_id=placed_id,
                client_order_id=order_id,
                symbol=symbol,
            )
            fill_status = fill.get("order_status")
            filled_amount = fill.get("filled_amount", 0.0)
            if fill.get("average_filled_price"):
                avg_price = fill["average_filled_price"]
        except Exception:
            pass

        return {
            "success": True,
            "order_id": placed_id,
            "quantity": quantity,
            "avg_price": avg_price,
            "fill_status": fill_status,
            "filled_amount": filled_amount,
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


# Time-in-force values accepted by POST /api/v1/orders/create per docs.
VALID_TIF = ("GTC", "IOC", "ALO", "TOB")


def place_limit_order(
    symbol: str,
    side: str,
    usdc_size: float,
    limit_price: float,
    keypair: Keypair,
    agent_keypair: Keypair,
    dry_run: bool = True,
    time_in_force: str = "GTC",
    reduce_only: bool = False,
) -> dict:
    """
    Place a limit order on Pacifica at a specific price.

    Uses POST /api/v1/orders/create (signing op type "create_order") with the
    same signed-envelope scheme as market orders — NOT a separate endpoint.

    Args:
        symbol: Market symbol (e.g., "BTC", "ETH")
        side: "bid" (long) or "ask" (short)
        usdc_size: USDC amount to trade
        limit_price: Limit price to execute at
        keypair: User's Solana keypair for signing
        agent_keypair: Agent's keypair (if delegated signing is used)
        dry_run: If True, skip actual order placement
        time_in_force: "GTC" (default), "IOC", "ALO", or "TOB" per API docs
        reduce_only: If True, order can only reduce an existing position

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

    tif = time_in_force.upper()
    if tif not in VALID_TIF:
        return {
            "success": False,
            "order_id": None,
            "quantity": quantity,
            "limit_price": limit_price,
            "message": f"Invalid time_in_force {time_in_force!r}. Valid: {', '.join(VALID_TIF)}",
            "dry_run": dry_run,
        }

    # Build and sign limit order request per Pacifica spec:
    # POST /api/v1/orders/create, signing op type "create_order".
    timestamp = int(time.time() * 1000)
    order_id = str(uuid.uuid4())

    operation_data = {
        "symbol": symbol,
        "price": str(limit_price),
        "amount": str(quantity),
        "side": side,  # "bid" or "ask"
        "tif": tif,
        "reduce_only": reduce_only,
        "client_order_id": order_id,
    }

    signature_header = {
        "timestamp": timestamp,
        "expiry_window": 30000,
        "type": "create_order",
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

    headers = {
        **_session.headers,
        "Content-Type": "application/json",
    }

    try:
        r = requests.post(
            f"{get_base_url()}/orders/create",
            json=final_request,
            headers=headers,
            timeout=15,
        )
        r.raise_for_status()
        result = r.json()

        return {
            "success": True,
            "order_id": str(result.get("order_id", order_id)),
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
            f"{get_base_url()}/orders/create_market",
            json=final_request,
            headers={**_session.headers, "Content-Type": "application/json"},
            timeout=15,
        )
        r.raise_for_status()
        result = r.json()

        placed_id = str(result.get("order_id", order_id))
        fill_status: Optional[str] = None
        try:
            fill = get_order_fill(
                str(keypair.pubkey()),
                order_id=placed_id,
                client_order_id=order_id,
                symbol=symbol,
            )
            fill_status = fill.get("order_status")
        except Exception:
            pass

        return {
            "success": True,
            "order_id": placed_id,
            "fill_status": fill_status,
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


def get_order_fill(
    account_address: str,
    order_id: Optional[str] = None,
    client_order_id: Optional[str] = None,
    symbol: Optional[str] = None,
    attempts: int = 3,
    wait_secs: float = 0.6,
) -> dict:
    """
    Look up an order's actual fill via GET /api/v1/orders/history.

    The create-order endpoints return only {"order_id": ...}, so the real
    average fill price must be read back. Market orders are subject to a
    ~200ms matching delay, hence the short retry loop.

    Args:
        account_address: Wallet address that placed the order
        order_id: Exchange order id (int or str) to match
        client_order_id: Client UUID to match (prefer when available)
        symbol: Optional symbol filter to reduce scanning
        attempts: How many history reads to attempt
        wait_secs: Sleep between attempts

    Returns:
        {
            "found": bool,
            "average_filled_price": float | None,  # VWAP, None if unfilled/unknown
            "filled_amount": float,
            "order_status": str | None,  # open|partially_filled|filled|cancelled|rejected
            "order_type": str | None,
        }
    """
    empty = {
        "found": False,
        "average_filled_price": None,
        "filled_amount": 0.0,
        "order_status": None,
        "order_type": None,
    }
    if order_id is None and client_order_id is None:
        return empty

    for _ in range(max(1, attempts)):
        try:
            r = _session.get(
                f"{get_base_url()}/orders/history",
                params={"account": account_address, "limit": 100},
                timeout=10,
            )
            r.raise_for_status()
            orders = r.json().get("data", [])
        except Exception:
            orders = []

        for o in orders:
            if symbol and o.get("symbol") != symbol:
                continue
            if client_order_id and o.get("client_order_id") == client_order_id:
                match = True
            elif order_id is not None and str(o.get("order_id")) == str(order_id):
                match = True
            else:
                continue
            if match:
                try:
                    avg = float(o.get("average_filled_price", 0) or 0)
                except (TypeError, ValueError):
                    avg = 0.0
                try:
                    filled = float(o.get("filled_amount", 0) or 0)
                except (TypeError, ValueError):
                    filled = 0.0
                return {
                    "found": True,
                    "average_filled_price": avg if avg > 0 else None,
                    "filled_amount": filled,
                    "order_status": o.get("order_status"),
                    "order_type": o.get("order_type"),
                }

        if wait_secs > 0:
            time.sleep(wait_secs)

    return empty


def _signed_post(endpoint: str, op_type: str, operation_data: dict, keypair: Keypair, timeout: int = 15):
    """
    Send a signed Pacifica write request.

    Builds the signature header, signs {header + data}, and POSTs the flat
    envelope (auth fields + operation fields, NOT wrapped in "data").

    Returns:
        (ok: bool, payload: dict) — payload is the decoded JSON on success,
        {"error": str} on failure.
    """
    timestamp = int(time.time() * 1000)
    signature_header = {
        "timestamp": timestamp,
        "expiry_window": 30000,
        "type": op_type,
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
            f"{get_base_url()}/{endpoint}",
            json=final_request,
            headers={**_session.headers, "Content-Type": "application/json"},
            timeout=timeout,
        )
        r.raise_for_status()
        try:
            return True, r.json()
        except Exception:
            return True, {}
    except requests.exceptions.HTTPError as e:
        try:
            detail = f"{e.response.status_code} - {e.response.json()}"
        except Exception:
            detail = f"{e.response.status_code} - {e.response.text if e.response else e}"
        return False, {"error": detail}
    except Exception as e:
        return False, {"error": str(e)}


def _tpsl_leg(stop_price: float, limit_price: Optional[float] = None,
               trigger_price_type: str = "mark_price") -> dict:
    """Build a take_profit / stop_loss leg object per API spec."""
    leg = {"stop_price": str(stop_price)}
    if limit_price is not None:
        leg["limit_price"] = str(limit_price)
    if trigger_price_type != "mark_price":
        leg["trigger_price_type"] = trigger_price_type
    return leg


def set_position_tpsl(
    symbol: str,
    side: str,
    keypair: Keypair,
    take_profit_price: Optional[float] = None,
    stop_loss_price: Optional[float] = None,
    take_profit_limit: Optional[float] = None,
    stop_loss_limit: Optional[float] = None,
    dry_run: bool = True,
) -> dict:
    """
    Attach native exchange-side take-profit / stop-loss to an open position.

    Uses POST /api/v1/positions/tpsl (signing op "set_position_tpsl").
    Unlike the loop's local SL/TP checks, these survive process restarts.

    Args:
        symbol: Market symbol
        side: Position side ("bid" long or "ask" short)
        keypair: User's Solana keypair
        take_profit_price: TP trigger price (None to skip)
        stop_loss_price: SL trigger price (None to skip)
        take_profit_limit / stop_loss_limit: Optional limit prices
        dry_run: If True, validate and report without sending

    Returns:
        {"success": bool, "message": str, "dry_run": bool}
    """
    operation_data = {"symbol": symbol, "side": side}
    if take_profit_price is not None:
        operation_data["take_profit"] = _tpsl_leg(take_profit_price, take_profit_limit)
    if stop_loss_price is not None:
        operation_data["stop_loss"] = _tpsl_leg(stop_loss_price, stop_loss_limit)

    if "take_profit" not in operation_data and "stop_loss" not in operation_data:
        return {"success": False, "message": "Provide take_profit_price and/or stop_loss_price", "dry_run": dry_run}

    if dry_run:
        legs = [k for k in ("take_profit", "stop_loss") if k in operation_data]
        return {"success": True, "message": f"[DRY RUN] Would set {', '.join(legs)} on {symbol}", "dry_run": True}

    ok, result = _signed_post("positions/tpsl", "set_position_tpsl", operation_data, keypair)
    if ok:
        return {"success": True, "message": f"TP/SL set on {symbol}", "dry_run": False}
    return {"success": False, "message": f"TPSL failed: {result.get('error')}", "dry_run": False}


def create_stop_order(
    symbol: str,
    side: str,
    keypair: Keypair,
    stop_price: float,
    limit_price: Optional[float] = None,
    amount: Optional[float] = None,
    reduce_only: bool = True,
    trigger_price_type: str = "mark_price",
    dry_run: bool = True,
) -> dict:
    """
    Place a standalone stop order (stop-market if no limit_price, else stop-limit).

    Uses POST /api/v1/orders/stop/create (signing op "create_stop_order").

    Returns:
        {"success": bool, "order_id": str | None, "message": str, "dry_run": bool}
    """
    if stop_price <= 0:
        return {"success": False, "order_id": None, "message": "Invalid stop price", "dry_run": dry_run}

    stop_order = {"stop_price": str(stop_price)}
    if limit_price is not None:
        stop_order["limit_price"] = str(limit_price)
    if trigger_price_type != "mark_price":
        stop_order["trigger_price_type"] = trigger_price_type
    if amount is not None:
        stop_order["amount"] = str(amount)

    operation_data = {
        "symbol": symbol,
        "side": side,
        "reduce_only": reduce_only,
        "stop_order": stop_order,
        "client_order_id": str(uuid.uuid4()),
    }

    if dry_run:
        kind = "STOP-LIMIT" if limit_price else "STOP-MARKET"
        return {
            "success": True,
            "order_id": f"dry-stop-{uuid.uuid4().hex[:8]}",
            "message": f"[DRY RUN] Would place {kind} {side.upper()} {symbol} @ trigger ${stop_price:,.2f}",
            "dry_run": True,
        }

    ok, result = _signed_post("orders/stop/create", "create_stop_order", operation_data, keypair)
    if ok:
        return {
            "success": True,
            "order_id": str(result.get("order_id", operation_data["client_order_id"])),
            "message": f"Stop order placed on {symbol} @ trigger ${stop_price:,.2f}",
            "dry_run": False,
        }
    return {"success": False, "order_id": None, "message": f"Stop order failed: {result.get('error')}", "dry_run": False}


def cancel_order(
    symbol: str,
    keypair: Keypair,
    order_id=None,
    client_order_id: Optional[str] = None,
    dry_run: bool = True,
) -> dict:
    """
    Cancel a single resting order by exchange order_id XOR client_order_id.

    Uses POST /api/v1/orders/cancel (signing op "cancel_order").
    """
    if (order_id is None) == (client_order_id is None):
        return {"success": False, "message": "Provide exactly one of order_id or client_order_id", "dry_run": dry_run}

    operation_data = {"symbol": symbol}
    if order_id is not None:
        try:
            operation_data["order_id"] = int(order_id)
        except (TypeError, ValueError):
            return {"success": False, "message": f"Invalid order_id {order_id!r}", "dry_run": dry_run}
    else:
        operation_data["client_order_id"] = client_order_id

    if dry_run:
        return {"success": True, "message": f"[DRY RUN] Would cancel order on {symbol}", "dry_run": True}

    ok, result = _signed_post("orders/cancel", "cancel_order", operation_data, keypair)
    if ok:
        return {"success": True, "message": f"Order cancelled on {symbol}", "dry_run": False}
    return {"success": False, "message": f"Cancel failed: {result.get('error')}", "dry_run": False}


def cancel_all_orders(
    keypair: Keypair,
    symbol: Optional[str] = None,
    exclude_reduce_only: bool = False,
    dry_run: bool = True,
) -> dict:
    """
    Cancel resting orders — all symbols, or one symbol when given.

    Uses POST /api/v1/orders/cancel_all (signing op "cancel_all_orders").
    Returns the exchange-reported cancelled_count.
    """
    operation_data: dict = {"all_symbols": symbol is None, "exclude_reduce_only": exclude_reduce_only}
    if symbol is not None:
        operation_data["symbol"] = symbol

    if dry_run:
        scope = "all symbols" if symbol is None else symbol
        return {"success": True, "cancelled_count": 0, "message": f"[DRY RUN] Would cancel orders for {scope}", "dry_run": True}

    ok, result = _signed_post("orders/cancel_all", "cancel_all_orders", operation_data, keypair)
    if ok:
        count = result.get("cancelled_count", result.get("data", {}).get("cancelled_count", 0)) if isinstance(result, dict) else 0
        return {"success": True, "cancelled_count": count, "message": f"Cancelled {count} order(s)", "dry_run": False}
    return {"success": False, "cancelled_count": 0, "message": f"Cancel-all failed: {result.get('error')}", "dry_run": False}


def cancel_stop_order(
    symbol: str,
    keypair: Keypair,
    order_id=None,
    client_order_id: Optional[str] = None,
    dry_run: bool = True,
) -> dict:
    """
    Cancel a single stop order by exchange order_id XOR client_order_id.

    Uses POST /api/v1/orders/stop/cancel (signing op "cancel_stop_order").
    """
    if (order_id is None) == (client_order_id is None):
        return {"success": False, "message": "Provide exactly one of order_id or client_order_id", "dry_run": dry_run}

    operation_data = {"symbol": symbol}
    if order_id is not None:
        try:
            operation_data["order_id"] = int(order_id)
        except (TypeError, ValueError):
            return {"success": False, "message": f"Invalid order_id {order_id!r}", "dry_run": dry_run}
    else:
        operation_data["client_order_id"] = client_order_id

    if dry_run:
        return {"success": True, "message": f"[DRY RUN] Would cancel stop order on {symbol}", "dry_run": True}

    ok, result = _signed_post("orders/stop/cancel", "cancel_stop_order", operation_data, keypair)
    if ok:
        return {"success": True, "message": f"Stop order cancelled on {symbol}", "dry_run": False}
    return {"success": False, "message": f"Stop-cancel failed: {result.get('error')}", "dry_run": False}


def edit_order(
    symbol: str,
    keypair: Keypair,
    price: float,
    amount: float,
    order_id=None,
    client_order_id: Optional[str] = None,
    dry_run: bool = True,
) -> dict:
    """
    Edit a resting limit order's price and/or size.

    Uses POST /api/v1/orders/edit (signing op "edit_order"). Per docs the edit
    cancels the original and creates a replacement (new order_id, TIF = ALO).

    Returns:
        {"success": bool, "order_id": str | None (new id), "message": str, "dry_run": bool}
    """
    if (order_id is None) == (client_order_id is None):
        return {"success": False, "order_id": None, "message": "Provide exactly one of order_id or client_order_id", "dry_run": dry_run}
    if price <= 0 or amount <= 0:
        return {"success": False, "order_id": None, "message": "Price and amount must be positive", "dry_run": dry_run}

    operation_data = {"symbol": symbol, "price": str(price), "amount": str(amount)}
    if order_id is not None:
        try:
            operation_data["order_id"] = int(order_id)
        except (TypeError, ValueError):
            return {"success": False, "order_id": None, "message": f"Invalid order_id {order_id!r}", "dry_run": dry_run}
    else:
        operation_data["client_order_id"] = client_order_id

    if dry_run:
        return {"success": True, "order_id": None, "message": f"[DRY RUN] Would edit order on {symbol} to ${price:,.2f} x {amount}", "dry_run": True}

    ok, result = _signed_post("orders/edit", "edit_order", operation_data, keypair)
    if ok:
        return {
            "success": True,
            "order_id": str(result.get("order_id", "")) or None,
            "message": f"Order edited on {symbol} (replacement id {result.get('order_id')})",
            "dry_run": False,
        }
    return {"success": False, "order_id": None, "message": f"Edit failed: {result.get('error')}", "dry_run": False}


def update_leverage(symbol: str, leverage: int, keypair: Keypair, dry_run: bool = True) -> dict:
    """
    Set per-symbol leverage.

    Uses POST /api/v1/account/leverage (signing op "update_leverage").
    Leverage is validated against the market's max_leverage from GET /info.
    """
    try:
        leverage = int(leverage)
    except (TypeError, ValueError):
        return {"success": False, "leverage": None, "message": f"Invalid leverage {leverage!r}", "dry_run": dry_run}
    if leverage <= 0:
        return {"success": False, "leverage": None, "message": "Leverage must be positive", "dry_run": dry_run}

    market_info = _get_market_info(symbol) or {}
    max_lev = market_info.get("max_leverage")
    if max_lev and leverage > int(max_lev):
        return {
            "success": False,
            "leverage": None,
            "message": f"Leverage {leverage}x exceeds max {max_lev}x for {symbol}",
            "dry_run": dry_run,
        }

    if dry_run:
        return {"success": True, "leverage": leverage, "message": f"[DRY RUN] Would set leverage {leverage}x on {symbol}", "dry_run": True}

    ok, result = _signed_post("account/leverage", "update_leverage", {"symbol": symbol, "leverage": leverage}, keypair)
    if ok:
        return {"success": True, "leverage": leverage, "message": f"Leverage set to {leverage}x on {symbol}", "dry_run": False}
    return {"success": False, "leverage": None, "message": f"Leverage update failed: {result.get('error')}", "dry_run": False}


def update_margin_mode(symbol: str, isolated: bool, keypair: Keypair, dry_run: bool = True) -> dict:
    """
    Switch a symbol between cross (isolated=False) and isolated (True) margin.

    Uses POST /api/v1/account/margin (signing op "update_margin_mode").
    """
    if dry_run:
        mode = "isolated" if isolated else "cross"
        return {"success": True, "mode": mode, "message": f"[DRY RUN] Would set {mode} margin on {symbol}", "dry_run": True}

    ok, result = _signed_post(
        "account/margin", "update_margin_mode",
        {"symbol": symbol, "is_isolated": bool(isolated)}, keypair,
    )
    if ok:
        mode = "isolated" if isolated else "cross"
        return {"success": True, "mode": mode, "message": f"Margin mode set to {mode} on {symbol}", "dry_run": False}
    return {"success": False, "mode": None, "message": f"Margin mode update failed: {result.get('error')}", "dry_run": False}


def get_open_orders(wallet_address: str) -> list:
    """
    Fetch all resting (open) orders for a wallet.

    Uses GET /api/v1/orders?account=... (no signing required for GET).
    """
    try:
        r = _session.get(
            f"{get_base_url()}/orders",
            params={"account": wallet_address},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json().get("data", [])
        return data if isinstance(data, list) else []
    except Exception as e:
        import sys
        print(f"[get_open_orders] Error fetching open orders: {e}", file=sys.stderr)
        return []


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
            f"{get_base_url()}/positions",
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
        r = _session.get(f"{get_base_url()}/account", params={"account": wallet_address}, timeout=10)
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
        r = _session.get(f"{get_base_url()}/info", timeout=10)
        r.raise_for_status()
        data = r.json().get("data", [])

        for market in data:
            if market.get("symbol") == symbol:
                info = {
                    "lot_size": float(market.get("lot_size", 0.0001)),
                    "tick_size": float(market.get("tick_size", 0.01)),
                    "min_order_size": float(market.get("min_order_size", 10)),
                }
                try:
                    if market.get("max_leverage") is not None:
                        info["max_leverage"] = int(market.get("max_leverage"))
                except (TypeError, ValueError):
                    pass
                return info

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
