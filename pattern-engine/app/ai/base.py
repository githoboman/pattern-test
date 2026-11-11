from abc import ABC, abstractmethod
from typing import Any, Dict

from app.schemas.analysis import AIAnalysis, DraftNotes


class AnalysisFailed(Exception):
    """Raised when the provider cannot return a valid analysis after one retry."""


class AIProvider(ABC):
    """Every AI provider (mock, Gemini, later a local Ollama model) implements this."""

    name: str = "base"

    @abstractmethod
    def analyze_image(self, image_png: bytes = b"", **kwargs) -> AIAnalysis:
        """Return only visible features. Unknowns are null + needs_confirmation.

        Customer notes are deliberately NOT passed in: they are untrusted text and are
        stored separately by the caller (Hard Rule 5).
        """

    @abstractmethod
    def draft_notes(
        self,
        template: Dict[str, Any],
        confirmed_inputs: Dict[str, Any],
        calculated: Dict[str, Any],
    ) -> DraftNotes:
        """Write construction notes using only the inputs given. List gaps, never fill them."""
