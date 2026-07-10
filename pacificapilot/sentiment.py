"""
Elfa AI sentiment integration — fetch social intelligence for trading decisions.

Elfa provides token social metrics: mentions, sentiment, mindshare, and trending signals.
Requires Elfa API key. Get one at https://dev.elfa.ai

Uses /v2/data/top-mentions endpoint to fetch recent mentions and derive sentiment indicators.
"""

from typing import Optional
import requests

# Elfa API v2 endpoint (requires API key)
ELFA_BASE_URL = "https://api.elfa.ai/v2"

_session = requests.Session()
_session.headers.update({
    "Accept": "application/json",
    "User-Agent": "PacificaPilot/0.1.0"
})


def get_token_sentiment(symbol: str, api_key: Optional[str] = None) -> dict:
    """
    Fetch social sentiment metrics for a token from Elfa AI.

    Args:
        symbol: Trading symbol (BTC, ETH, SOL, etc.)
        api_key: Elfa API key (optional, will try to load from env)

    Returns:
        {
            "sentiment_score": float (0.0-1.0),
            "mention_count": int,
            "trending_score": float,
            "summary": str,
        }
    """
    # Load API key from param or environment
    if not api_key:
        from .storage import load_secrets
        secrets = load_secrets()
        api_key = secrets.get("ELFA_API_KEY")

    if not api_key:
        print("[Sentiment] No ELFA_API_KEY found - returning neutral sentiment")
        return {
            "sentiment_score": 0.5,
            "mention_count": 0,
            "trending_score": 0,
            "summary": "Elfa API key not configured",
        }

    try:
        # Fetch top mentions from Elfa v2 API
        # Use ticker with $ prefix for exact cashtag matching
        headers = {
            **_session.headers,
            "x-elfa-api-key": api_key,
        }

        params = {
            "ticker": f"${symbol}",
            "timeWindow": "1h",
            "pageSize": 50,
        }

        r = requests.get(
            f"{ELFA_BASE_URL}/data/top-mentions",
            headers=headers,
            params=params,
            timeout=10,
        )
        r.raise_for_status()
        response = r.json()

        if not response.get("success"):
            raise Exception(f"API returned success=false")

        mentions = response.get("data", [])
        metadata = response.get("metadata", {})
        mention_count = metadata.get("total", len(mentions))

        # Derive sentiment score from engagement metrics
        if not mentions:
            sentiment_score = 0.5
            trending_score = 0
            summary = f"No recent mentions for {symbol}"
        else:
            # Calculate average engagement per mention
            total_engagement = 0
            smart_reposts = 0

            for mention in mentions:
                # Weight different engagement types
                engagement = (
                    mention.get("viewCount", 0) * 0.1 +  # Views worth less
                    mention.get("likeCount", 0) * 1.0 +
                    mention.get("repostCount", 0) * 2.0 +  # Reposts worth more
                    mention.get("quoteCount", 0) * 1.5
                )
                total_engagement += engagement

                # Track smart account engagement
                repost_breakdown = mention.get("repostBreakdown", {})
                smart_reposts += repost_breakdown.get("smart", 0)

            avg_engagement = total_engagement / len(mentions) if mentions else 0

            # Normalize to 0-1 scale (using log scale for engagement)
            # High engagement = bullish sentiment
            import math
            sentiment_score = min(1.0, 0.5 + (math.log10(avg_engagement + 1) / 10))

            # Trending score based on mention count and smart account engagement
            trending_score = (mention_count * 0.7) + (smart_reposts * 3.0)

            summary = f"{mention_count} mentions in 1h, avg engagement {int(avg_engagement)}"

        return {
            "sentiment_score": round(sentiment_score, 2),
            "mention_count": mention_count,
            "trending_score": round(trending_score, 1),
            "summary": summary,
        }

    except Exception as e:
        # Return neutral sentiment on error
        print(f"[Sentiment] Elfa API failed for {symbol}: {e}")
        return {
            "sentiment_score": 0.5,
            "mention_count": 0,
            "trending_score": 0,
            "summary": f"Sentiment unavailable (Elfa API: {type(e).__name__})",
        }
