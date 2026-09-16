import os
from dataclasses import dataclass


# ==========================================================
# UTILIDADES
# ==========================================================

def get_env_string(
    name: str,
    default: str = ""
) -> str:
    """
    Obtiene una variable de entorno de tipo texto.

    Si no existe o está vacía, devuelve el valor
    predeterminado.
    """

    value = os.getenv(
        name
    )

    if value is None:
        return default

    value = value.strip()

    if not value:
        return default

    return value


def get_env_int(
    name: str,
    default: int
) -> int:
    """
    Obtiene una variable de entorno numérica.

    Si no existe, está vacía o contiene un valor
    inválido, utiliza el valor predeterminado.
    """

    value = os.getenv(
        name
    )

    if value is None:
        return default

    value = value.strip()

    if not value:
        return default

    try:

        return int(
            value
        )

    except ValueError:

        return default


# ==========================================================
# CONFIGURACIÓN
# ==========================================================

@dataclass(frozen=True)
class Settings:
    """
    Configuración general de la aplicación.

    Las variables privadas se obtienen directamente
    del entorno donde se ejecuta el backend.

    En producción serán proporcionadas por Vercel.
    """

    # ======================================================
    # OPENAI
    # ======================================================

    openai_api_key: str = get_env_string(
        "OPENAI_API_KEY"
    )

    text_model: str = get_env_string(
        "OPENAI_TEXT_MODEL",
        "gpt-5.6-luna"
    )

    realtime_model: str = get_env_string(
        "OPENAI_REALTIME_MODEL",
        "gpt-realtime-2.1-mini"
    )

    image_model: str = get_env_string(
        "OPENAI_IMAGE_MODEL",
        "gpt-image-2.5-flare"
    )


    # ======================================================
    # LÍMITES
    # ======================================================

    max_image_size_mb: int = get_env_int(
        "MAX_IMAGE_SIZE_MB",
        10
    )

    max_document_size_mb: int = get_env_int(
        "MAX_DOCUMENT_SIZE_MB",
        10
    )

    max_audio_size_mb: int = get_env_int(
        "MAX_AUDIO_SIZE_MB",
        20
    )

    max_chat_characters: int = get_env_int(
        "MAX_CHAT_CHARACTERS",
        2000
    )


    # ======================================================
    # CORS
    # ======================================================

    @property
    def allowed_origins(
        self
    ) -> list[str]:

        origins = get_env_string(
            "ALLOWED_ORIGINS",
            (
                "http://127.0.0.1:5500,"
                "http://localhost:5500,"
                "https://derek-alejandro.github.io"
            )
        )

        return [
            origin.strip()
            for origin in origins.split(",")
            if origin.strip()
        ]


    # ======================================================
    # ESTADO DE OPENAI
    # ======================================================

    @property
    def openai_configured(
        self
    ) -> bool:

        return bool(
            self.openai_api_key
        )


# ==========================================================
# INSTANCIA GLOBAL
# ==========================================================

settings = Settings()