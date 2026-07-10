"""
Base provider interface — all AI providers implement this.

Each provider takes market data + sentiment → calls their API → returns structured decision.
"""

from abc import ABC, abstractmethod
from typing import Optional


class AIProvider(ABC):
    """Base interface for AI providers."""

    def __init__(self, api_key: str, model: str):
        """
        Initialize the provider.

        Args:
            api_key: API key for the provider
            model: Model identifier (provider-specific format)
        """
        self.api_key = api_key
        self.model = model

    @abstractmethod
    def generate_decision(
        self,
        symbol: str,
        market_data: dict,
        sentiment_data: dict,
        account_context: Optional[dict] = None,
        max_position_usdc: float = 100.0,
    ) -> dict:
        """
        Generate a trading decision using the AI model.

        Args:
            symbol: Market symbol (e.g., "BTC", "ETH")
            market_data: Market snapshot from get_market_snapshot()
            sentiment_data: Sentiment data from Elfa AI
            account_context: Account balance and equity info (optional)
            max_position_usdc: Maximum position size for context

        Returns:
            {
                "action": "LONG" | "SHORT" | "HOLD",
                "confidence": float (0.0-1.0),
                "reasoning": str,
                "size_pct": float (0.0-1.0, fraction of max_position_usdc),
            }
        """
        pass

    @abstractmethod
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """
        Estimate cost in USD for a request.

        Args:
            prompt_tokens: Estimated input tokens
            completion_tokens: Estimated output tokens

        Returns:
            Cost in USD
        """
        pass

    def _build_prompt(
        self,
        symbol: str,
        market_data: dict,
        sentiment_data: dict,
        account_context: Optional[dict],
        max_position_usdc: float,
    ) -> str:
        """
        Build the trading decision prompt.

        This is the core prompt template used across all providers.
        """
        # Determine market regime (trending/ranging/volatile)
        regime = _detect_market_regime(market_data)

        prompt = f"""You are an AI trading agent for Pacifica Perpetual Futures. Analyze the data below and decide: LONG, SHORT, or HOLD.

## Market Regime: {regime['regime']}
{regime['description']}

## Technical Analysis — {symbol}
- Mark Price: ${market_data.get('mark_price', 0):,.2f}
- Funding Rate: {market_data.get('funding_rate', 0):.6f}

**Momentum Indicators:**
- RSI 5m: {market_data.get('rsi_5m', 'N/A')} ({market_data.get('rsi_5m_signal', 'neutral')})
- RSI 1h: {market_data.get('rsi_1h', 'N/A')} ({market_data.get('rsi_1h_signal', 'neutral')})
"""

        # Add MACD if available
        if market_data.get('macd'):
            macd = market_data['macd']
            prompt += f"- MACD: {macd['macd']:.2f} | Signal: {macd['signal']:.2f} | Trend: {macd['trend']}\n"

        # Add Bollinger Bands if available
        prompt += "\n**Volatility Indicators:**\n"
        if market_data.get('bb_1h'):
            bb = market_data['bb_1h']
            prompt += f"- Bollinger Bands: Price is {bb['position']} | Bandwidth: {bb['bandwidth']:.2f}%\n"
            prompt += f"  (Upper: ${bb['upper']:,.2f}, Middle: ${bb['middle']:,.2f}, Lower: ${bb['lower']:,.2f})\n"

        # Add Volume if available
        if market_data.get('volume_24h'):
            prompt += f"\n**Volume:**\n"
            prompt += f"- 24h Volume: {market_data['volume_signal']} ({market_data['volume_24h']:,.0f})\n"

        if market_data.get('basis_pct') is not None:
            prompt += f"\n**Basis Spread:** {market_data['basis_pct']:+.2f}% ({market_data.get('basis_signal', 'normal')})\n"

        prompt += f"\n## Social Sentiment (Elfa AI)\n"
        prompt += f"- Sentiment Score: {sentiment_data.get('sentiment_score', 0):.2f}\n"
        prompt += f"- Mention Count: {sentiment_data.get('mention_count', 0)}\n"
        prompt += f"- Trending Score: {sentiment_data.get('trending_score', 0):.0f}\n"

        if sentiment_data.get('summary'):
            prompt += f"- Summary: {sentiment_data['summary']}\n"

        if account_context:
            prompt += f"\n## Account Context\n"
            # Support both camelCase (legacy) and snake_case (current Pacifica API)
            balance = account_context.get('balance', account_context.get('usdcBalance', 0))
            equity = account_context.get('account_equity', account_context.get('accountEquity', 0))
            available = account_context.get('available_to_spend', account_context.get('availableToSpend', 0))
            margin = account_context.get('total_margin_used', account_context.get('usedMargin', 0))
            prompt += f"- USDC Balance: ${float(balance):.2f}\n"
            prompt += f"- Account Equity: ${float(equity):.2f}\n"
            prompt += f"- Available to Spend: ${float(available):.2f}\n"
            prompt += f"- Used Margin: ${float(margin):.2f}\n"

            if market_data.get('open_position'):
                prompt += f"- Current Position: {market_data['open_position']}\n"
                prompt += f"- Unrealized PnL: {market_data.get('unrealized_pnl', 'N/A')}\n"

        prompt += f"\n## Config\n"
        prompt += f"- Max Position Size: ${max_position_usdc:.2f}\n"

        prompt += f"""
## Trading Examples (Learn from these)

**Example 1 - Strong Uptrend (LONG):**
- RSI: 45 (neutral, not overbought)
- MACD: strong_bullish (MACD above signal, both positive)
- Bollinger: middle (room to move up)
- Volume: high (strong participation)
- Sentiment: 0.75 (bullish)
→ Action: LONG, confidence 0.85, size 0.7

**Example 2 - Overbought in Uptrend (HOLD):**
- RSI: 78 (overbought)
- MACD: bullish (but histogram decreasing)
- Bollinger: above_upper (overextended)
- Volume: normal
- Sentiment: 0.55
→ Action: HOLD (wait for pullback), confidence 0.65

**Example 3 - Range-Bound Low Volume (HOLD):**
- RSI: 52 (neutral)
- MACD: neutral
- Bollinger: middle, bandwidth 1.5% (low volatility)
- Volume: low
- Sentiment: 0.50
→ Action: HOLD (no edge in ranging market), confidence 0.60

## Your Task
Decide whether to LONG, SHORT, or HOLD {symbol}.

Return your decision in this exact JSON format:
{{
  "action": "LONG" | "SHORT" | "HOLD",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<concise explanation citing specific indicators>",
  "size_pct": <float 0.0-1.0, fraction of max position to use>
}}

## Decision Guidelines

**Market Regime Adaptation:**
- {regime['trading_guidance']}

**Indicator Synthesis:**
- MACD shows trend direction (bullish/bearish/neutral)
- RSI shows momentum (oversold <30, overbought >70)
- Bollinger Bands show volatility and price extremes
- Volume confirms moves (high volume = sustainable, low volume = weak)
- Sentiment adds narrative context

**Entry Signals:**
- LONG: RSI oversold/neutral + MACD bullish + high volume + positive sentiment + trending regime
- SHORT: RSI overbought/neutral + MACD bearish + high volume + negative sentiment + trending regime
- HOLD: Mixed signals, ranging regime, low volume, or already extended

**Position Sizing:**
- Higher confidence (0.8+) → larger size (0.6-0.8)
- Medium confidence (0.6-0.8) → medium size (0.4-0.6)
- Lower confidence (<0.6) → smaller size or HOLD

**Risk Management:**
- Don't chase: if price is already at Bollinger upper/lower bands, wait
- Volume matters: low volume moves are less reliable
- Existing position: only exit if signals have clearly reversed
- Wide basis spreads (>2%) may indicate elevated risk

**Confidence Calibration:**
- 0.9-1.0: All indicators aligned, clear edge
- 0.7-0.9: Most indicators aligned, good setup
- 0.6-0.7: Some indicators aligned, modest edge
- <0.6: Mixed signals, prefer HOLD
"""

        return prompt


def _detect_market_regime(market_data: dict) -> dict:
    """
    Detect market regime: trending, ranging, or volatile.

    How it works:
    - Trending: Strong MACD + price moving directionally
    - Ranging: Narrow Bollinger Bands + neutral MACD
    - Volatile: Wide Bollinger Bands + price whipsawing
    """
    macd = market_data.get('macd', {})
    bb = market_data.get('bb_1h', {})

    macd_trend = macd.get('trend', 'neutral')
    bb_bandwidth = bb.get('bandwidth', 3.0)
    bb_position = bb.get('position', 'middle')

    # Determine regime
    if macd_trend in ('strong_bullish', 'strong_bearish'):
        if bb_bandwidth > 4.0:
            regime = "Volatile Trending"
            description = "Strong trend with high volatility - expect larger moves but also larger reversals"
            guidance = "Use wider stops, scale into positions, take profits on extensions"
        else:
            regime = "Clean Trending"
            description = "Clear directional trend with normal volatility - best trading environment"
            guidance = "Follow the trend, use trailing stops, let winners run"
    elif macd_trend in ('bullish', 'bearish'):
        regime = "Weak Trending"
        description = "Mild trend forming - could strengthen or reverse"
        guidance = "Smaller positions, tighter stops, monitor for trend confirmation"
    elif bb_bandwidth < 2.0:
        regime = "Tight Range"
        description = "Low volatility compression - breakout likely coming soon"
        guidance = "Wait for breakout confirmation, avoid trades inside the range"
    elif bb_bandwidth > 5.0 and bb_position in ('above_upper', 'below_lower'):
        regime = "High Volatility Whipsaw"
        description = "Extreme volatility with price outside bands - choppy and dangerous"
        guidance = "Reduce size significantly or stay flat, wait for stabilization"
    else:
        regime = "Ranging"
        description = "No clear trend - price oscillating in a range"
        guidance = "Mean reversion: buy near lower band, sell near upper band, or wait for breakout"

    return {
        "regime": regime,
        "description": description,
        "trading_guidance": guidance,
    }


def parse_decision_response(response_text: str) -> dict:
    """
    Parse AI response into structured decision format.

    Handles both JSON-only responses and responses with markdown code blocks.

    Returns:
        Decision dict with action, confidence, reasoning, size_pct
    """
    import json
    import re

    # Try to extract JSON from markdown code blocks
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
    if json_match:
        response_text = json_match.group(1)

    # Try direct JSON parse
    try:
        decision = json.loads(response_text.strip())
    except json.JSONDecodeError:
        # Fallback: extract action, confidence, reasoning manually
        action_match = re.search(r'"action":\s*"(LONG|SHORT|HOLD)"', response_text, re.IGNORECASE)
        conf_match = re.search(r'"confidence":\s*([\d.]+)', response_text)
        reasoning_match = re.search(r'"reasoning":\s*"([^"]+)"', response_text)
        size_match = re.search(r'"size_pct":\s*([\d.]+)', response_text)

        decision = {
            "action": action_match.group(1).upper() if action_match else "HOLD",
            "confidence": float(conf_match.group(1)) if conf_match else 0.5,
            "reasoning": reasoning_match.group(1) if reasoning_match else "Failed to parse reasoning",
            "size_pct": float(size_match.group(1)) if size_match else 0.5,
        }

    # Validate and normalize
    if decision.get("action") not in ("LONG", "SHORT", "HOLD"):
        decision["action"] = "HOLD"

    decision["confidence"] = max(0.0, min(1.0, float(decision.get("confidence", 0.5))))
    decision["size_pct"] = max(0.0, min(1.0, float(decision.get("size_pct", 0.5))))

    if not decision.get("reasoning"):
        decision["reasoning"] = "No reasoning provided"

    return decision
