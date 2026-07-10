"""
On-chain memo logging — write decision hashes to Solana devnet via SPL Memo program.

After each Loop Agent decision (and Chat Agent trade), logs a hash of the decision payload
to the blockchain for verifiable proof-of-decision-time.
"""

import hashlib
import time
from typing import Optional
import requests
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.message import Message
from solders.instruction import Instruction, AccountMeta
from solders.pubkey import Pubkey
from solders.system_program import ID as SYSTEM_PROGRAM_ID

# SPL Memo Program ID (same across all Solana clusters)
MEMO_PROGRAM_ID = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")

# Solana RPC endpoints
RPC_ENDPOINTS = {
    "devnet": "https://api.devnet.solana.com",
    "mainnet": "https://api.mainnet-beta.solana.com",
}


def log_decision_memo(
    symbol: str,
    action: str,
    confidence: float,
    reasoning: str,
    keypair: Keypair,
    cluster: str = "devnet",
) -> Optional[str]:
    """
    Log a decision hash to Solana via SPL Memo program.

    Args:
        symbol: Market symbol
        action: Trading action (LONG/SHORT/HOLD)
        confidence: Confidence score
        reasoning: Full reasoning text
        keypair: Solana keypair for signing
        cluster: "devnet" or "mainnet"

    Returns:
        Transaction signature or None on failure
    """
    # Build decision hash
    timestamp = int(time.time())
    reasoning_hash = hashlib.sha256(reasoning.encode('utf-8')).hexdigest()[:16]

    memo_text = f"PP|{symbol}|{action}|{confidence:.2f}|{timestamp}|{reasoning_hash}"

    # Build memo instruction
    memo_instruction = Instruction(
        program_id=MEMO_PROGRAM_ID,
        accounts=[AccountMeta(pubkey=keypair.pubkey(), is_signer=True, is_writable=False)],
        data=memo_text.encode('utf-8'),
    )

    try:
        # Get recent blockhash
        rpc_url = RPC_ENDPOINTS[cluster]
        blockhash_response = requests.post(
            rpc_url,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getLatestBlockhash",
                "params": [{"commitment": "finalized"}],
            },
            timeout=10,
        )
        blockhash_response.raise_for_status()
        blockhash_data = blockhash_response.json()

        if "error" in blockhash_data:
            print(f"[Memo] Blockhash error: {blockhash_data['error']}")
            return None

        blockhash = blockhash_data["result"]["value"]["blockhash"]

        # Build and sign transaction
        message = Message.new_with_blockhash(
            [memo_instruction],
            keypair.pubkey(),
            blockhash,
        )
        transaction = Transaction.new_unsigned(message)
        transaction.sign([keypair], message.recent_blockhash)

        # Serialize and send
        tx_bytes = bytes(transaction)
        tx_base64 = __import__('base64').b64encode(tx_bytes).decode('utf-8')

        send_response = requests.post(
            rpc_url,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "sendTransaction",
                "params": [
                    tx_base64,
                    {"encoding": "base64", "skipPreflight": False, "preflightCommitment": "finalized"},
                ],
            },
            timeout=10,
        )
        send_response.raise_for_status()
        send_data = send_response.json()

        if "error" in send_data:
            print(f"[Memo] Send error: {send_data['error']}")
            return None

        signature = send_data["result"]
        print(f"[Memo] Logged to {cluster}: {signature}")
        return signature

    except Exception as e:
        print(f"[Memo] Failed to log decision: {e}")
        return None


def generate_decision_hash(
    symbol: str,
    action: str,
    confidence: float,
    reasoning: str,
    timestamp: Optional[int] = None,
) -> str:
    """
    Generate a deterministic hash for a decision.

    Args:
        symbol: Market symbol
        action: Trading action
        confidence: Confidence score
        reasoning: Full reasoning text
        timestamp: Unix timestamp (defaults to current time)

    Returns:
        Hex hash string
    """
    if timestamp is None:
        timestamp = int(time.time())

    payload = f"{symbol}|{action}|{confidence:.4f}|{timestamp}|{reasoning}"
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def verify_decision_memo(signature: str, cluster: str = "devnet") -> Optional[dict]:
    """
    Verify a decision memo by fetching the transaction from Solana.

    Args:
        signature: Transaction signature
        cluster: "devnet" or "mainnet"

    Returns:
        Transaction data or None if not found
    """
    rpc_url = RPC_ENDPOINTS[cluster]

    try:
        response = requests.post(
            rpc_url,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getTransaction",
                "params": [
                    signature,
                    {"encoding": "json", "commitment": "finalized"},
                ],
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()

        if "error" in data or not data.get("result"):
            return None

        return data["result"]

    except Exception:
        return None
