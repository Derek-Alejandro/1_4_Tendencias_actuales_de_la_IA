import json
import logging

import httpx

from backend.core.settings import (
    Settings
)


# ==========================================================
# LOGS
# ==========================================================

logger = logging.getLogger(
    __name__
)


# ==========================================================
# EXCEPCIÓN
# ==========================================================

class RealtimeServiceException(
    Exception
):

    def __init__(
        self,
        user_message: str,
        status_code: int = 500
    ):

        super().__init__(
            user_message
        )

        self.user_message = (
            user_message
        )

        self.status_code = (
            status_code
        )


# ==========================================================
# SERVICIO REALTIME
# ==========================================================

class RealtimeService:

    OPENAI_REALTIME_URL = (
        "https://api.openai.com/v1/realtime/calls"
    )


    def __init__(
        self,
        settings: Settings
    ):

        self.settings = (
            settings
        )


    # ======================================================
    # VALIDAR CONFIGURACIÓN
    # ======================================================

    def _ensure_configured(
        self
    ):

        if (
            not self.settings.openai_configured
        ):

            raise RealtimeServiceException(
                (
                    "El servicio de voz no está "
                    "configurado correctamente."
                ),
                500
            )


    # ======================================================
    # INSTRUCCIONES
    # ======================================================

    @staticmethod
    def _instructions() -> str:

        return """
You are a professional real-time bilingual interpreter
between Spanish and English.

Your task is to translate every spoken user turn.

RULES:

1. Automatically detect whether the user is speaking
   Spanish or English.

2. If the user speaks Spanish:
   translate naturally into English.

3. If the user speaks English:
   translate naturally into Spanish.

4. Speak ONLY the translation.

5. Do not answer questions as an assistant.

6. Do not provide advice or additional information.

7. Do not explain the translation.

8. Do not repeat the original sentence.

9. Preserve names, numbers, dates, times, currencies,
   units, acronyms and technical terminology.

10. Preserve the meaning and tone of the speaker.

11. Prefer natural translations over literal
    word-for-word translations.

12. Every new spoken turn may use a different language.
    Detect the language again for every turn.
""".strip()


    # ======================================================
    # CONFIGURACIÓN DE SESIÓN
    # ======================================================

    def _session_config(
        self
    ) -> dict:

        return {

            "type":
                "realtime",

            "model":
                self.settings.realtime_model,

            "instructions":
                self._instructions(),

            "output_modalities": [
                "audio"
            ],

            "max_output_tokens":
                1000,

            "audio": {

                "input": {

                    "transcription": {

                        "model":
                            self.settings
                            .transcription_model

                    },

                    "turn_detection": {

                        "type":
                            "server_vad",

                        "threshold":
                            0.5,

                        "prefix_padding_ms":
                            300,

                        "silence_duration_ms":
                            700,

                        "create_response":
                            True,

                        "interrupt_response":
                            True

                    }

                },

                "output": {

                    "voice":
                        self.settings
                        .realtime_voice

                }

            }

        }


    # ======================================================
    # CREAR SESIÓN WEBRTC
    # ======================================================

    def create_webrtc_session(
        self,
        sdp: str
    ) -> str:

        self._ensure_configured()


        # ==================================================
        # VALIDAR SDP
        # ==================================================

        clean_sdp = (
            sdp.strip()
        )


        if (
            not clean_sdp
        ):

            raise RealtimeServiceException(
                (
                    "La información WebRTC "
                    "está vacía."
                ),
                400
            )


        if (
            not clean_sdp.startswith(
                "v=0"
            )
        ):

            raise RealtimeServiceException(
                (
                    "La información WebRTC "
                    "no tiene un formato válido."
                ),
                400
            )


        # ==================================================
        # SESIÓN
        # ==================================================

        session_config = (
            self._session_config()
        )


        session_json = (
            json.dumps(
                session_config,
                ensure_ascii=False
            )
        )


        # ==================================================
        # HEADERS
        # ==================================================
        #
        # IMPORTANTE:
        #
        # NO establecer Content-Type manualmente.
        #
        # httpx agregará automáticamente:
        #
        # multipart/form-data;
        # boundary=...
        #
        # ==================================================

        headers = {

            "Authorization":
                (
                    "Bearer "
                    f"{self.settings.openai_api_key}"
                ),

            "Accept":
                "application/sdp"

        }


        # ==================================================
        # MULTIPART
        # ==================================================
        #
        # OpenAI requiere:
        #
        # sdp:
        # application/sdp
        #
        # session:
        # application/json
        #
        # ==================================================

        files = {

            "sdp": (
                None,
                clean_sdp,
                "application/sdp"
            ),

            "session": (
                None,
                session_json,
                "application/json"
            )

        }


        try:

            # ==============================================
            # PETICIÓN OPENAI
            # ==============================================

            with httpx.Client(
                timeout=30.0
            ) as client:

                response = client.post(

                    self.OPENAI_REALTIME_URL,

                    headers=headers,

                    files=files

                )


        # ==================================================
        # TIMEOUT
        # ==================================================

        except httpx.TimeoutException:

            logger.exception(
                (
                    "Timeout conectando con "
                    "OpenAI Realtime."
                )
            )


            raise RealtimeServiceException(
                (
                    "El servicio de voz tardó "
                    "demasiado en responder."
                ),
                504
            )


        # ==================================================
        # CONEXIÓN
        # ==================================================

        except httpx.RequestError as error:

            logger.exception(
                (
                    "Error de conexión con "
                    "OpenAI Realtime: %s"
                ),
                str(error)
            )


            raise RealtimeServiceException(
                (
                    "No fue posible conectar con "
                    "el servicio de voz."
                ),
                502
            )


        # ==================================================
        # REQUEST ID
        # ==================================================

        request_id = (
            response.headers.get(
                "x-request-id",
                "sin-request-id"
            )
        )


        logger.info(
            (
                "OpenAI Realtime respondió. "
                "Status=%s RequestID=%s"
            ),
            response.status_code,
            request_id
        )


        # ==================================================
        # ERRORES OPENAI
        # ==================================================

        if (
            response.status_code >= 400
        ):

            logger.error(
                (
                    "OpenAI Realtime rechazó "
                    "la solicitud. "
                    "Status=%s "
                    "RequestID=%s "
                    "Body=%s"
                ),
                response.status_code,
                request_id,
                response.text[:2000]
            )


        # ==================================================
        # AUTENTICACIÓN
        # ==================================================

        if (
            response.status_code == 401
        ):

            raise RealtimeServiceException(
                (
                    "No fue posible autenticar "
                    "el servicio de voz."
                ),
                500
            )


        # ==================================================
        # PERMISOS
        # ==================================================

        if (
            response.status_code == 403
        ):

            raise RealtimeServiceException(
                (
                    "La cuenta de OpenAI no tiene "
                    "acceso al servicio de voz solicitado."
                ),
                403
            )


        # ==================================================
        # RATE LIMIT
        # ==================================================

        if (
            response.status_code == 429
        ):

            raise RealtimeServiceException(
                (
                    "El servicio de voz alcanzó "
                    "temporalmente su límite de uso."
                ),
                429
            )


        # ==================================================
        # CONFIGURACIÓN INVÁLIDA
        # ==================================================

        if (
            response.status_code == 400
        ):

            raise RealtimeServiceException(
                (
                    "OpenAI rechazó la configuración "
                    "de la sesión de voz."
                ),
                502
            )


        # ==================================================
        # OTRO ERROR
        # ==================================================

        if (
            response.status_code >= 400
        ):

            raise RealtimeServiceException(
                (
                    "No fue posible crear la sesión "
                    "de voz en tiempo real."
                ),
                502
            )


        # ==================================================
        # LEER SDP ANSWER
        # ==================================================

        answer_sdp = (
            response.text.strip()
        )


        if (
            not answer_sdp
        ):

            raise RealtimeServiceException(
                (
                    "OpenAI devolvió una conexión "
                    "WebRTC vacía."
                ),
                502
            )


        # ==================================================
        # VALIDAR SDP ANSWER
        # ==================================================

        if (
            not answer_sdp.startswith(
                "v=0"
            )
        ):

            logger.error(
                (
                    "OpenAI devolvió una respuesta "
                    "que no parece SDP. "
                    "RequestID=%s Body=%s"
                ),
                request_id,
                answer_sdp[:1000]
            )


            raise RealtimeServiceException(
                (
                    "OpenAI devolvió una respuesta "
                    "WebRTC no válida."
                ),
                502
            )


        logger.info(
            (
                "Sesión WebRTC creada "
                "correctamente. "
                "RequestID=%s"
            ),
            request_id
        )


        return answer_sdp