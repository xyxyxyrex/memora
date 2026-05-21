# AI Provider Guide

## Purpose

This short guide explains how the project currently calls an AI model and how to swap providers (for example, to Google Gemini or OpenAI) or add a fallback strategy.

## Current setup (what the repo uses)

- The backend AI code is in `backend/services/ai_service.py`.
- The running code is configured to use Groq via an OpenAI-compatible client:
  - Environment variable: `GROQ_API_KEY` (see `backend/config.py`).
  - Model currently set as: `llama-3.3-70b-versatile` in `ai_service.py`.
- There is no automatic fallback to Gemini or any other provider in the current code.

## Quick checklist to switch providers

1. Choose the provider you want to use (Groq, Google Gemini, OpenAI, Anthropic, etc.).
2. Add the provider's API key to the environment (see `.env.example`).
3. Update or add an adapter in `backend/services/ai_service.py` that constructs the correct client and calls the model.
4. Update any provider-specific prompt or model-name constants.
5. Test generation flows (summary, flashcards, quizzes, grading) and handle rate-limit errors.

## Example approaches

Option A — Minimal swap (replace client configuration)

- Edit the top of `backend/services/ai_service.py` to instantiate the client for your chosen provider.
- Keep the rest of the functions (summarize_text, generate_flashcards, generate_quiz_questions, grade_open_answers) but confirm API call shapes match the provider.

Option B — Build a small adapter (recommended)

- Create a thin adapter that exposes a simple function `ai_chat(messages, max_tokens, model)` and internally routes to the configured provider.
- Example pseudocode:

```py
from config import GROQ_API_KEY, GEMINI_API_KEY, USE_PROVIDER

def ai_chat(messages, max_tokens=2048, model=None):
    if USE_PROVIDER == 'gemini' and GEMINI_API_KEY:
        # call Gemini SDK
        return gemini_client.chat(...)
    # default to Groq / OpenAI-compatible client
    return groq_client.chat.completions.create(...)
```

This keeps provider-specific code isolated and makes adding a fallback simple.

## Adding a fallback

1. Wrap the primary provider call in a try/except.
2. On failure (network error, 5xx, or quota error), attempt a secondary provider if available.

Example pseudocode:

```py
try:
    return primary_ai_call(...)
except (RateLimitError, APIError) as e:
    if fallback_available:
        return fallback_ai_call(...)
    raise
```

## Provider-specific tips

- Groq (current): configured via `AsyncOpenAI(base_url="https://api.groq.com/openai/v1", api_key=GROQ_API_KEY)`.
- Google Gemini: requires Google GenAI or HTTP calls to the Gemini REST endpoint; auth and SDK differ from OpenAI.
- OpenAI: if using OpenAI official SDK, replace client setup and adjust calls accordingly.

## Testing

- After making changes, run the backend locally and exercise endpoints:
  - `POST /api/topics/upload` (upload a small PDF)
  - `POST /api/topics/{id}/generate-reviewer`
  - `POST /api/flashcards/generate`
  - `POST /api/quizzes/generate`
- Watch logs for API errors and verify generated outputs are valid JSON where expected.

## Notes & cautions

- API shapes and rate-limits differ across providers; some endpoints in `ai_service.py` rely on large output (JSON arrays) and include repair heuristics — test thoroughly.
- Keep secrets out of source control. Use `.env` for local dev and secure env vars in production.

If you want, I can:

- Implement an `ai_adapter.py` and wire it into `ai_service.py` with a Groq→Gemini fallback example.
- Add automated tests for the JSON-generation endpoints to detect provider-specific regressions.

Pick one and I'll implement it next.
