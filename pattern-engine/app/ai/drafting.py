"""Deterministic parts of drafting, shared by every provider."""
import re
from typing import Any, Dict, List

from app.schemas.analysis import DraftNotes, DraftStep

_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")


def build_draft_from_template(
    template: Dict[str, Any], confirmed_inputs: Dict[str, Any], calculated: Dict[str, Any]
) -> DraftNotes:
    """Use approved template steps verbatim; every unapproved/empty step becomes a question."""
    steps: List[DraftStep] = []
    questions: List[str] = []

    for step in template.get("construction_steps", []):
        if step.get("status") == "approved" and step.get("text"):
            steps.append(DraftStep(id=step["id"], text=step["text"]))
        else:
            questions.append(f"Construction step '{step['id']}' has no tailor-approved wording yet.")

    seams = template.get("seam_allowances_cm") or {}
    if seams.get("status") != "approved":
        questions.append("Seam and hem allowances are not tailor-approved yet.")

    for rule_id in calculated.get("blocking_rules", []):
        questions.append(f"Fit rule '{rule_id}' is waiting for the tailor's ease value.")

    for key in ("closure", "fabric"):
        if not confirmed_inputs.get(key):
            questions.append(f"{key.capitalize()} was not visible in the image and has not been confirmed.")

    return DraftNotes(construction_steps=steps, open_questions=questions)


def numbers_in(obj: Any) -> set[str]:
    """Every number that appears anywhere in a nested structure (as normalised strings)."""
    found: set[str] = set()

    def walk(x: Any) -> None:
        if isinstance(x, bool) or x is None:
            return
        if isinstance(x, (int, float)):
            found.add(_norm(str(x)))
        elif isinstance(x, str):
            found.update(_norm(n) for n in _NUMBER.findall(x))
        elif isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, (list, tuple)):
            for v in x:
                walk(v)

    walk(obj)
    return found


def _norm(n: str) -> str:
    n = n.replace(",", ".")
    return str(float(n)).rstrip("0").rstrip(".") if "." in n else str(int(n))


def assert_no_new_numbers(draft: DraftNotes, *inputs: Any) -> None:
    """Phase 6 guard: a drafted note may not contain a number that is not in its inputs."""
    allowed: set[str] = set()
    for i in inputs:
        allowed |= numbers_in(i)
    # step ids like "step_3" are allowed to carry their own number
    allowed |= numbers_in([s.id for s in draft.construction_steps])
    invented = numbers_in(draft.model_dump()) - allowed
    if invented:
        raise ValueError(f"Draft contains numbers not present in its inputs: {sorted(invented)}")
