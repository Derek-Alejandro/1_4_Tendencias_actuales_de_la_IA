from typing import Literal

from pydantic import (
    BaseModel,
    Field
)


# ==========================================================
# HISTORIAL DEL CHAT
# ==========================================================

class ChatHistoryItem(
    BaseModel
):

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
# PETICIÓN CHAT
# ==========================================================

class ChatRequest(
    BaseModel
):

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000
    )

    history: list[
        ChatHistoryItem
    ] = Field(
        default_factory=list
    )


# ==========================================================
# RESULTADO CHAT
# ==========================================================

class ChatResult(
    BaseModel
):

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
# RESPUESTA CHAT
# ==========================================================

class ChatApiResponse(
    BaseModel
):

    success: bool

    data: ChatResult


# ==========================================================
# PETICIÓN REALTIME WEBRTC
# ==========================================================

class RealtimeSessionRequest(
    BaseModel
):

    sdp: str = Field(
        ...,
        min_length=20,
        max_length=100000
    )