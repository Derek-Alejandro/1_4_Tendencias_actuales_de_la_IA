import logging

from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File
)

from fastapi.middleware.cors import (
    CORSMiddleware
)


# ==========================================================
# CONFIGURACIÓN
# ==========================================================

from backend.core.settings import (
    settings
)


# ==========================================================
# MODELOS
# ==========================================================

from backend.models.translation import (
    ChatRequest,
    ChatApiResponse,
    RealtimeSessionRequest,
    DocumentApiResponse
)


# ==========================================================
# SERVICIO OPENAI
# ==========================================================

from backend.services.openai_service import (
    OpenAIService,
    OpenAIServiceException
)


# ==========================================================
# CHAT
# ==========================================================

from backend.services.chat_service import (
    ChatService
)


# ==========================================================
# VOZ REALTIME
# ==========================================================

from backend.services.realtime_service import (
    RealtimeService,
    RealtimeServiceException
)


# ==========================================================
# DOCUMENTOS
# ==========================================================

from backend.services.document_service import (
    DocumentService,
    DocumentServiceException
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


realtime_service = RealtimeService(
    settings
)


document_service = DocumentService(
    settings,
    openai_service
)


# ==========================================================
# ROOT
# ==========================================================

@app.get(
    "/api"
)
async def root():

    return {

        "success":
            True,

        "message":
            (
                "Traductor Inteligente Multimodal API "
                "funcionando correctamente."
            ),

        "version":
            "1.0.0"

    }


# ==========================================================
# HEALTH
# ==========================================================

@app.get(
    "/api/health"
)
async def health():

    configured = (
        settings.openai_configured
    )


    return {

        "success":
            True,

        "status":
            "online",

        "openai_configured":
            configured,

        "modules": {

            "chat":
                (
                    "ready"
                    if configured
                    else "configuration_required"
                ),

            "voice":
                (
                    "ready"
                    if configured
                    else "configuration_required"
                ),

            "documents":
                (
                    "ready"
                    if configured
                    else "configuration_required"
                ),

            "images":
                "pending"

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
            chat_service
            .process_message(

                message=(
                    request.message
                ),

                history=(
                    request.history
                )

            )
        )


        return {

            "success":
                True,

            "data":
                result

        }


    # ======================================================
    # ENTRADA INVÁLIDA
    # ======================================================

    except ValueError as error:

        raise HTTPException(

            status_code=400,

            detail=str(
                error
            )

        )


    # ======================================================
    # ERROR OPENAI
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
    # ERROR GENERAL
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


# ==========================================================
# VOZ REALTIME
# ==========================================================

@app.post(
    "/api/realtime/session"
)
def create_realtime_session(
    request: RealtimeSessionRequest
):

    try:

        answer_sdp = (
            realtime_service
            .create_webrtc_session(
                request.sdp
            )
        )


        return {

            "success":
                True,

            "data": {

                "sdp":
                    answer_sdp

            }

        }


    # ======================================================
    # ERROR REALTIME
    # ======================================================

    except RealtimeServiceException as error:

        raise HTTPException(

            status_code=(
                error.status_code
            ),

            detail=(
                error.user_message
            )

        )


    # ======================================================
    # ERROR GENERAL
    # ======================================================

    except Exception:

        logger.exception(
            (
                "Error inesperado en "
                "/api/realtime/session"
            )
        )


        raise HTTPException(

            status_code=500,

            detail=(
                "Ocurrió un error interno "
                "al crear la conversación por voz."
            )

        )


# ==========================================================
# DOCUMENTOS
# ==========================================================

@app.post(
    "/api/document",
    response_model=DocumentApiResponse
)
async def translate_document(
    file: UploadFile = File(...)
):

    try:

        # ==================================================
        # NOMBRE DEL ARCHIVO
        # ==================================================

        file_name = (
            file.filename
            or "documento"
        )


        # ==================================================
        # CONTENT TYPE
        # ==================================================

        content_type = (
            file.content_type
            or ""
        )


        # ==================================================
        # LEER ARCHIVO
        # ==================================================

        file_bytes = (
            await file.read()
        )


        # ==================================================
        # VALIDAR ARCHIVO VACÍO
        # ==================================================

        if (
            not file_bytes
        ):

            raise DocumentServiceException(
                (
                    "El archivo seleccionado "
                    "está vacío."
                ),
                400
            )


        # ==================================================
        # PROCESAR Y TRADUCIR
        # ==================================================

        result = (
            document_service
            .translate_document(

                file_name=(
                    file_name
                ),

                content_type=(
                    content_type
                ),

                file_bytes=(
                    file_bytes
                )

            )
        )


        # ==================================================
        # RESPUESTA
        # ==================================================

        return {

            "success":
                True,

            "data":
                result

        }


    # ======================================================
    # ERROR DE DOCUMENTO
    # ======================================================

    except DocumentServiceException as error:

        raise HTTPException(

            status_code=(
                error.status_code
            ),

            detail=(
                error.user_message
            )

        )


    # ======================================================
    # ERROR OPENAI
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
    # ERROR GENERAL
    # ======================================================

    except Exception:

        logger.exception(
            "Error inesperado en /api/document"
        )


        raise HTTPException(

            status_code=500,

            detail=(
                "Ocurrió un error interno "
                "al procesar el documento."
            )

        )


    # ======================================================
    # CERRAR ARCHIVO
    # ======================================================

    finally:

        await file.close()