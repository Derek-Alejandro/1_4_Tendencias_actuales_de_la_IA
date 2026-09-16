import logging

from fastapi import (
    FastAPI,
    HTTPException
)

from fastapi.middleware.cors import (
    CORSMiddleware
)

from backend.core.settings import (
    settings
)

from backend.models.translation import (
    ChatRequest,
    ChatApiResponse
)

from backend.services.openai_service import (
    OpenAIService,
    OpenAIServiceException
)

from backend.services.chat_service import (
    ChatService
)


# ==========================================================
# LOGS
# ==========================================================

logger = logging.getLogger(
    __name__
)


# ==========================================================
# FASTAPI
# ==========================================================

app = FastAPI(

    title=(
        "Traductor Inteligente Multimodal API"
    ),

    description=(
        "Backend para traducción multimodal "
        "Español ↔ Inglés."
    ),

    version="1.0.0"
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=(
        settings.allowed_origins
    ),

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
# SERVICIOS
# ==========================================================

openai_service = OpenAIService(
    settings
)


chat_service = ChatService(
    openai_service
)


# ==========================================================
# ROOT API
# ==========================================================

@app.get(
    "/api"
)
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
# HEALTH
# ==========================================================

@app.get(
    "/api/health"
)
async def health():

    return {

        "success": True,

        "status": "online",

        "openai_configured": (
            settings.openai_configured
        ),

        "modules": {

            "chat": (
                "ready"
                if settings.openai_configured
                else "configuration_required"
            ),

            "voice": "pending",

            "documents": "pending",

            "images": "pending"
        }
    }


# ==========================================================
# CHAT
# ==========================================================

@app.post(
    "/api/chat",
    response_model=ChatApiResponse
)
async def chat(
    request: ChatRequest
):

    try:

        result = (
            chat_service.process_message(

                message=(
                    request.message
                ),

                history=(
                    request.history
                )
            )
        )


        return {

            "success": True,

            "data": result
        }


    # ======================================================
    # ENTRADA INCORRECTA
    # ======================================================

    except ValueError as error:

        raise HTTPException(

            status_code=400,

            detail=str(
                error
            )
        )


    # ======================================================
    # ERROR CONTROLADO OPENAI
    # ======================================================

    except OpenAIServiceException as error:

        raise HTTPException(

            status_code=(
                error.status_code
            ),

            detail=(
                error.user_message
            )
        )


    # ======================================================
    # OTRO ERROR
    # ======================================================

    except Exception:

        logger.exception(
            "Error inesperado en /api/chat"
        )


        raise HTTPException(

            status_code=500,

            detail=(
                "Ocurrió un error interno "
                "al procesar el mensaje."
            )
        )