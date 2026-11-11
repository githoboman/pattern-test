"""Template matching with simple rules. No match -> needs_designer_review. Never force the closest."""
from typing import Optional, Tuple

from app.core.template_loader import TemplateLoader
from app.schemas.analysis import AnalysisSchema


def match_template(analysis: AnalysisSchema, loader: Optional[TemplateLoader] = None) -> Tuple[Optional[str], str]:
    """Return (template_id, reason). template_id is None when no template fits."""
    loader = loader or TemplateLoader()
    reasons = []
    for tid in loader.list_template_ids():
        template = loader.load_template(tid)
        mismatches = []
        for field, allowed in template.match_rules.items():
            observed = getattr(analysis, field, None)
            value = observed.value if observed is not None else None
            if value is None:
                mismatches.append(f"{field} not visible")
            elif value not in allowed:
                mismatches.append(f"{field}='{value}' not in {allowed}")
        if not mismatches:
            return tid, f"Matched {tid}"
        reasons.append(f"{tid}: " + "; ".join(mismatches))
    return None, "No template matches. " + " | ".join(reasons)
