"""
OpenRouter provider — unified API for multiple models.

Recommended as the default BYOK option since it provides access to
Anthropic, OpenAI, Google, and many other models through one API.
"""

from typing import Optional, List
import requests

from .base import AIProvider, parse_decision_response


class OpenRouterProvider(AIProvider):
    """OpenRouter catch-all provider."""

    BASE_URL = "https://openrouter.ai/api/v1"

    # Common model pricing (per 1M tokens) — OpenRouter passes through provider pricing
    PRICING = {
        "anthropic/claude-3.5-sonnet": {"input": 3.0, "output": 15.0},
        "anthropic/claude-3.5-haiku": {"input": 1.0, "output": 5.0},
        "openai/gpt-4o": {"input": 2.5, "output": 10.0},
        "openai/gpt-4o-mini": {"input": 0.15, "output": 0.6},
        "google/gemini-2.0-flash-exp": {"input": 0.0, "output": 0.0},
        "google/gemini-1.5-pro": {"input": 1.25, "output": 5.0},
    }

    def __init__(self, api_key: str, model: str = "anthropic/claude-3.5-sonnet"):
        super().__init__(api_key, model)

    def chat_with_tools(
        self,
        messages: List[dict],
        tools: Optional[List[dict]] = None,
        system: Optional[str] = None,
    ) -> dict:
        """
        Chat with OpenRouter using function calling (OpenAI-compatible).

        Accepts our internal message format. Converts tool results and
        assistant tool_use blocks to OpenAI-compatible format for OpenRouter.

        Args:
            messages: List of message dicts with role and content
            tools: Optional list of tool definitions (Anthropic format)
            system: Optional system prompt

        Returns:
            {
                "content": List of content blocks (text and tool_use),
                "stop_reason": "stop" | "tool_calls",
                "usage": {input_tokens, output_tokens},
            }
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://pacificapilot.io",
            "X-Title": "PacificaPilot",
        }

        # Convert messages to OpenAI-compatible format (same as OpenAI provider)
        openrouter_messages = []
        if system:
            openrouter_messages.append({"role": "system", "content": system})

        for msg in messages:
            role = msg.get("role")
            if role == "tool":
                openrouter_messages.append({
                    "role": "tool",
                    "tool_call_id": msg.get("tool_call_id", ""),
                    "content": msg.get("content", ""),
                })
            elif role == "assistant" and isinstance(msg.get("content"), list):
                parts = msg["content"]
                text_parts = [b.get("text", "") for b in parts if b.get("type") == "text"]
                tool_parts = [b for b in parts if b.get("type") == "tool_use"]
                assistant_msg = {"role": "assistant"}
                assistant_msg["content"] = "\n".join(text_parts) if text_parts else None
                if tool_parts:
                    assistant_msg["tool_calls"] = [
                        {
                            "id": t.get("id", f"call_{i}"),
                            "type": "function",
                            "function": {
                                "name": t["name"],
                                "arguments": json.dumps(t["input"]),
                            },
                        }
                        for i, t in enumerate(tool_parts)
                    ]
                openrouter_messages.append(assistant_msg)
            else:
                content = msg.get("content", "")
                if isinstance(content, list):
                    texts = [b.get("text", str(b)) for b in content if isinstance(b, dict)]
                    content = "\n".join(texts)
                openrouter_messages.append({"role": role, "content": content})

        payload = {
            "model": self.model,
            "messages": openrouter_messages,
            "max_tokens": 2048,
        }

        # Convert tools from Anthropic format to OpenAI format
        if tools:
            openrouter_tools = []
            for tool in tools:
                openrouter_tools.append({
                    "type": "function",
                    "function": {
                        "name": tool["name"],
                        "description": tool["description"],
                        "parameters": tool["input_schema"],
                    }
                })
            payload["tools"] = openrouter_tools

        try:
            response = requests.post(
                f"{self.BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

            message = data["choices"][0]["message"]

            # Convert response to Anthropic format (for our internal loop)
            content = []

            if message.get("content"):
                content.append({"type": "text", "text": message["content"]})

            if message.get("tool_calls"):
                import json
                for tool_call in message["tool_calls"]:
                    content.append({
                        "type": "tool_use",
                        "id": tool_call["id"],
                        "name": tool_call["function"]["name"],
                        "input": json.loads(tool_call["function"]["arguments"]),
                    })

            stop_reason = "tool_calls" if message.get("tool_calls") else "stop"

            usage = data.get("usage", {})

            return {
                "content": content,
                "stop_reason": stop_reason,
                "usage": {
                    "input_tokens": usage.get("prompt_tokens", 0),
                    "output_tokens": usage.get("completion_tokens", 0),
                },
            }

        except Exception as e:
            return {
                "content": [{"type": "text", "text": f"API error: {str(e)}"}],
                "stop_reason": "error",
                "usage": {"input_tokens": 0, "output_tokens": 0},
                "_error": str(e),
            }

    def generate_decision(
        self,
        symbol: str,
        market_data: dict,
        sentiment_data: dict,
        account_context: Optional[dict] = None,
        max_position_usdc: float = 100.0,
    ) -> dict:
        """Generate trading decision via OpenRouter."""
        prompt = self._build_prompt(
            symbol, market_data, sentiment_data, account_context, max_position_usdc
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://pacificapilot.io",
            "X-Title": "PacificaPilot",
        }

        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1024,
            "temperature": 0.7,
        }

        try:
            response = requests.post(
                f"{self.BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

            response_text = data["choices"][0]["message"]["content"]
            decision = parse_decision_response(response_text)

            # Track token usage
            usage = data.get("usage", {})
            decision["_tokens"] = {
                "input": usage.get("prompt_tokens", 0),
                "output": usage.get("completion_tokens", 0),
                "cost_usd": self.estimate_cost(
                    usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
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
