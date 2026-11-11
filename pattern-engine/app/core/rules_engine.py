"""Deterministic fit-rule engine.

Hard Rule 2: all arithmetic happens here, in Python, never in an LLM.
Hard Rule 6: each result keeps body value, rule id, adjustment and garment value separately.
A rule with ease_cm = null, or a rule that is not approved, refuses to produce a number
and is reported by id in `blocking_rules`.
"""
from decimal import ROUND_HALF_UP, Decimal
from typing import Dict, List

from app.schemas.template import CalculatedItem, CalculationResult, RuleSchema

TEST_STATUS = "test_data"
REFERENCE_STATUS = "reference_standard"


class RulesEngineException(Exception):
    def __init__(self, message: str, blocking_rules: List[str]):
        super().__init__(message)
        self.blocking_rules = blocking_rules


def _cm(x: float) -> float:
    # Decimal avoids float artefacts such as 92.1 + 4.2 = 96.30000000000001
    return float(Decimal(str(x)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


class RulesEngine:
    @staticmethod
    def calculate_measurement(body_value: float, rule: RuleSchema, allow_test_rules: bool = False) -> CalculatedItem:
        if body_value is None or body_value <= 0:
            raise ValueError(f"Body measurement for '{rule.base}' must be a positive number in cm")

        if rule.ease_cm is None:
            raise RulesEngineException(
                f"Rule '{rule.id}' has no ease value yet (awaiting tailor input).", [rule.id]
            )

        is_allowed_non_approved = rule.status in (TEST_STATUS, REFERENCE_STATUS)
        if rule.status != "approved" and not (allow_test_rules and is_allowed_non_approved):
            raise RulesEngineException(f"Rule '{rule.id}' is '{rule.status}', not tailor-approved.", [rule.id])

        if rule.type != "add_ease":
            raise RulesEngineException(f"Rule type '{rule.type}' is not implemented.", [rule.id])

        garment = Decimal(str(body_value)) + Decimal(str(rule.ease_cm))
        calc_status = "approved" if rule.status == "approved" else (REFERENCE_STATUS if rule.status == REFERENCE_STATUS else TEST_STATUS)
        return CalculatedItem(
            body_cm=_cm(body_value),
            rule_id=rule.id,
            adjustment_ease_cm=_cm(rule.ease_cm),
            garment_cm=_cm(float(garment)),
            status=calc_status,
        )

    @classmethod
    def run_all(
        cls,
        design_id: str,
        template_id: str,
        body_inputs: Dict[str, float],
        rules_by_base: Dict[str, RuleSchema],
        allow_test_rules: bool = False,
    ) -> CalculationResult:
        """Compute every measurement that has a usable rule. Anything else is listed, never guessed."""
        results: Dict[str, CalculatedItem] = {}
        blocking: List[str] = []
        missing_rules: List[str] = []

        for base, body_val in body_inputs.items():
            rule = rules_by_base.get(base)
            if rule is None:
                missing_rules.append(base)
                continue
            try:
                results[base] = cls.calculate_measurement(body_val, rule, allow_test_rules)
            except RulesEngineException as ex:
                blocking.extend(ex.blocking_rules)

        if blocking or missing_rules:
            status = "blocked"
        elif any(r.status == REFERENCE_STATUS for r in results.values()):
            status = "complete_with_reference_data"
        elif any(r.status == TEST_STATUS for r in results.values()):
            status = "complete_with_test_data"
        else:
            status = "complete"

        return CalculationResult(
            design_id=design_id,
            template_id=template_id,
            measurements=results,
            status=status,
            blocking_rules=blocking,
            measurements_without_rule=missing_rules,
        )
