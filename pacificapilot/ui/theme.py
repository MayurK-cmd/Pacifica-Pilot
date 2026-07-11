"""PacificaPilot UI theme — single source of truth for all styling."""

from InquirerPy.utils import get_style

PILOT_STYLE = get_style({
    "questionmark":     "#00d4aa bold",
    "answermark":       "#00d4aa",
    "answer":           "#e8e8e8 bold",
    "input":            "#e8e8e8",
    "question":         "#e8e8e8 bold",
    "instruction":      "#6b7280 italic",
    "long_instruction": "#6b7280 italic",
    "pointer":          "#00d4aa bold",
    "checkbox":         "#00d4aa",
    "separator":        "#1f2937",
    "skipped":          "#6b7280 italic",
    "validator":        "#ef4444",
    "marker":           "#00d4aa bold",
    "fuzzy_prompt":     "#e8e8e8",
    "fuzzy_info":       "#6b7280 italic",
    "fuzzy_border":     "#1f2937",
    "fuzzy_match":      "#00d4aa bold",
    "spinner_pattern":  "#00d4aa",
    "spinner_text":     "#6b7280 italic",
})

# Key instruction lookup
KEY_INSTRUCTIONS = {
    "openrouter": "Get key at: https://openrouter.ai/keys",
    "anthropic":  "Get key at: https://console.anthropic.com/",
    "openai":     "Get key at: https://platform.openai.com/api-keys",
    "google":     "Get key at: https://aistudio.google.com/apikey",
}

OPENROUTER_POPULAR_MODELS = [
    "anthropic/claude-sonnet-4-5",
    "anthropic/claude-3.5-haiku",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "google/gemini-2.0-flash",
    "google/gemini-1.5-pro",
    "meta-llama/llama-3.3-70b",
    "deepseek/deepseek-chat",
    "mistralai/mistral-7b",
]
