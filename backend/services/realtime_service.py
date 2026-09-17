import logging

from openai import (
    OpenAI,
    AuthenticationError,
    PermissionDeniedError,
    RateLimitError,
    APIConnectionError,
    BadRequestError,
    APIStatusError
)

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
# EXCEPCIÓN CONTROLADA
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

    def __init__(
        self,
        settings: Settings
    ):

        self.settings = (
            settings
        )


        self.client = (
            None
        )


        if (
            self.settings.openai_configured
        ):

            self.client = OpenAI(

                api_key=(
                    self.settings.openai_api_key
                )

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


        if (
            self.client is None
        ):

            raise RealtimeServiceException(
                (
                    "El cliente de OpenAI no pudo "
                    "ser inicializado."
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

Your job is to translate every spoken user turn.

RULES:

1. Automatically detect whether the user speaks
   Spanish or English.

2. If the user speaks Spanish:
   translate naturally into English.

3. If the user speaks English:
   translate naturally into Spanish.

4. Speak ONLY the translation.

5. Do not answer questions as an assistant.

6. Do not provide advice.

7. Do not add explanations.

8. Do not add introductions.

9. Do not repeat the original message.

10. Preserve names, numbers, dates, currencies,
    units, acronyms and technical terminology.

11. Preserve the meaning and tone of the speaker.

12. Prefer natural translations instead of literal
    word-for-word translations.

13. Detect the source language again for each new
    spoken turn.
""".strip()


    # ======================================================
    # CONFIGURACIÓN MÍNIMA
    # ======================================================

    def _session_config(
        self
    ) -> dict:

        """
        Usamos únicamente campos esenciales.

        Primero queremos confirmar que la conexión
        WebRTC funciona correctamente.

        Posteriormente agregaremos configuración
        avanzada de transcripción, VAD y voz.
        """

        return {

            "type":
                "realtime",

            "model":
                self.settings.realtime_model,

            "instructions":
                self._instructions(),

            "output_modalities": [
                "audio"
            ]

        }


    # ======================================================
    # OBTENER INFORMACIÓN DE ERROR
    # ======================================================

    @staticmethod
    def _get_error_message(
        error
    ) -> str:

        message = getattr(
            error,
            "message",
            None
        )


        if (
            message
        ):

            return str(
                message
            )


        return str(
            error
        )


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


        # ==================================================
        # VALIDAR SDP
        # ==================================================

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
                    "La oferta WebRTC enviada "
                    "no tiene un formato SDP válido."
                ),
                400
            )


        try:

            # =================================================
            # SDK OFICIAL OPENAI
            # =================================================
            #
            # El SDK se encarga de:
            #
            # multipart/form-data
            # application/sdp
            # application/json
            # boundary
            #
            # No hacemos multipart manualmente.
            # =================================================

            response = (
                self.client
                .realtime
                .calls
                .create(

                    sdp=(
                        clean_sdp
                    ),

                    session=(
                        self._session_config()
                    )

                )
            )


            # =================================================
            # SDP ANSWER
            # =================================================

            answer_sdp = (
                response.text.strip()
            )


            if (
                not answer_sdp
            ):

                raise RealtimeServiceException(
                    (
                        "OpenAI devolvió una respuesta "
                        "WebRTC vacía."
                    ),
                    502
                )


            if (
                not answer_sdp.startswith(
                    "v=0"
                )
            ):

                logger.error(
                    (
                        "OpenAI devolvió contenido "
                        "que no parece SDP: %s"
                    ),
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
                    "correctamente con modelo %s."
                ),
                self.settings.realtime_model
            )


            return answer_sdp


        # ==================================================
        # BAD REQUEST
        # ==================================================

        except BadRequestError as error:

            openai_message = (
                self._get_error_message(
                    error
                )
            )


            request_id = getattr(
                error,
                "request_id",
                None
            )


            body = getattr(
                error,
                "body",
                None
            )


            logger.error(
                (
                    "OpenAI Realtime BadRequest. "
                    "RequestID=%s "
                    "Message=%s "
                    "Body=%s"
                ),
                request_id,
                openai_message,
                body
            )


            raise RealtimeServiceException(
                (
                    "OpenAI rechazó la sesión de voz. "
                    f"Detalle: {openai_message}"
                ),
                502
            )


        # ==================================================
        # API KEY
        # ==================================================

        except AuthenticationError as error:

            logger.error(
                (
                    "Error de autenticación "
                    "OpenAI Realtime: %s"
                ),
                self._get_error_message(
                    error
                )
            )


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

        except PermissionDeniedError as error:

            logger.error(
                (
                    "Permiso denegado "
                    "OpenAI Realtime: %s"
                ),
                self._get_error_message(
                    error
                )
            )


            raise RealtimeServiceException(
                (
                    "La cuenta de OpenAI no tiene "
                    "permiso para utilizar este "
                    "servicio de voz."
                ),
                403
            )


        # ==================================================
        # RATE LIMIT / CUOTA
        # ==================================================

        except RateLimitError as error:

            logger.error(
                (
                    "Rate limit OpenAI Realtime: %s"
                ),
                self._get_error_message(
                    error
                )
            )


            raise RealtimeServiceException(
                (
                    "El servicio de voz alcanzó "
                    "temporalmente su límite de uso."
                ),
                429
            )


        # ==================================================
        # CONEXIÓN
        # ==================================================

        except APIConnectionError as error:

            logger.error(
                (
                    "Error de conexión "
                    "OpenAI Realtime: %s"
                ),
                self._get_error_message(
                    error
                )
            )


            raise RealtimeServiceException(
                (
                    "No fue posible conectar con "
                    "OpenAI para iniciar la voz."
                ),
                502
            )


        # ==================================================
        # OTRO ERROR HTTP OPENAI
        # ==================================================

        except APIStatusError as error:

            openai_message = (
                self._get_error_message(
                    error
                )
            )


            logger.error(
                (
                    "OpenAI Realtime APIStatusError. "
                    "Status=%s "
                    "RequestID=%s "
                    "Message=%s"
                ),
                getattr(
                    error,
                    "status_code",
                    None
                ),
                getattr(
                    error,
                    "request_id",
                    None
                ),
                openai_message
            )


            raise RealtimeServiceException(
                (
                    "OpenAI presentó un error "
                    "al iniciar la sesión de voz."
                ),
                502
            )


        # ==================================================
        # ERROR CONTROLADO
        # ==================================================

        except RealtimeServiceException:

            raise


        # ==================================================
        # OTRO ERROR
        # ==================================================

        except Exception as error:

            logger.exception(
                (
                    "Error inesperado creando "
                    "sesión WebRTC: %s"
                ),
                str(error)
            )


            raise RealtimeServiceException(
                (
                    "Ocurrió un error inesperado "
                    "al iniciar la conversación de voz."
                ),
                500
            )