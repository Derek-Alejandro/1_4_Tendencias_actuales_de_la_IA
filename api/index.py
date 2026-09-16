from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.settings import settings


# ==========================================================
# APLICACIÓN
# ==========================================================

app = FastAPI(
    title="Traductor Inteligente Multimodal API",
    description=(
        "Backend para la aplicación Web de traducción "
        "multimodal Español ↔ Inglés."
    ),
    version="1.0.0"
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=[
        "GET",
        "POST",
        "OPTIONS"
    ],
    allow_headers=[
        "Content-Type",
        "Authorization"
    ]
)


# ==========================================================
# RUTA PRINCIPAL
# ==========================================================

@app.get("/api")
async def root():
    return {
        "success": True,
        "message": (
            "Traductor Inteligente Multimodal API "
            "funcionando correctamente."
        ),
        "version": "1.0.0"
    }


# ==========================================================
# HEALTH CHECK
# ==========================================================

@app.get("/api/health")
async def health():
    return {
        "success": True,
        "status": "online",
        "openai_configured": settings.openai_configured,
        "modules": {
            "chat": "pending",
            "voice": "pending",
            "documents": "pending",
            "images": "pending"
        }
    }