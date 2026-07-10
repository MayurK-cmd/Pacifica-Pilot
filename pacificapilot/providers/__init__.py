"""BYOK AI provider adapters."""

from .base import AIProvider, parse_decision_response
from .anthropic import AnthropicProvider
from .openai import OpenAIProvider
from .google import GoogleProvider
from .openrouter import OpenRouterProvider


def get_provider(provider_name: str, api_key: str, model: str) -> AIProvider:
    """
    Factory function to get a provider instance.

    Args:
        provider_name: "anthropic" | "openai" | "google" | "openrouter"
        api_key: API key for the provider
        model: Model identifier

    Returns:
        AIProvider instance

    Raises:
        ValueError: If provider_name is unknown
    """
    providers = {
        "anthropic": AnthropicProvider,
        "openai": OpenAIProvider,
        "google": GoogleProvider,
        "gemini": GoogleProvider,  # alias for google (more accurate name)
        "openrouter": OpenRouterProvider,
    }

    provider_class = providers.get(provider_name.lower())
    if not provider_class:
        raise ValueError(
            f"Unknown provider: {provider_name}. "
            f"Valid options: {', '.join(providers.keys())}"
        )

    return provider_class(api_key, model)


__all__ = [
    "AIProvider",
    "parse_decision_response",
    "AnthropicProvider",
    "OpenAIProvider",
    "GoogleProvider",
    "OpenRouterProvider",
    "get_provider",
]
