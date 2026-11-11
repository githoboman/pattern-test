from pydantic import BaseModel
from typing import Dict, Any

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database: str
    ai_provider: str
    environment: str
