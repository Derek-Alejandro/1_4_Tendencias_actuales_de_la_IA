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
# REALTIME SERVICE
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
    # PROMPT
    # ======================================================

    @staticmethod
    def _instructions() -> str:

        return """
You are a professional real-time interpreter between
Spanish and English.

Translate every spoken user turn.

If the user speaks Spanish:
- translate it naturally into English.

If the user speaks English:
- translate it naturally into Spanish.

Speak only the translation.

Do not answer the user's question.
Do not add advice.
Do not explain the translation.
Do not add introductions.
Do not repeat the original message.

Preserve names, numbers, dates, currencies, units,
acronyms and technical terms correctly.

Automatically detect the language of every new turn.

The spoken output must always be in the opposite language.
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


        headers = {

            "Authorization":
                (
                    "Bearer "
                    f"{self.settings.openai_api_key}"
                ),

            "Content-Type":
                "application/json"
        }


        payload = {

            "sdp":
                clean_sdp,

            "session":
                self._session_config()
        }


        try:

            with httpx.Client(
                timeout=30.0
            ) as client:

                response = client.post(

                    self.OPENAI_REALTIME_URL,

                    headers=headers,

                    json=payload

                )


        except httpx.TimeoutException:

            raise RealtimeServiceException(
                (
                    "El servicio de voz tardó "
                    "demasiado en responder."
                ),
                504
            )


        except httpx.RequestError as error:

            logger.error(
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
        # DEBUG SEGURO
        # ==================================================

        if (
            response.status_code >= 400
        ):

            logger.error(
                (
                    "OpenAI Realtime rechazó "
                    "la solicitud. "
                    "Status=%s Body=%s"
                ),
                response.status_code,
                response.text[:1500]
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
        # SOLICITUD INCORRECTA
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
        # SDP ANSWER
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


        return answer_sdp