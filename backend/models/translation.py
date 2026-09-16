from typing import Literal

from pydantic import BaseModel, Field


# ==========================================================
# HISTORIAL
# ==========================================================

class ChatHistoryItem(BaseModel):
    """
    Representa un intercambio anterior de la conversación.
    """

    user_original: str = Field(
        ...,
        min_length=1,
        max_length=2000
    )

    assistant_original: str = Field(
        ...,
        min_length=1,
        max_length=5000
    )

    source_language: Literal[
        "es",
        "en"
    ]


# ==========================================================
# PETICIÓN
# ==========================================================

class ChatRequest(BaseModel):
    """
    Información enviada desde el frontend.
    """

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000
    )

    history: list[ChatHistoryItem] = Field(
        default_factory=list
    )


# ==========================================================
# RESULTADO
# ==========================================================

class ChatResult(BaseModel):

    source_language: Literal[
        "es",
        "en"
    ]

    target_language: Literal[
        "es",
        "en"
    ]

    original_message: str

    translated_message: str

    assistant_response: str

    assistant_response_translation: str


# ==========================================================
# RESPUESTA HTTP
# ==========================================================

class ChatApiResponse(BaseModel):

    success: bool

    data: ChatResult