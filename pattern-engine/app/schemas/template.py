from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class FinishedMeasurementDef(BaseModel):
    id: str
    label: str
    rule_id: str


class ConstructionStep(BaseModel):
    id: str
    text: Optional[str] = None
    status: str = "awaiting_tailor_approval"


class TemplateSchema(BaseModel):
    id: str
    garment_type: str
    status: str  # placeholder | approved
    required_body_measurements: List[str]
    finished_measurements: List[FinishedMeasurementDef]
    construction_options: Dict[str, List[str]]
    fabric_fields: List[str]
    seam_allowances_cm: Optional[Dict[str, Any]] = None
    construction_steps: List[ConstructionStep]
    drawing_components: List[str]
    match_rules: Dict[str, List[str]] = Field(default_factory=dict)


class RuleSchema(BaseModel):
    id: str
    type: str  # add_ease (more structured types later; never eval strings)
    base: str
    ease_cm: Optional[float] = None
    applies_to: Dict[str, str]
    status: str  # awaiting_tailor_approval | approved | test_data
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None


class CalculatedItem(BaseModel):
    body_cm: float
    rule_id: str
    adjustment_ease_cm: float
    garment_cm: float
    status: str  # approved | test_data


class CalculationResult(BaseModel):
    design_id: str
    template_id: str
    measurements: Dict[str, CalculatedItem]
    status: str  # complete | complete_with_test_data | blocked
    blocking_rules: List[str] = Field(default_factory=list)
    measurements_without_rule: List[str] = Field(default_factory=list)
