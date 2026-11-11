"""Deterministic offline provider. No API calls."""
from typing import Any, Dict

from app.ai.base import AIProvider
from app.ai.drafting import build_draft_from_template
from app.schemas.analysis import AIAnalysis, DraftNotes, ObservedField


class MockAIProvider(AIProvider):
    name = "mock"

    def analyze_image(self, image_png: bytes = b"", **kwargs) -> AIAnalysis:
        return AIAnalysis(
            garment_type=ObservedField(value="dress", status="observed"),
            silhouette=ObservedField(value="fitted", status="observed"),
            neckline=ObservedField(value="square", status="observed"),
            sleeves=ObservedField(value="sleeveless", status="observed"),
            length=ObservedField(value="midi", status="observed"),
            closure=ObservedField(value=None, status="needs_confirmation"),
            fabric=ObservedField(value=None, status="needs_confirmation"),
            back_view_available=False,
        )

    def draft_notes(
        self, template: Dict[str, Any], confirmed_inputs: Dict[str, Any], calculated: Dict[str, Any]
    ) -> DraftNotes:
        # The mock never writes new text; it only passes through approved template steps.
        return build_draft_from_template(template, confirmed_inputs, calculated)
