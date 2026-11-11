import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base

# JSONB on PostgreSQL, plain JSON on SQLite (local dev / tests)
JSONType = JSON().with_variant(JSONB(), "postgresql")


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True, index=True)
    garment_type = Column(String, nullable=False, index=True)
    version = Column(Integer, default=1)
    status = Column(String, default="placeholder")  # placeholder | approved
    data = Column(JSONType, nullable=False)

    rules = relationship("MeasurementRule", back_populates="template")


class MeasurementRule(Base):
    __tablename__ = "measurement_rules"

    id = Column(String, primary_key=True, index=True)
    template_id = Column(String, ForeignKey("templates.id"), nullable=True)
    rule_data = Column(JSONType, nullable=False)
    status = Column(String, default="awaiting_tailor_approval")
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    template = relationship("Template", back_populates="rules")


class Design(Base):
    __tablename__ = "designs"

    id = Column(String, primary_key=True, index=True)
    image_path = Column(String, nullable=False)  # storage key, not a public URL
    customer_notes = Column(String, nullable=True)  # untrusted, stored verbatim
    garment_type = Column(String, nullable=True)
    status = Column(String, default="draft")  # draft | needs_designer_review | needs_review | approved_for_sampling
    current_version_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)

    versions = relationship("DesignVersion", back_populates="design", cascade="all, delete-orphan",
                            order_by="DesignVersion.version_number")


class DesignVersion(Base):
    __tablename__ = "design_versions"

    id = Column(String, primary_key=True, index=True)
    design_id = Column(String, ForeignKey("designs.id"), nullable=False, index=True)
    version_number = Column(Integer, default=1)
    status = Column(String, default="draft")  # draft | approved_for_sampling
    analysis = Column(JSONType, nullable=True)
    template_id = Column(String, ForeignKey("templates.id"), nullable=True)
    body_measurements = Column(JSONType, nullable=True)
    confirmed_choices = Column(JSONType, nullable=True)  # customer/tailor confirmations, kept apart from AI observations
    calculated_measurements = Column(JSONType, nullable=True)
    construction_notes = Column(JSONType, nullable=True)
    drawing_config = Column(JSONType, nullable=True)
    open_questions = Column(JSONType, nullable=True)
    created_by = Column(String, default="system")
    created_at = Column(DateTime(timezone=True), default=_now)

    design = relationship("Design", back_populates="versions")
    corrections = relationship("Correction", back_populates="version")


class Correction(Base):
    __tablename__ = "corrections"

    id = Column(String, primary_key=True, index=True)
    design_version_id = Column(String, ForeignKey("design_versions.id"), nullable=False, index=True)
    field = Column(String, nullable=False)
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    cause = Column(String, nullable=False)  # misread_image | wrong_measurement | bad_drawing | unclear_instruction
    created_by = Column(String, default="tailor")
    created_at = Column(DateTime(timezone=True), default=_now)

    version = relationship("DesignVersion", back_populates="corrections")


class Export(Base):
    __tablename__ = "exports"

    id = Column(String, primary_key=True, index=True)
    design_version_id = Column(String, ForeignKey("design_versions.id"), nullable=False, index=True)
    pdf_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now)
