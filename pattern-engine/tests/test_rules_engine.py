import pytest
from app.core.rules_engine import RulesEngine, RulesEngineException
from app.schemas.template import RuleSchema

def test_acceptance_92_plus_4_equals_96_test_rule():
    """
    Phase 4 Acceptance Test:
    92 cm body bust + 4 cm ease = 96 cm using a test-only rule
    that is clearly marked as test data.
    """
    test_rule = RuleSchema(
        id="test_bust_ease_rule",
        type="add_ease",
        base="bust",
        ease_cm=4.0,
        applies_to={"garment_type": "dress", "silhouette": "fitted"},
        status="test_data"
    )

    result = RulesEngine.calculate_measurement(
        body_value=92.0,
        rule=test_rule,
        allow_test_rules=True
    )

    assert result.body_cm == 92.0
    assert result.adjustment_ease_cm == 4.0
    assert result.garment_cm == 96.0
    assert result.rule_id == "test_bust_ease_rule"
    assert result.status == "test_data"

def test_refuse_calculation_when_ease_cm_is_null():
    """
    Hard Rule 4: If ease_cm is null, calculation refuses to run
    and reports which rule is waiting for tailor input.
    """
    null_rule = RuleSchema(
        id="bust_ease_rule_fitted",
        type="add_ease",
        base="bust",
        ease_cm=None,
        applies_to={"garment_type": "dress"},
        status="awaiting_tailor_approval"
    )

    with pytest.raises(RulesEngineException) as exc_info:
        RulesEngine.calculate_measurement(body_value=90.0, rule=null_rule)

    assert "bust_ease_rule_fitted" in exc_info.value.blocking_rules

def test_refuse_calculation_when_unapproved():
    """
    Hard Rule 3: Unapproved rules cannot run in approved mode.
    """
    unapproved_rule = RuleSchema(
        id="real_rule_unapproved",
        type="add_ease",
        base="bust",
        ease_cm=4.0,
        applies_to={"garment_type": "dress"},
        status="awaiting_tailor_approval"
    )

    with pytest.raises(RulesEngineException) as exc_info:
        RulesEngine.calculate_measurement(body_value=90.0, rule=unapproved_rule, allow_test_rules=False)

    assert "real_rule_unapproved" in exc_info.value.blocking_rules

def test_freesewing_seamly2d_reference_rules_calculation():
    """
    Verifies FreeSewing / Seamly2D reference ease rules produce
    valid calculated measurements under reference_standard status.
    """
    ref_rule = RuleSchema(
        id="freesewing_bust_ease_fitted",
        type="add_ease",
        base="bust",
        ease_cm=4.0,
        applies_to={"garment_type": "dress", "silhouette": "fitted"},
        status="reference_standard",
        approved_by="FreeSewing v3 / Seamly2D (Aldrich close-fitting block)"
    )

    result = RulesEngine.calculate_measurement(
        body_value=92.0,
        rule=ref_rule,
        allow_test_rules=True
    )

    assert result.body_cm == 92.0
    assert result.adjustment_ease_cm == 4.0
    assert result.garment_cm == 96.0
    assert result.status == "reference_standard"
