import json

from openai import (
    OpenAI,
    AuthenticationError,
    RateLimitError,
    APIConnectionError,
    BadRequestError,
    APIStatusError
)

from backend.core.settings import Settings


# ==========================================================
# EXCEPCIÓN CONTROLADA
# ==========================================================

class OpenAIServiceException(Exception):

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
# SERVICIO OPENAI
# ==========================================================

class OpenAIService:
    """
    Centraliza toda comunicación con OpenAI.

    La API Key nunca es enviada al navegador.
    """

    def __init__(
        self,
        settings: Settings
    ):

        self.settings = (
            settings
        )

        self.client = None


        if (
            self.settings.openai_configured
        ):

            self.client = OpenAI(
                api_key=(
                    self.settings.openai_api_key
                )
            )


    # ======================================================
    # VALIDACIÓN
    # ======================================================

    def _ensure_client(
        self
    ):

        if (
            self.client is None
        ):

            raise OpenAIServiceException(
                (
                    "El servicio de Inteligencia Artificial "
                    "no está configurado."
                ),
                500
            )


    # ======================================================
    # RESPUESTA ESTRUCTURADA
    # ======================================================

    def create_structured_response(
        self,
        instructions: str,
        input_text: str,
        schema_name: str,
        schema: dict,
        max_output_tokens: int = 1500
    ) -> dict:

        self._ensure_client()


        try:

            response = (
                self.client.responses.create(
                    model=(
                        self.settings.text_model
                    ),

                    instructions=(
                        instructions
                    ),

                    input=(
                        input_text
                    ),

                    max_output_tokens=(
                        max_output_tokens
                    ),

                    store=False,

                    text={
                        "format": {
                            "type": "json_schema",
                            "name": schema_name,
                            "strict": True,
                            "schema": schema
                        }
                    }
                )
            )


            output_text = (
                response.output_text
            )


            if (
                not output_text
            ):

                raise OpenAIServiceException(
                    (
                        "La Inteligencia Artificial no "
                        "devolvió una respuesta válida."
                    ),
                    502
                )


            try:

                return json.loads(
                    output_text
                )

            except json.JSONDecodeError:

                raise OpenAIServiceException(
                    (
                        "La respuesta recibida no tiene "
                        "el formato esperado."
                    ),
                    502
                )


        # ==================================================
        # API KEY INVÁLIDA
        # ==================================================

        except AuthenticationError:

            raise OpenAIServiceException(
                (
                    "No fue posible autenticar el servicio "
                    "de Inteligencia Artificial."
                ),
                500
            )


        # ==================================================
        # LÍMITE
        # ==================================================

        except RateLimitError:

            raise OpenAIServiceException(
                (
                    "Se alcanzó temporalmente el límite "
                    "de uso de Inteligencia Artificial."
                ),
                429
            )


        # ==================================================
        # CONEXIÓN
        # ==================================================

        except APIConnectionError:

            raise OpenAIServiceException(
                (
                    "No fue posible conectar con el "
                    "servicio de Inteligencia Artificial."
                ),
                502
            )


        # ==================================================
        # SOLICITUD RECHAZADA
        # ==================================================

        except BadRequestError:

            raise OpenAIServiceException(
                (
                    "La solicitud fue rechazada por "
                    "el servicio de Inteligencia Artificial."
                ),
                502
            )


        # ==================================================
        # ERROR OPENAI
        # ==================================================

        except APIStatusError:

            raise OpenAIServiceException(
                (
                    "El servicio de Inteligencia Artificial "
                    "presentó un error temporal."
                ),
                502
            )


        # ==================================================
        # ERROR YA CONTROLADO
        # ==================================================

        except OpenAIServiceException:

            raise


        # ==================================================
        # OTRO ERROR
        # ==================================================

        except Exception:

            raise OpenAIServiceException(
                (
                    "Ocurrió un error inesperado durante "
                    "el procesamiento con Inteligencia Artificial."
                ),
                500
            )