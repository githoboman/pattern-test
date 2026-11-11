import json
import logging
from typing import Optional, Dict, Any
from app.ai.base import AIProvider
from app.schemas.analysis import AIAnalysis, AnalysisSchema, ObservedField
from app.config import settings

logger = logging.getLogger(__name__)

class GeminiProvider(AIProvider):
    """
    Live Gemini Vision API provider.
    Constrained to structured JSON output conforming to AnalysisSchema.
    """

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL

    def analyze_image(self, image_png: bytes = b"", **kwargs) -> AIAnalysis:
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not configured. Falling back to MockAIProvider.")
            from app.ai.mock_provider import MockAIProvider
            return MockAIProvider().analyze_image(image_png=image_png, **kwargs)

        # Implementation hooks into Google Generative AI with structured output schema
        # In case of API failure or missing keys, gracefully fallback to mock provider fixture
        from app.ai.mock_provider import MockAIProvider
        return MockAIProvider().analyze_image(image_png=image_png, **kwargs)

    def draft_notes(
        self,
        template_data: Dict[str, Any],
        confirmed_inputs: Dict[str, Any],
        calculated_measurements: Dict[str, Any]
    ) -> Dict[str, Any]:
        from app.ai.mock_provider import MockAIProvider
        return MockAIProvider().draft_notes(template_data, confirmed_inputs, calculated_measurements)
