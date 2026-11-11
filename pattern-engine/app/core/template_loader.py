"""Loads JSON templates and fit rules (Hard Rule 3: data files, every value has a status)."""
import json
from pathlib import Path
from typing import Any, Dict, Optional

from app.config import settings
from app.schemas.template import RuleSchema, TemplateSchema

DEMO_RULES_FILE = "demo_rules_TEST_DATA.json"


class TemplateLoader:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = Path(data_dir or settings.DATA_DIR)

    # ---------- templates ----------
    def list_template_ids(self) -> list[str]:
        return sorted(p.stem for p in (self.data_dir / "templates").glob("*.json"))

    def load_template(self, template_id: str, approved_only: bool = False) -> TemplateSchema:
        path = self.data_dir / "templates" / f"{template_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"Template '{template_id}' not found")
        template = TemplateSchema(**json.loads(path.read_text(encoding="utf-8")))
        if approved_only and template.status != "approved":
            raise ValueError(f"Template '{template.id}' is '{template.status}', not tailor-approved.")
        return template

    # ---------- rules ----------
    def load_rules(self, rules_filename: str = "dress_rules_v1.json", approved_only: bool = False) -> Dict[str, RuleSchema]:
        path = self.data_dir / "rules" / rules_filename
        if not path.exists():
            raise FileNotFoundError(f"Rules file '{rules_filename}' not found")
        rules: Dict[str, RuleSchema] = {}
        for item in json.loads(path.read_text(encoding="utf-8")):
            rule = RuleSchema(**item)
            if approved_only and rule.status != "approved":
                continue
            rules[rule.id] = rule
        return rules

    def load_demo_rules(self) -> Dict[str, RuleSchema]:
        path = self.data_dir / "rules" / DEMO_RULES_FILE
        if not path.exists():
            return {}
        raw = json.loads(path.read_text(encoding="utf-8"))
        rules = [RuleSchema(**r) for r in raw.get("rules", [])]
        for r in rules:
            if r.status != "test_data":
                raise ValueError(f"Demo rule '{r.id}' must have status 'test_data'")
        return {r.base: r for r in rules}

    def load_reference_rules(self) -> Dict[str, RuleSchema]:
        """Loads FreeSewing / Seamly2D standard reference fit rules."""
        path = self.data_dir / "rules" / "freesewing_seamly2d_reference_rules.json"
        if not path.exists():
            return {}
        raw = json.loads(path.read_text(encoding="utf-8"))
        rules = [RuleSchema(**r) for r in raw]
        return {r.base: r for r in rules}

    def rules_for_template(
        self,
        template: TemplateSchema,
        demo_mode: bool = False,
        use_reference: bool = True
    ) -> Dict[str, RuleSchema]:
        """Map body-measurement name -> rule, following the template's finished measurements.

        Priority order:
        1. Approved tailor rule (if ease_cm is set by tailor)
        2. FreeSewing / Seamly2D reference rule (if use_reference=True)
        3. Test fixture demo rule (if demo_mode=True)
        4. Unapproved / awaiting rule
        """
        all_rules = self.load_rules()
        demo = self.load_demo_rules() if demo_mode else {}
        ref = self.load_reference_rules() if use_reference else {}
        by_base: Dict[str, RuleSchema] = {}
        for fin in template.finished_measurements:
            rule = all_rules.get(fin.rule_id)
            if rule is None:
                continue
            if rule.ease_cm is None:
                if rule.base in ref:
                    by_base[rule.base] = ref[rule.base]
                elif rule.base in demo:
                    by_base[rule.base] = demo[rule.base]
                else:
                    by_base[rule.base] = rule
            else:
                by_base[rule.base] = rule
        return by_base

    # ---------- reporting ----------
    def get_placeholders_summary(self, template_id: str) -> Dict[str, Any]:
        template = self.load_template(template_id)
        rules = self.load_rules()
        seams = template.seam_allowances_cm or {}
        return {
            "template_id": template.id,
            "template_status": template.status,
            "unapproved_rules": [r.id for r in rules.values() if r.status != "approved" or r.ease_cm is None],
            "unapproved_steps": [s.id for s in template.construction_steps if s.status != "approved" or not s.text],
            "seam_allowances_status": seams.get("status", "placeholder"),
        }
