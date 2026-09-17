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

Your only job is to translate the user's spoken words.

RULES:

1. Detect automatically whether every new spoken turn is
   primarily Spanish or English.

2. If the user speaks Spanish:
   translate naturally into English.

3. If the user speaks English:
   translate naturally into Spanish.

4. SPEAK ONLY the translation.

5. Do not answer questions as an assistant.

6. Do not give advice.

7. Do not add explanations, introductions, commentary,
   greetings, or extra information.

8. Preserve names, numbers, dates, times, currencies,
   technical terms, units and acronyms correctly.

9. Preserve the meaning and tone of the speaker.

10. Prefer a natural translation over a literal
    word-for-word translation.

11. If the speaker changes language in a later turn,
    automatically change the target language accordingly.

12. Do not repeat the original sentence before translating.

Examples:

Spanish input:
"Hola, mañana tengo una reunión a las cinco."

Spoken output:
"Hello, I have a meeting tomorrow at five."

English input:
"Where is the nearest train station?"

Spoken output:
"¿Dónde está la estación de tren más cercana?"
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

                    "noise_reduction": {
                        "type":
                            "near_field"
                    },

                    "transcription": {
                        "model":
                            self.settings.transcription_model
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
                        self.settings.realtime_voice,

                    "speed":
                        1.0
                }
            }
        }


    # ======================================================
    # CREAR CONEXIÓN WEBRTC
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
                    "La información de conexión "
                    "WebRTC está vacía."
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


        except httpx.RequestError:

            raise RealtimeServiceException(
                (
                    "No fue posible conectar con "
                    "el servicio de voz."
                ),
                502
            )


        # ==================================================
        # ERRORES OPENAI
        # ==================================================

        if (
            response.status_code
            == 401
        ):

            raise RealtimeServiceException(
                (
                    "No fue posible autenticar "
                    "el servicio de voz."
                ),
                500
            )


        if (
            response.status_code
            == 429
        ):

            raise RealtimeServiceException(
                (
                    "El servicio de voz alcanzó "
                    "temporalmente su límite de uso."
                ),
                429
            )


        if (
            response.status_code
            >= 400
        ):

            logger.error(
                (
                    "OpenAI Realtime rechazó "
                    "la solicitud. Status: %s"
                ),
                response.status_code
            )

            raise RealtimeServiceException(
                (
                    "No fue posible crear la sesión "
                    "de voz en tiempo real."
                ),
                502
            )


        # ==================================================
        # SDP DE RESPUESTA
        # ==================================================

        answer_sdp = (
            response.text.strip()
        )


        if (
            not answer_sdp
        ):

            raise RealtimeServiceException(
                (
                    "El servicio de voz devolvió "
                    "una conexión vacía."
                ),
                502
            )


        return answer_sdp