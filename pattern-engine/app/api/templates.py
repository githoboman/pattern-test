from fastapi import APIRouter
from app.core.template_loader import TemplateLoader

router = APIRouter(prefix="/templates", tags=["Templates"])

@router.get("")
def list_templates():
    loader = TemplateLoader()
    template = loader.load_template("dress_basic_v1")
    return [
        {
            "id": template.id,
            "garment_type": template.garment_type,
            "status": template.status,
            "required_measurements": template.required_body_measurements
        }
    ]

@router.get("/{template_id}/placeholders")
def get_template_placeholders(template_id: str):
    loader = TemplateLoader()
    return loader.get_placeholders_summary(template_id)
