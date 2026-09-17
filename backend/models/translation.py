from typing import Literal

from pydantic import (
    BaseModel,
    Field
)


# ==========================================================
# CHAT
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
# DOCUMENTOS
# ==========================================================

class DocumentSectionResult(
    BaseModel
):

    id: int

    title: str

    translated_title: str

    original_text: str

    translated_text: str


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


class DocumentApiResponse(
    BaseModel
):

    success: bool

    data: DocumentResult


class DocumentDownloadSection(
    BaseModel
):

    translated_title: str = Field(
        default="",
        max_length=1000
    )

    translated_text: str = Field(
        ...,
        min_length=1,
        max_length=10000
    )


class DocumentDownloadRequest(
    BaseModel
):

    original_file_name: str = Field(
        ...,
        min_length=1,
        max_length=255
    )

    file_type: Literal[
        "txt",
        "docx",
        "pdf"
    ]

    target_language: Literal[
        "es",
        "en"
    ]

    sections: list[
        DocumentDownloadSection
    ] = Field(
        min_length=1
    )


# ==========================================================
# IMÁGENES - TEXTO INDIVIDUAL
# ==========================================================

class ImageTextItem(
    BaseModel
):

    original_text: str

    translated_text: str


# ==========================================================
# IMÁGENES - RESULTADO
# ==========================================================

class ImageAnalysisResult(
    BaseModel
):

    file_name: str

    source_language: Literal[
        "es",
        "en",
        "unknown"
    ]

    target_language: Literal[
        "es",
        "en",
        "unknown"
    ]

    has_readable_text: bool

    confidence: Literal[
        "high",
        "medium",
        "low"
    ]

    orientation: Literal[
        "landscape",
        "portrait",
        "square"
    ]

    detected_text: str

    translated_text: str

    visual_description: str

    text_items: list[
        ImageTextItem
    ]


# ==========================================================
# IMÁGENES - API RESPONSE
# ==========================================================

class ImageAnalysisApiResponse(
    BaseModel
):

    success: bool

    data: ImageAnalysisResult


# ==========================================================
# IMÁGENES - GENERAR VERSIÓN TRADUCIDA
# ==========================================================

class ImageGenerateRequest(
    BaseModel
):

    original_file_name: str = Field(
        ...,
        min_length=1,
        max_length=255
    )

    source_language: Literal[
        "es",
        "en"
    ]

    target_language: Literal[
        "es",
        "en"
    ]

    orientation: Literal[
        "landscape",
        "portrait",
        "square"
    ]

    translated_text: str = Field(
        ...,
        min_length=1,
        max_length=12000
    )

    visual_description: str = Field(
        ...,
        min_length=1,
        max_length=6000
    )

    text_items: list[
        ImageTextItem
    ] = Field(
        min_length=1
    )