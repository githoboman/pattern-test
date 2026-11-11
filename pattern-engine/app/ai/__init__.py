from app.ai.base import AIProvider
from app.ai.mock_provider import MockAIProvider
from app.ai.gemini_provider import GeminiProvider
from app.config import settings

def get_ai_provider() -> AIProvider:
    if settings.AI_PROVIDER_MODE.upper() == "GEMINI" and settings.GEMINI_API_KEY:
        return GeminiProvider()
    return MockAIProvider()

__all__ = ["AIProvider", "MockAIProvider", "GeminiProvider", "get_ai_provider"]
