import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    """
    Configuración general de la aplicación.

    Las variables privadas se obtienen directamente
    del entorno donde se ejecuta el backend.

    En producción serán proporcionadas por Vercel.
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

        return bool(
            self.openai_api_key
        )


settings = Settings()