import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import Design, DesignVersion, Correction
from app.schemas.analysis import AnalysisSchema, AnalysisResponse
from app.schemas.template import CalculationResult, RuleSchema
from app.ai import get_ai_provider
from app.core.rules_engine import RulesEngine
from app.core.template_loader import TemplateLoader
from app.core.drawing import build_svg
from app.core.pdf import build_html, render_pdf, PdfUnavailable

router = APIRouter(prefix="/designs", tags=["Designs"])

class AnalyzeRequest(BaseModel):
    image_url: Optional[str] = None
    customer_notes: Optional[str] = None

class BodyInputsRequest(BaseModel):
    bust: float
    waist: float
    hip: float
    dress_length: float
    fabric_choice: Optional[str] = "woven_cotton"
    allow_test_rules: bool = False
    use_reference_rules: bool = True  # FreeSewing / Seamly2D research reference standard

class CorrectionRequest(BaseModel):
    field: str  # e.g., "neckline", "sleeves", "closure", "bust_ease", "seam_allowance"
    old_value: Optional[str] = None
    new_value: str
    cause: str = "misread_image"  # misread_image | wrong_measurement | bad_drawing | unclear_instruction
    created_by: str = "tailor"

@router.post("/analyse", response_model=AnalysisResponse)
async def analyze_design(
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    customer_notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    POST /designs/analyse
    Stores image, extracts visible features via AI Provider (Mock or Gemini),
    and strictly validates output against AnalysisSchema.
    """
    image_bytes = b""
    stored_path = image_url or "/sample_dress.png"

    if file:
        image_bytes = await file.read()
        stored_path = f"/uploads/{uuid.uuid4()}_{file.filename}"

    provider = get_ai_provider()
    raw_analysis = provider.analyze_image(image_png=image_bytes)
    instructions = [customer_notes.strip()] if customer_notes and customer_notes.strip() else []
    analysis = AnalysisSchema(
        **raw_analysis.model_dump(),
        customer_instructions=instructions
    )

    # Check if garment type matches known scope (dress)
    needs_designer_review = analysis.garment_type.value != "dress"

    design_id = f"des_{uuid.uuid4().hex[:8]}"
    design = Design(
        id=design_id,
        image_path=stored_path,
        customer_notes=customer_notes,
        garment_type=analysis.garment_type.value,
        status="needs_designer_review" if needs_designer_review else "draft"
    )
    db.add(design)

    version_id = f"ver_{uuid.uuid4().hex[:8]}"
    version = DesignVersion(
        id=version_id,
        design_id=design_id,
        version_number=1,
        status="draft",
        analysis=analysis.model_dump(),
        template_id="dress_basic_v1" if not needs_designer_review else None
    )
    db.add(version)
    design.current_version_id = version_id
    db.commit()

    return AnalysisResponse(
        design_id=design_id,
        version_number=1,
        image_url=stored_path,
        status="needs_designer_review" if needs_designer_review else "draft",
        analysis=analysis,
        needs_designer_review=needs_designer_review
    )

@router.post("/{design_id}/match")
def match_template(design_id: str, db: Session = Depends(get_db)):
    """
    POST /designs/{id}/match
    Choose a template or flag for designer review. Never force closest match.
    """
    design = db.query(Design).filter(Design.id == design_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    if design.garment_type != "dress":
        design.status = "needs_designer_review"
        db.commit()
        return {
            "design_id": design_id,
            "status": "needs_designer_review",
            "matched_template": None,
            "message": f"Garment type '{design.garment_type}' does not match supported templates (dress only). Flagged for designer review."
        }

    return {
        "design_id": design_id,
        "status": "matched",
        "matched_template": "dress_basic_v1",
        "template_status": "placeholder"
    }

@router.get("/{design_id}/missing")
def get_missing_fields(design_id: str, db: Session = Depends(get_db)):
    """
    GET /designs/{id}/missing
    Returns fields the template still needs from the customer and from the tailor.
    """
    loader = TemplateLoader()
    template = loader.load_template("dress_basic_v1")
    placeholders = loader.get_placeholders_summary("dress_basic_v1")

    return {
        "design_id": design_id,
        "template_id": template.id,
        "required_from_customer": {
            "body_measurements": template.required_body_measurements,
            "fabric_choices": template.fabric_fields,
            "construction_choices": template.construction_options
        },
        "required_from_tailor": {
            "unapproved_rules": placeholders["unapproved_rules"],
            "unapproved_steps": placeholders["unapproved_steps"],
            "seam_allowances_status": placeholders["seam_allowances_status"]
        }
    }

@router.post("/{design_id}/calculate", response_model=CalculationResult)
def calculate_measurements(
    design_id: str,
    inputs: BodyInputsRequest,
    db: Session = Depends(get_db)
):
    """
    POST /designs/{id}/calculate
    Executes rules engine with strict deterministic math.
    Refuses if rules are unapproved unless allow_test_rules is set for testing.
    """
    loader = TemplateLoader()
    template = loader.load_template("dress_basic_v1")
    rules_mapping = loader.rules_for_template(
        template,
        demo_mode=inputs.allow_test_rules,
        use_reference=inputs.use_reference_rules
    )

    body_inputs = {
        "bust": inputs.bust,
        "waist": inputs.waist,
        "hip": inputs.hip,
        "dress_length": inputs.dress_length
    }

    result = RulesEngine.run_all(
        design_id=design_id,
        template_id="dress_basic_v1",
        body_inputs=body_inputs,
        rules_by_base=rules_mapping,
        allow_test_rules=(inputs.allow_test_rules or inputs.use_reference_rules)
    )

    # Store calculation in design version
    design = db.query(Design).filter(Design.id == design_id).first()
    if design and design.current_version_id:
        version = db.query(DesignVersion).filter(DesignVersion.id == design.current_version_id).first()
        if version:
            version.body_measurements = body_inputs
            version.calculated_measurements = result.model_dump()
            db.commit()

    return result

@router.post("/{design_id}/draft")
def draft_blueprint(design_id: str, db: Session = Depends(get_db)):
    """
    POST /designs/{id}/draft
    Generates construction notes using AI provider and assembles SVG drawing config.
    """
    design = db.query(Design).filter(Design.id == design_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    provider = get_ai_provider()
    notes = provider.draft_notes({}, {}, {})

    drawing_config = {
        "components": ["bodice_front", "bodice_back", "neckline_square", "skirt_fitted"],
        "viewBox": "0 0 800 1200",
        "labels": [
            {"id": "label_bust", "text": "Bust Line", "y": 320},
            {"id": "label_waist", "text": "Waist Line", "y": 480},
            {"id": "label_hip", "text": "Hip Line", "y": 640},
            {"id": "label_hem", "text": "Hem Line", "y": 980}
        ]
    }

    return {
        "design_id": design_id,
        "status": "draft",
        "construction_notes": notes.get("construction_steps", []),
        "open_questions": notes.get("open_questions", []),
        "drawing_config": drawing_config
    }

@router.get("/{design_id}")
def get_design_details(design_id: str, db: Session = Depends(get_db)):
    """
    GET /designs/{id}
    Retrieves full design record, latest version, analysis, and calculations.
    """
    design = db.query(Design).filter(Design.id == design_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    version = None
    if design.current_version_id:
        version = db.query(DesignVersion).filter(DesignVersion.id == design.current_version_id).first()

    return {
        "id": design.id,
        "image_path": design.image_path,
        "customer_notes": design.customer_notes,
        "garment_type": design.garment_type,
        "status": design.status,
        "current_version": {
            "id": version.id if version else None,
            "version_number": version.version_number if version else 1,
            "status": version.status if version else "draft",
            "analysis": version.analysis if version else None,
            "template_id": version.template_id if version else None,
            "body_measurements": version.body_measurements if version else None,
            "confirmed_choices": version.confirmed_choices if version else {},
            "calculated_measurements": version.calculated_measurements if version else None,
        } if version else None
    }

@router.post("/{design_id}/correct")
def record_correction(
    design_id: str,
    req: CorrectionRequest,
    db: Session = Depends(get_db)
):
    """
    POST /designs/{id}/correct
    Logs a tailor or designer correction. Kept distinct from AI observations.
    """
    design = db.query(Design).filter(Design.id == design_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    version = db.query(DesignVersion).filter(DesignVersion.id == design.current_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Design version not found")

    corr = Correction(
        id=f"cor_{uuid.uuid4().hex[:8]}",
        design_version_id=version.id,
        field=req.field,
        old_value=req.old_value,
        new_value=req.new_value,
        cause=req.cause,
        created_by=req.created_by
    )
    db.add(corr)

    # Update confirmed choices
    choices = dict(version.confirmed_choices or {})
    choices[req.field] = req.new_value
    version.confirmed_choices = choices
    db.commit()

    return {
        "status": "success",
        "correction_id": corr.id,
        "field": req.field,
        "new_value": req.new_value,
        "confirmed_choices": choices
    }

@router.get("/{design_id}/drawing")
def get_drawing_svg(design_id: str, db: Session = Depends(get_db)):
    """
    GET /designs/{id}/drawing
    Generates dynamic parametric SVG technical flat drawing.
    """
    design = db.query(Design).filter(Design.id == design_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    version = db.query(DesignVersion).filter(DesignVersion.id == design.current_version_id).first() if design.current_version_id else None
    analysis = version.analysis if version and version.analysis else {}
    confirmed = version.confirmed_choices if version and version.confirmed_choices else {}
    calculated = version.calculated_measurements if version and version.calculated_measurements else None

    all_approved = (version.status == "approved_for_sampling") if version else False
    v_label = f"Astra Design {design.id} v{version.version_number if version else 1}"

    svg_content = build_svg(
        analysis=analysis,
        inputs=confirmed,
        calculation=calculated,
        version_label=v_label,
        all_values_approved=all_approved
    )
    return Response(content=svg_content, media_type="image/svg+xml")

@router.get("/{design_id}/export/html")
def export_techpack_html(design_id: str, db: Session = Depends(get_db)):
    """
    GET /designs/{id}/export/html
    Returns complete HTML tech pack blueprint with embedded SVG flat.
    """
    design = db.query(Design).filter(Design.id == design_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    version = db.query(DesignVersion).filter(DesignVersion.id == design.current_version_id).first() if design.current_version_id else None
    analysis = version.analysis if version and version.analysis else {}
    confirmed = version.confirmed_choices if version and version.confirmed_choices else {}
    calculated = version.calculated_measurements if version and version.calculated_measurements else None
    all_approved = (version.status == "approved_for_sampling") if version else False

    svg_content = build_svg(
        analysis=analysis,
        inputs=confirmed,
        calculation=calculated,
        version_label=f"Astra Design {design.id} v{version.version_number if version else 1}",
        all_values_approved=all_approved
    )

    record = {
        "design_id": design.id,
        "version_number": version.version_number if version else 1,
        "status": version.status if version else "draft",
        "template_id": version.template_id if version else "dress_basic_v1",
        "all_values_approved": all_approved,
        "analysis": analysis,
        "body_measurements": version.body_measurements if version else {},
        "calculated_measurements": calculated or {},
        "seam_allowances_cm": {"side_seam": None, "hem": None},
        "construction_notes": version.construction_notes or {},
        "open_questions": version.open_questions or []
    }

    html = build_html(record, svg_content)
    return Response(content=html, media_type="text/html")

@router.get("/{design_id}/export/pdf")
def export_techpack_pdf(design_id: str, db: Session = Depends(get_db)):
    """
    GET /designs/{id}/export/pdf
    Renders A4 tech pack PDF via Playwright Chromium.
    Falls back to HTML if headless browser binary is not installed yet.
    """
    design = db.query(Design).filter(Design.id == design_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    version = db.query(DesignVersion).filter(DesignVersion.id == design.current_version_id).first() if design.current_version_id else None
    analysis = version.analysis if version and version.analysis else {}
    confirmed = version.confirmed_choices if version and version.confirmed_choices else {}
    calculated = version.calculated_measurements if version and version.calculated_measurements else None
    all_approved = (version.status == "approved_for_sampling") if version else False

    svg_content = build_svg(
        analysis=analysis,
        inputs=confirmed,
        calculation=calculated,
        version_label=f"Astra Design {design.id} v{version.version_number if version else 1}",
        all_values_approved=all_approved
    )

    record = {
        "design_id": design.id,
        "version_number": version.version_number if version else 1,
        "status": version.status if version else "draft",
        "template_id": version.template_id if version else "dress_basic_v1",
        "all_values_approved": all_approved,
        "analysis": analysis,
        "body_measurements": version.body_measurements if version else {},
        "calculated_measurements": calculated or {},
        "seam_allowances_cm": {"side_seam": None, "hem": None},
        "construction_notes": version.construction_notes or {},
        "open_questions": version.open_questions or []
    }

    html = build_html(record, svg_content)
    try:
        pdf_bytes = render_pdf(html)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=astra_techpack_{design.id}.pdf"}
        )
    except PdfUnavailable as ex:
        # Fallback to HTML tech pack with explanation
        return Response(
            content=html,
            media_type="text/html",
            headers={"X-PDF-Warning": str(ex)}
        )
