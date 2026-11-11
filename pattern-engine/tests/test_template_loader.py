import pytest
from app.core.template_loader import TemplateLoader

def test_load_template_placeholder():
    loader = TemplateLoader()
    template = loader.load_template("dress_basic_v1", approved_only=False)
    assert template.id == "dress_basic_v1"
    assert template.garment_type == "dress"
    assert template.status == "placeholder"
    assert "bust" in template.required_body_measurements

def test_template_refuses_unapproved_in_approved_mode():
    loader = TemplateLoader()
    with pytest.raises(ValueError) as exc:
        loader.load_template("dress_basic_v1", approved_only=True)
    assert "not tailor-approved" in str(exc.value)

def test_placeholders_summary():
    loader = TemplateLoader()
    summary = loader.get_placeholders_summary("dress_basic_v1")
    assert summary["template_status"] == "placeholder"
    assert len(summary["unapproved_rules"]) > 0
