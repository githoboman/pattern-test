from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
import app.models # Register all models

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Astra Pattern & Tech Pack Blueprint Engine",
    description="Deterministic blueprint generator with tailor-approved fit rules.",
    version="0.1.0",
    debug=settings.DEBUG
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.health import router as health_router
from app.api.designs import router as designs_router
from app.api.templates import router as templates_router

app.include_router(health_router)
app.include_router(designs_router)
app.include_router(templates_router)

@app.get("/")
def root():
    return {
        "service": "Astra Pattern & Tech Pack Blueprint Engine",
        "health": "/health",
        "docs": "/docs"
    }
