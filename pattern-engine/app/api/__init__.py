from app.api.health import router as health_router
from app.api.designs import router as designs_router
from app.api.templates import router as templates_router

__all__ = ["health_router", "designs_router", "templates_router"]
