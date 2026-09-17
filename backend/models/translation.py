from typing import Literal

from pydantic import (
    BaseModel,
    Field
)


# ==========================================================
# CHAT - HISTORIAL
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
# CHAT - REQUEST
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
# CHAT - RESULTADO
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
# CHAT - API RESPONSE
# ==========================================================

class ChatApiResponse(
    BaseModel
):

    success: bool

    data: ChatResult


# ==========================================================
# REALTIME
# ==========================================================

class RealtimeSessionRequest(
    BaseModel
):

    sdp: str = Field(
        ...,
        min_length=20,
        max_length=100000
    )


# ==========================================================
# DOCUMENTOS - SECCIÓN
# ==========================================================

class DocumentSectionResult(
    BaseModel
):

    id: int

    title: str

    translated_title: str

    original_text: str

    translated_text: str


# ==========================================================
# DOCUMENTOS - RESULTADO
# ==========================================================

class DocumentResult(
    BaseModel
):

    file_name: str

    file_type: str

    file_size: int

    source_language: Literal[
        "es",
        "en"
    ]

    target_language: Literal[
        "es",
        "en"
    ]

    character_count: int

    section_count: int

    sections: list[
        DocumentSectionResult
    ]


# ==========================================================
# DOCUMENTOS - API RESPONSE
# ==========================================================

class DocumentApiResponse(
    BaseModel
):

    success: bool

    data: DocumentResult