import re
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

FieldStatus = Literal["observed", "needs_confirmation"]

# A visual feature is a word, never a number. Any digit in a feature value means the
# model is trying to state a measurement, which Hard Rule 1 forbids.
_DIGIT = re.compile(r"\d")


class ObservedField(BaseModel):
    value: Optional[str] = None
    status: FieldStatus = "needs_confirmation"

    @field_validator("value")
    @classmethod
    def normalise(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip().lower().replace("-", "_").replace(" ", "_")
        if v in ("", "null", "none", "unknown", "n/a", "not_visible"):
            return None
        if _DIGIT.search(v):
            raise ValueError("Feature values must not contain numbers or measurements")
        return v

    @model_validator(mode="after")
    def consistent_status(self) -> "ObservedField":
        # Nothing can be "observed" without a value, and an unknown is always null.
        if self.value is None:
            self.status = "needs_confirmation"
        return self


class AIAnalysis(BaseModel):
    """Exactly what the vision model is allowed to return. Customer text is NOT part of it."""
    garment_type: ObservedField
    silhouette: ObservedField
    neckline: ObservedField
    sleeves: ObservedField
    length: ObservedField
    closure: ObservedField
    fabric: ObservedField
    back_view_available: bool = False


class AnalysisSchema(AIAnalysis):
    """Stored analysis = AI observations + customer instructions kept in a separate field."""
    customer_instructions: List[str] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    design_id: str
    version_number: int = 1
    image_url: Optional[str] = None
    status: str = "draft"  # draft | needs_designer_review | needs_review
    analysis: Optional[AnalysisSchema] = None
    needs_designer_review: bool = False
    review_reason: Optional[str] = None
    image_prep_steps: List[str] = Field(default_factory=list)


class DraftStep(BaseModel):
    id: str
    text: str


class DraftNotes(BaseModel):
    """What the drafting call may return: rewording of approved steps + unresolved items."""
    construction_steps: List[DraftStep] = Field(default_factory=list)
    open_questions: List[str] = Field(default_factory=list)
