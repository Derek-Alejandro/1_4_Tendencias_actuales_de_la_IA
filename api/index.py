import io
import logging

from urllib.parse import (
    quote
)

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile
)

from fastapi.middleware.cors import (
    CORSMiddleware
)

from fastapi.responses import (
    StreamingResponse
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
    ChatApiResponse,
    ChatRequest,
    DocumentApiResponse,
    DocumentDownloadRequest,
    RealtimeSessionRequest
)


# ==========================================================
# OPENAI
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
# VOZ
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

    version=(
        "1.1.0"
    )

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
    ],

    expose_headers=[
        "Content-Disposition"
    ]

)


# ==========================================================
# SERVICIOS
# ==========================================================

openai_service = (
    OpenAIService(
        settings
    )
)


chat_service = (
    ChatService(
        openai_service
    )
)


realtime_service = (
    RealtimeService(
        settings
    )
)


document_service = (
    DocumentService(
        settings,
        openai_service
    )
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
            "1.1.0"

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

        "version":
            "1.1.0",

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

            "document_download":
                "ready",

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


    except ValueError as error:

        raise HTTPException(

            status_code=400,

            detail=str(
                error
            )

        )


    except OpenAIServiceException as error:

        raise HTTPException(

            status_code=(
                error.status_code
            ),

            detail=(
                error.user_message
            )

        )


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


    except RealtimeServiceException as error:

        raise HTTPException(

            status_code=(
                error.status_code
            ),

            detail=(
                error.user_message
            )

        )


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
# TRADUCIR DOCUMENTO
# ==========================================================

@app.post(
    "/api/document",
    response_model=DocumentApiResponse
)
async def translate_document(
    file: UploadFile = File(...)
):

    try:

        file_name = (
            file.filename
            or
            "documento"
        )


        content_type = (
            file.content_type
            or
            ""
        )


        file_bytes = (
            await file.read()
        )


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


        return {

            "success":
                True,

            "data":
                result

        }


    except DocumentServiceException as error:

        raise HTTPException(

            status_code=(
                error.status_code
            ),

            detail=(
                error.user_message
            )

        )


    except OpenAIServiceException as error:

        raise HTTPException(

            status_code=(
                error.status_code
            ),

            detail=(
                error.user_message
            )

        )


    except Exception:

        logger.exception(
            "Error inesperado en /api/document"
        )


        raise HTTPException(

            status_code=500,

            detail=(
                "Ocurrió un error interno al "
                "procesar el documento."
            )

        )


    finally:

        await file.close()


# ==========================================================
# DESCARGA - DIAGNÓSTICO
# ==========================================================

@app.get(
    "/api/document/download"
)
async def document_download_status():

    return {

        "success":
            True,

        "status":
            "ready",

        "message":
            (
                "El endpoint de descarga de "
                "documentos está disponible."
            ),

        "method":
            "POST",

        "formats": [
            "txt",
            "docx",
            "pdf"
        ]

    }


# ==========================================================
# DESCARGAR DOCUMENTO TRADUCIDO
# ==========================================================

@app.post(
    "/api/document/download"
)
def download_translated_document(
    request: DocumentDownloadRequest
):

    try:

        # ==================================================
        # CONVERTIR SECCIONES
        # ==================================================

        sections = [

            {

                "translated_title":
                    section.translated_title,

                "translated_text":
                    section.translated_text

            }

            for section
            in request.sections

        ]


        # ==================================================
        # GENERAR ARCHIVO
        # ==================================================

        (
            download_name,
            mime_type,
            file_bytes
        ) = (
            document_service
            .generate_translated_file(

                original_file_name=(
                    request.original_file_name
                ),

                extension=(
                    request.file_type
                ),

                target_language=(
                    request.target_language
                ),

                sections=(
                    sections
                )

            )
        )


        # ==================================================
        # NOMBRE UTF-8
        # ==================================================

        encoded_name = (
            quote(
                download_name
            )
        )


        headers = {

            "Content-Disposition":
                (
                    "attachment; "
                    f"filename*=UTF-8''{encoded_name}"
                ),

            "Cache-Control":
                "no-store"

        }


        # ==================================================
        # RESPUESTA BINARIA
        # ==================================================

        return StreamingResponse(

            io.BytesIO(
                file_bytes
            ),

            media_type=(
                mime_type
            ),

            headers=(
                headers
            )

        )


    except DocumentServiceException as error:

        raise HTTPException(

            status_code=(
                error.status_code
            ),

            detail=(
                error.user_message
            )

        )


    except Exception:

        logger.exception(
            (
                "Error inesperado en "
                "/api/document/download"
            )
        )


        raise HTTPException(

            status_code=500,

            detail=(
                "Ocurrió un error interno al "
                "generar el documento traducido."
            )

        )