import os
from dataclasses import dataclass
from dotenv import load_dotenv


# Permite utilizar un archivo .env durante desarrollo local.
# En Vercel se utilizarán directamente las Environment Variables.
load_dotenv()


@dataclass(frozen=True)
class Settings:
    """
    Configuración general de la aplicación.

    Centraliza variables de entorno para evitar tener valores
    distribuidos por diferentes archivos del proyecto.
    """

    openai_api_key: str = os.getenv(
        "OPENAI_API_KEY",
        ""
    )

    text_model: str = os.getenv(
        "OPENAI_TEXT_MODEL",
        "gpt-5.6-luna"
    )

    realtime_model: str = os.getenv(
        "OPENAI_REALTIME_MODEL",
        "gpt-realtime-2.1-mini"
    )

    image_model: str = os.getenv(
        "OPENAI_IMAGE_MODEL",
        "gpt-image-2.5-flare"
    )

    max_image_size_mb: int = int(
        os.getenv(
            "MAX_IMAGE_SIZE_MB",
            "10"
        )
    )

    max_document_size_mb: int = int(
        os.getenv(
            "MAX_DOCUMENT_SIZE_MB",
            "10"
        )
    )

    max_audio_size_mb: int = int(
        os.getenv(
            "MAX_AUDIO_SIZE_MB",
            "20"
        )
    )

    max_chat_characters: int = int(
        os.getenv(
            "MAX_CHAT_CHARACTERS",
            "2000"
        )
    )

    @property
    def allowed_origins(self) -> list[str]:
        """
        Devuelve los dominios autorizados para consumir
        el backend.
        """

        origins = os.getenv(
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

    @property
    def openai_configured(self) -> bool:
        """
        Indica si existe una API Key configurada.
        Nunca expone el valor de la clave.
        """

        return bool(
            self.openai_api_key
            and self.openai_api_key != "YOUR_OPENAI_API_KEY"
        )


settings = Settings()