"""
OpenAI provider — direct integration with GPT models via OpenAI API.

Uses openai Python SDK.
"""

import json
from typing import Optional, List
import openai

from .base import AIProvider, parse_decision_response


class OpenAIProvider(AIProvider):
    """OpenAI GPT provider."""

    # Pricing per 1M tokens (as of 2026-07)
    PRICING = {
        "gpt-4o": {"input": 2.5, "output": 10.0},
        "gpt-4o-mini": {"input": 0.15, "output": 0.6},
        "gpt-4-turbo": {"input": 10.0, "output": 30.0},
        "gpt-3.5-turbo": {"input": 0.5, "output": 1.5},
    }

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        super().__init__(api_key, model)
        self.client = openai.OpenAI(api_key=api_key)

    def chat_with_tools(
        self,
        messages: List[dict],
        tools: Optional[List[dict]] = None,
        system: Optional[str] = None,
    ) -> dict:
        """
        Chat with OpenAI using function calling.

        Accepts our internal message format. Converts tool results (role="tool")
        to OpenAI's native role="tool" format with tool_call_id, and assistant
        tool_use blocks to function_call format.

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
        try:
            # Convert messages to OpenAI format
            openai_messages = []
            if system:
                openai_messages.append({"role": "system", "content": system})

            for msg in messages:
                role = msg.get("role")
                if role == "tool":
                    # OpenAI native tool result format
                    openai_messages.append({
                        "role": "tool",
                        "tool_call_id": msg.get("tool_call_id", ""),
                        "content": msg.get("content", ""),
                    })
                elif role == "assistant" and isinstance(msg.get("content"), list):
                    # Convert Anthropic tool_use blocks to OpenAI function_calls
                    parts = msg["content"]
                    text_parts = [b.get("text", "") for b in parts if b.get("type") == "text"]
                    tool_parts = [b for b in parts if b.get("type") == "tool_use"]

                    assistant_msg = {"role": "assistant"}
                    if text_parts:
                        assistant_msg["content"] = "\n".join(text_parts)
                    else:
                        assistant_msg["content"] = None

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
                    openai_messages.append(assistant_msg)
                else:
                    # Plain text message
                    content = msg.get("content", "")
                    if isinstance(content, list):
                        # Flatten list-content to text
                        texts = [b.get("text", str(b)) for b in content if isinstance(b, dict)]
                        content = "\n".join(texts)
                    openai_messages.append({"role": role, "content": content})

            kwargs = {
                "model": self.model,
                "messages": openai_messages,
                "max_tokens": 2048,
            }

            # Convert tools from Anthropic format to OpenAI format
            if tools:
                openai_tools = []
                for tool in tools:
                    openai_tools.append({
                        "type": "function",
                        "function": {
                            "name": tool["name"],
                            "description": tool["description"],
                            "parameters": tool["input_schema"],
                        }
                    })
                kwargs["tools"] = openai_tools

            response = self.client.chat.completions.create(**kwargs)
            message = response.choices[0].message

            # Convert response back to Anthropic format (for our internal loop)
            content = []

            if message.content:
                content.append({"type": "text", "text": message.content})

            if message.tool_calls:
                for tool_call in message.tool_calls:
                    content.append({
                        "type": "tool_use",
                        "id": tool_call.id,
                        "name": tool_call.function.name,
                        "input": json.loads(tool_call.function.arguments),
                    })

            stop_reason = "tool_calls" if message.tool_calls else "stop"

            return {
                "content": content,
                "stop_reason": stop_reason,
                "usage": {
                    "input_tokens": response.usage.prompt_tokens,
                    "output_tokens": response.usage.completion_tokens,
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
        """Generate trading decision using GPT."""
        prompt = self._build_prompt(
            symbol, market_data, sentiment_data, account_context, max_position_usdc
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=1024,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )

            response_text = response.choices[0].message.content
            decision = parse_decision_response(response_text)

            # Track token usage for cost estimation
            decision["_tokens"] = {
                "input": response.usage.prompt_tokens,
                "output": response.usage.completion_tokens,
                "cost_usd": self.estimate_cost(
                    response.usage.prompt_tokens, response.usage.completion_tokens
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
        pricing = self.PRICING.get(self.model, {"input": 2.5, "output": 10.0})
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost
