"""
Google Gemini provider — direct integration with Gemini models.

Uses the new google-genai SDK (google.genai.Client).
"""

from typing import Optional, List, Any
import json

from .base import AIProvider, parse_decision_response


class GoogleProvider(AIProvider):
    """Google Gemini provider using the new google-genai SDK."""

    # Pricing per 1M tokens (as of 2026-07)
    PRICING = {
        "gemini-2.0-flash-exp": {"input": 0.0, "output": 0.0},  # Free tier
        "gemini-2.0-flash": {"input": 0.0, "output": 0.0},
        "gemini-1.5-pro": {"input": 1.25, "output": 5.0},
        "gemini-1.5-flash": {"input": 0.075, "output": 0.3},
    }

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash-exp"):
        super().__init__(api_key, model)
        # New google-genai SDK: use Client constructor
        from google import genai
        self._genai = genai
        self.client = genai.Client(api_key=api_key)

    def _convert_tools_to_gemini(self, tools: List[dict]) -> List[Any]:
        """Convert Anthropic tool format to google-genai SDK tool format."""
        from google.genai import types
        gemini_tools = []
        for tool in tools:
            # Build function declaration with proper types.Tool wrapping
            func_decl = types.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters=tool.get("input_schema", {"type": "object", "properties": {}}),
            )
            gemini_tools.append(types.Tool(function_declarations=[func_decl]))
        return gemini_tools

    def chat_with_tools(
        self,
        messages: List[dict],
        tools: Optional[List[dict]] = None,
        system: Optional[str] = None,
    ) -> dict:
        """
        Chat with Gemini using function calling via new google-genai SDK.

        Accepts our internal message format where tool results have role="tool"
        and assistant messages may contain tool_use blocks. Converts to
        Gemini's native content format with function_call and function_response parts.

        Args:
            messages: List of message dicts with role and content
            tools: Optional list of tool definitions (Anthropic format)
            system: Optional system prompt

        Returns:
            {
                "content": List of content blocks (text and tool_use),
                "stop_reason": "stop" | "tool_use",
                "usage": {input_tokens, output_tokens},
            }
        """
        try:
            # Build contents list for Gemini by converting our internal format
            contents = []
            for msg in messages:
                role = msg.get("role")
                parts = []

                if role == "tool":
                    # Tool result → Gemini function_response part
                    import json
                    parts.append({
                        "function_response": {
                            "name": msg.get("name", "unknown"),
                            "response": {
                                "response": msg.get("content", ""),
                            },
                        }
                    })
                    contents.append({"role": "user", "parts": parts})

                elif role == "assistant" and isinstance(msg.get("content"), list):
                    # Assistant message with possibly tool_use blocks
                    has_tool_use = any(b.get("type") == "tool_use" for b in msg["content"])
                    for block in msg["content"]:
                        if block.get("type") == "text":
                            parts.append({"text": block.get("text", "")})
                        elif block.get("type") == "tool_use":
                            # Tool call → Gemini function_call part
                            # Gemini requires a thought_signature on every function_call
                            # in the conversation history. If we don't have one from a
                            # prior response, provide an empty placeholder.
                            fc = {
                                "name": block["name"],
                                "args": block.get("input", {}),
                            }
                            # Preserve thought_signature from the original Gemini response
                            # if it was stored
                            ts = block.get("thought_signature")
                            if ts is not None:
                                fc["thought_signature"] = ts
                            parts.append({"function_call": fc})
                    if parts:
                        contents.append({"role": "model", "parts": parts})

                else:
                    # Plain text message
                    content = msg.get("content", "")
                    if isinstance(content, list):
                        texts = [b.get("text", str(b)) for b in content if isinstance(b, dict)]
                        content = "\n".join(texts)
                    gemini_role = "model" if role == "assistant" else "user"
                    contents.append({
                        "role": gemini_role,
                        "parts": [{"text": content}],
                    })

            # Convert tools to Gemini format
            from google.genai import types
            gemini_tools = None
            if tools:
                gemini_tools = self._convert_tools_to_gemini(tools)

            # Build the GenerateContentConfig properly using the SDK types
            generate_config = types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=2048,
            )
            if system:
                generate_config.system_instruction = system
            if gemini_tools:
                generate_config.tools = gemini_tools

            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=generate_config,
            )

            # Parse response
            content = []
            stop_reason = "stop"
            usage = {"input_tokens": 0, "output_tokens": 0}

            try:
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    usage["input_tokens"] = getattr(response.usage_metadata, "prompt_token_count", 0)
                    usage["output_tokens"] = getattr(response.usage_metadata, "candidates_token_count", 0)
            except Exception:
                pass

            candidates = getattr(response, "candidates", None) or []
            if candidates:
                cand = candidates[0]
                cand_content = getattr(cand, "content", None)
                if cand_content:
                    parts_list = getattr(cand_content, "parts", None) or []
                    for part in parts_list:
                        if hasattr(part, "text") and part.text:
                            content.append({"type": "text", "text": part.text})
                        elif hasattr(part, "function_call") and part.function_call:
                            fc = part.function_call
                            tool_input = {}
                            if hasattr(fc, "args") and fc.args:
                                if isinstance(fc.args, dict):
                                    tool_input = fc.args
                                else:
                                    try:
                                        tool_input = dict(fc.args)
                                    except Exception:
                                        tool_input = {}
                            # Capture thought_signature so we can re-send it
                            # in subsequent turns (Gemini requires it)
                            ts = getattr(fc, "thought_signature", None)
                            tc = {
                                "type": "tool_use",
                                "id": f"gemini_{fc.name}",
                                "name": getattr(fc, "name", "unknown"),
                                "input": tool_input,
                            }
                            if ts is not None:
                                tc["thought_signature"] = ts
                            content.append(tc)
                            stop_reason = "tool_use"

            return {
                "content": content,
                "stop_reason": stop_reason,
                "usage": usage,
            }

        except Exception as e:
            import traceback
            return {
                "content": [{"type": "text", "text": f"API error: {str(e)}"}],
                "stop_reason": "error",
                "usage": {"input_tokens": 0, "output_tokens": 0},
                "_error": str(e),
                "_traceback": traceback.format_exc(),
            }

    def generate_decision(
        self,
        symbol: str,
        market_data: dict,
        sentiment_data: dict,
        account_context: Optional[dict] = None,
        max_position_usdc: float = 100.0,
    ) -> dict:
        """Generate trading decision using Gemini."""
        prompt = self._build_prompt(
            symbol, market_data, sentiment_data, account_context, max_position_usdc
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
                config={
                    "temperature": 0.7,
                    "max_output_tokens": 1024,
                    "response_mime_type": "application/json",
                },
            )

            response_text = response.text or ""
            decision = parse_decision_response(response_text)

            # Track token usage
            try:
                usage = response.usage_metadata
                prompt_tokens = getattr(usage, "prompt_token_count", 0)
                completion_tokens = getattr(usage, "candidates_token_count", 0)
            except Exception:
                prompt_tokens = len(prompt.split()) * 1.3
                completion_tokens = len(response_text.split()) * 1.3

            decision["_tokens"] = {
                "input": int(prompt_tokens),
                "output": int(completion_tokens),
                "cost_usd": self.estimate_cost(int(prompt_tokens), int(completion_tokens)),
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
        pricing = self.PRICING.get(self.model, {"input": 0.0, "output": 0.0})
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost
