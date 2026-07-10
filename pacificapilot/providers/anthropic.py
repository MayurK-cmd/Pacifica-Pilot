"""
Anthropic provider — direct integration with Claude via Anthropic API.

Uses anthropic Python SDK.
"""

from typing import Optional, List
import anthropic

from .base import AIProvider, parse_decision_response


class AnthropicProvider(AIProvider):
    """Anthropic Claude provider."""

    # Pricing per 1M tokens (as of 2026-07)
    PRICING = {
        "claude-opus-4-8": {"input": 15.0, "output": 75.0},
        "claude-sonnet-4-5": {"input": 3.0, "output": 15.0},
        "claude-3-5-sonnet-20241022": {"input": 3.0, "output": 15.0},
        "claude-3-5-haiku-20241022": {"input": 1.0, "output": 5.0},
    }

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        super().__init__(api_key, model)
        self.client = anthropic.Anthropic(api_key=api_key)

    def chat_with_tools(
        self,
        messages: List[dict],
        tools: Optional[List[dict]] = None,
        system: Optional[str] = None,
    ) -> dict:
        """
        Chat with Claude using tool calling.

        Accepts our internal message format where tool results have
        role="tool". Converts them to Anthropic's tool_result blocks
        before sending.

        Args:
            messages: List of message dicts with role and content
            tools: Optional list of tool definitions
            system: Optional system prompt

        Returns:
            {
                "content": List of content blocks (text and tool_use),
                "stop_reason": "end_turn" | "tool_use",
                "usage": {input_tokens, output_tokens},
            }
        """
        try:
            # Convert tool results to Anthropic format
            converted = self._convert_messages(messages)
            kwargs = {
                "model": self.model,
                "max_tokens": 2048,
                "messages": converted,
            }

            if system:
                kwargs["system"] = system

            if tools:
                kwargs["tools"] = tools

            response = self.client.messages.create(**kwargs)

            return {
                "content": response.content,
                "stop_reason": response.stop_reason,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
            }

        except Exception as e:
            return {
                "content": [{"type": "text", "text": f"API error: {str(e)}"}],
                "stop_reason": "error",
                "usage": {"input_tokens": 0, "output_tokens": 0},
                "_error": str(e),
            }

    @staticmethod
    def _convert_messages(messages: List[dict]) -> List[dict]:
        """Convert internal message format to Anthropic API format.

        Internal tool results (role="tool") become Anthropic tool_result blocks
        inside a user message.
        """
        converted = []
        for msg in messages:
            role = msg.get("role")
            if role == "tool":
                # Anthropic wraps tool results in a user message with tool_result content
                converted.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": msg.get("tool_call_id", ""),
                        "content": msg.get("content", ""),
                    }],
                })
            elif role == "assistant" and isinstance(msg.get("content"), list):
                # Already in Anthropic format (list of content blocks)
                converted.append(msg)
            else:
                # Plain text user/assistant message
                content = msg.get("content", "")
                if isinstance(content, list):
                    converted.append(msg)
                else:
                    converted.append({"role": role, "content": content})
        return converted

    def generate_decision(
        self,
        symbol: str,
        market_data: dict,
        sentiment_data: dict,
        account_context: Optional[dict] = None,
        max_position_usdc: float = 100.0,
    ) -> dict:
        """Generate trading decision using Claude."""
        prompt = self._build_prompt(
            symbol, market_data, sentiment_data, account_context, max_position_usdc
        )

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = response.content[0].text
            decision = parse_decision_response(response_text)

            # Track token usage for cost estimation
            decision["_tokens"] = {
                "input": response.usage.input_tokens,
                "output": response.usage.output_tokens,
                "cost_usd": self.estimate_cost(
                    response.usage.input_tokens, response.usage.output_tokens
                ),
            }

            return decision

        except Exception as e:
            return {
                "action": "HOLD",
                "confidence": 0.0,
                "reasoning": f"API error: {str(e)}",
                "size_pct": 0.0,
                "_error": str(e),
            }

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """Estimate cost in USD."""
        pricing = self.PRICING.get(self.model, {"input": 3.0, "output": 15.0})
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost
