import html
import io
import json
import re

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

from pypdf import PdfReader

from reportlab.lib import colors
from reportlab.lib.enums import (
    TA_CENTER
)
from reportlab.lib.pagesizes import (
    LETTER
)
from reportlab.lib.styles import (
    ParagraphStyle,
    getSampleStyleSheet
)
from reportlab.lib.units import (
    inch
)
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer
)

from backend.core.settings import (
    Settings
)

from backend.services.openai_service import (
    OpenAIService
)


# ==========================================================
# EXCEPCIÓN
# ==========================================================

class DocumentServiceException(
    Exception
):

    def __init__(
        self,
        user_message: str,
        status_code: int = 400
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
# SERVICIO DE DOCUMENTOS
# ==========================================================

class DocumentService:

    ALLOWED_EXTENSIONS = {
        "pdf",
        "docx",
        "txt"
    }


    ALLOWED_MIME_TYPES = {

        "pdf": {
            "application/pdf"
        },

        "docx": {
            (
                "application/"
                "vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
            "application/octet-stream"
        },

        "txt": {
            "text/plain",
            "application/octet-stream"
        }

    }


    MAX_EXTRACTED_CHARACTERS = (
        30000
    )


    MAX_SECTION_CHARACTERS = (
        6000
    )


    def __init__(
        self,
        settings: Settings,
        openai_service: OpenAIService
    ):

        self.settings = (
            settings
        )

        self.openai_service = (
            openai_service
        )


    # ======================================================
    # TRADUCIR DOCUMENTO
    # ======================================================

    def translate_document(
        self,
        file_name: str,
        content_type: str,
        file_bytes: bytes
    ) -> dict:

        extension = (
            self._get_extension(
                file_name
            )
        )


        # ==================================================
        # VALIDAR
        # ==================================================

        self._validate_file(

            extension=extension,

            content_type=content_type,

            file_bytes=file_bytes

        )


        # ==================================================
        # EXTRAER CONTENIDO
        # ==================================================

        if (
            extension == "pdf"
        ):

            sections = (
                self._extract_pdf(
                    file_bytes
                )
            )


        elif (
            extension == "docx"
        ):

            sections = (
                self._extract_docx(
                    file_bytes
                )
            )


        elif (
            extension == "txt"
        ):

            sections = (
                self._extract_txt(
                    file_bytes
                )
            )


        else:

            raise DocumentServiceException(
                "Formato de documento no permitido.",
                415
            )


        # ==================================================
        # VALIDAR CONTENIDO
        # ==================================================

        if (
            not sections
        ):

            raise DocumentServiceException(
                (
                    "No fue posible encontrar texto "
                    "legible dentro del documento."
                ),
                400
            )


        character_count = sum(

            len(
                section["text"]
            )

            for section
            in sections

        )


        if (
            character_count <= 0
        ):

            raise DocumentServiceException(
                (
                    "El documento no contiene "
                    "texto para traducir."
                ),
                400
            )


        if (
            character_count >
            self.MAX_EXTRACTED_CHARACTERS
        ):

            raise DocumentServiceException(
                (
                    "El documento contiene demasiado "
                    "texto para procesarlo en una sola "
                    "solicitud. Utiliza un documento "
                    "más corto."
                ),
                413
            )


        # ==================================================
        # TRADUCIR CON OPENAI
        # ==================================================

        ai_result = (
            self._translate_sections(
                sections
            )
        )


        translations = (
            ai_result.get(
                "translations",
                []
            )
        )


        translated_items = {

            item["id"]:
                item

            for item
            in translations

            if "id" in item

        }


        # ==================================================
        # COMBINAR
        # ==================================================

        final_sections = []


        for section in sections:

            section_id = (
                section["id"]
            )


            translated = (
                translated_items.get(
                    section_id
                )
            )


            if (
                translated is None
            ):

                raise DocumentServiceException(
                    (
                        "La Inteligencia Artificial no "
                        "devolvió todas las secciones "
                        "del documento."
                    ),
                    502
                )


            translated_title = (
                str(
                    translated.get(
                        "translated_title",
                        ""
                    )
                )
                .strip()
            )


            translated_text = (
                str(
                    translated.get(
                        "translated_text",
                        ""
                    )
                )
                .strip()
            )


            if (
                not translated_text
            ):

                raise DocumentServiceException(
                    (
                        "La Inteligencia Artificial devolvió "
                        "una sección traducida sin contenido."
                    ),
                    502
                )


            final_sections.append({

                "id":
                    section_id,

                "title":
                    section["title"],

                "translated_title":
                    translated_title,

                "original_text":
                    section["text"],

                "translated_text":
                    translated_text

            })


        # ==================================================
        # RESULTADO
        # ==================================================

        return {

            "file_name":
                file_name,

            "file_type":
                extension.upper(),

            "file_size":
                len(
                    file_bytes
                ),

            "source_language":
                ai_result[
                    "source_language"
                ],

            "target_language":
                ai_result[
                    "target_language"
                ],

            "character_count":
                character_count,

            "section_count":
                len(
                    final_sections
                ),

            "sections":
                final_sections

        }


    # ======================================================
    # GENERAR ARCHIVO TRADUCIDO
    # ======================================================

    def generate_translated_file(
        self,
        original_file_name: str,
        extension: str,
        target_language: str,
        sections: list[dict]
    ) -> tuple[str, str, bytes]:

        extension = (
            extension
            .lower()
            .strip()
        )


        if (
            extension
            not in self.ALLOWED_EXTENSIONS
        ):

            raise DocumentServiceException(
                (
                    "El formato solicitado para "
                    "la descarga no está permitido."
                ),
                400
            )


        if (
            target_language
            not in {
                "es",
                "en"
            }
        ):

            raise DocumentServiceException(
                (
                    "El idioma de destino "
                    "no es válido."
                ),
                400
            )


        if (
            not sections
        ):

            raise DocumentServiceException(
                (
                    "No existen secciones traducidas "
                    "para generar el archivo."
                ),
                400
            )


        # ==================================================
        # NOMBRE
        # ==================================================

        download_name = (
            self._build_download_file_name(

                original_file_name,

                extension

            )
        )


        # ==================================================
        # TXT
        # ==================================================

        if (
            extension == "txt"
        ):

            generated_bytes = (
                self._build_txt_file(
                    sections
                )
            )


            mime_type = (
                "text/plain; charset=utf-8"
            )


        # ==================================================
        # DOCX
        # ==================================================

        elif (
            extension == "docx"
        ):

            generated_bytes = (
                self._build_docx_file(

                    original_file_name=(
                        original_file_name
                    ),

                    target_language=(
                        target_language
                    ),

                    sections=(
                        sections
                    )

                )
            )


            mime_type = (
                "application/"
                "vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            )


        # ==================================================
        # PDF
        # ==================================================

        else:

            generated_bytes = (
                self._build_pdf_file(

                    original_file_name=(
                        original_file_name
                    ),

                    target_language=(
                        target_language
                    ),

                    sections=(
                        sections
                    )

                )
            )


            mime_type = (
                "application/pdf"
            )


        if (
            not generated_bytes
        ):

            raise DocumentServiceException(
                (
                    "No fue posible construir "
                    "el archivo traducido."
                ),
                500
            )


        return (
            download_name,
            mime_type,
            generated_bytes
        )


    # ======================================================
    # VALIDAR ARCHIVO DE ENTRADA
    # ======================================================

    def _validate_file(
        self,
        extension: str,
        content_type: str,
        file_bytes: bytes
    ):

        if (
            not file_bytes
        ):

            raise DocumentServiceException(
                "El archivo recibido está vacío.",
                400
            )


        if (
            extension
            not in self.ALLOWED_EXTENSIONS
        ):

            raise DocumentServiceException(
                (
                    "Formato no permitido. "
                    "Utiliza PDF, DOCX o TXT."
                ),
                415
            )


        max_bytes = (

            self.settings
            .max_document_size_mb

            *
            1024

            *
            1024

        )


        if (
            len(
                file_bytes
            )
            >
            max_bytes
        ):

            raise DocumentServiceException(
                (
                    "El documento supera el límite "
                    f"de "
                    f"{self.settings.max_document_size_mb} MB."
                ),
                413
            )


        clean_content_type = (

            content_type
            .split(";")[0]
            .strip()
            .lower()

        )


        allowed_types = (
            self.ALLOWED_MIME_TYPES[
                extension
            ]
        )


        if (
            clean_content_type
            and
            clean_content_type
            not in allowed_types
        ):

            raise DocumentServiceException(
                (
                    "El tipo de archivo recibido "
                    "no coincide con el formato permitido."
                ),
                415
            )


    # ======================================================
    # OBTENER EXTENSIÓN
    # ======================================================

    @staticmethod
    def _get_extension(
        file_name: str
    ) -> str:

        if (
            not file_name
            or
            "." not in file_name
        ):

            return ""


        return (

            file_name
            .rsplit(
                ".",
                1
            )[1]
            .lower()
            .strip()

        )


    # ======================================================
    # EXTRAER PDF
    # ======================================================

    def _extract_pdf(
        self,
        file_bytes: bytes
    ) -> list[dict]:

        try:

            reader = (
                PdfReader(
                    io.BytesIO(
                        file_bytes
                    )
                )
            )

        except Exception as error:

            raise DocumentServiceException(
                (
                    "No fue posible leer el PDF. "
                    "El archivo puede estar dañado."
                ),
                400
            ) from error


        # ==================================================
        # PDF CIFRADO
        # ==================================================

        if (
            reader.is_encrypted
        ):

            try:

                result = (
                    reader.decrypt(
                        ""
                    )
                )


                if (
                    result == 0
                ):

                    raise DocumentServiceException(
                        (
                            "El PDF está protegido "
                            "con contraseña."
                        ),
                        400
                    )

            except DocumentServiceException:

                raise

            except Exception as error:

                raise DocumentServiceException(
                    (
                        "No es posible procesar "
                        "un PDF protegido."
                    ),
                    400
                ) from error


        sections = []


        # ==================================================
        # PÁGINAS
        # ==================================================

        for page_number, page in enumerate(
            reader.pages,
            start=1
        ):

            try:

                extracted_text = (
                    page.extract_text()
                    or ""
                )

            except Exception:

                extracted_text = ""


            text = (
                self._clean_text(
                    extracted_text
                )
            )


            if (
                not text
            ):

                continue


            pieces = (
                self._split_large_text(
                    text
                )
            )


            for part_number, piece in enumerate(
                pieces,
                start=1
            ):

                title = (
                    f"Página {page_number}"
                )


                if (
                    len(
                        pieces
                    )
                    >
                    1
                ):

                    title += (
                        f" · Parte {part_number}"
                    )


                sections.append({

                    "id":
                        len(
                            sections
                        )
                        +
                        1,

                    "title":
                        title,

                    "text":
                        piece

                })


        return sections


    # ======================================================
    # EXTRAER DOCX
    # ======================================================

    def _extract_docx(
        self,
        file_bytes: bytes
    ) -> list[dict]:

        try:

            document = (
                Document(
                    io.BytesIO(
                        file_bytes
                    )
                )
            )

        except Exception as error:

            raise DocumentServiceException(
                (
                    "No fue posible leer el archivo DOCX. "
                    "El documento puede estar dañado."
                ),
                400
            ) from error


        raw_sections = []


        current_title = (
            "Contenido"
        )


        current_paragraphs = []


        # ==================================================
        # PÁRRAFOS
        # ==================================================

        for paragraph in document.paragraphs:

            text = (
                self._clean_text(
                    paragraph.text
                )
            )


            if (
                not text
            ):

                continue


            style_name = ""


            try:

                if (
                    paragraph.style
                ):

                    style_name = (
                        paragraph.style.name
                        or ""
                    )

            except Exception:

                style_name = ""


            is_heading = (
                style_name
                .lower()
                .startswith(
                    "heading"
                )
            )


            if (
                is_heading
            ):

                if (
                    current_paragraphs
                ):

                    raw_sections.append({

                        "title":
                            current_title,

                        "text":
                            "\n\n".join(
                                current_paragraphs
                            )

                    })


                    current_paragraphs = []


                current_title = (
                    text
                )

            else:

                current_paragraphs.append(
                    text
                )


        if (
            current_paragraphs
        ):

            raw_sections.append({

                "title":
                    current_title,

                "text":
                    "\n\n".join(
                        current_paragraphs
                    )

            })


        # ==================================================
        # TABLAS
        # ==================================================

        for table_number, table in enumerate(
            document.tables,
            start=1
        ):

            rows = []


            for row in table.rows:

                cells = []


                for cell in row.cells:

                    cell_text = (
                        self._clean_text(
                            cell.text
                        )
                    )


                    cells.append(
                        cell_text
                    )


                if (
                    any(
                        cells
                    )
                ):

                    rows.append(
                        " | ".join(
                            cells
                        )
                    )


            if (
                rows
            ):

                raw_sections.append({

                    "title":
                        f"Tabla {table_number}",

                    "text":
                        "\n".join(
                            rows
                        )

                })


        return (
            self._normalize_sections(
                raw_sections
            )
        )


    # ======================================================
    # EXTRAER TXT
    # ======================================================

    def _extract_txt(
        self,
        file_bytes: bytes
    ) -> list[dict]:

        text = None


        encodings = [
            "utf-8-sig",
            "utf-8",
            "latin-1"
        ]


        for encoding in encodings:

            try:

                text = (
                    file_bytes
                    .decode(
                        encoding
                    )
                )


                break

            except UnicodeDecodeError:

                continue


        if (
            text is None
        ):

            raise DocumentServiceException(
                (
                    "No fue posible determinar "
                    "la codificación del archivo TXT."
                ),
                400
            )


        text = (
            self._clean_text(
                text
            )
        )


        if (
            not text
        ):

            return []


        blocks = re.split(
            r"\n\s*\n",
            text
        )


        raw_sections = []


        for number, block in enumerate(
            blocks,
            start=1
        ):

            block = (
                self._clean_text(
                    block
                )
            )


            if (
                not block
            ):

                continue


            raw_sections.append({

                "title":
                    f"Sección {number}",

                "text":
                    block

            })


        return (
            self._normalize_sections(
                raw_sections
            )
        )


    # ======================================================
    # NORMALIZAR SECCIONES
    # ======================================================

    def _normalize_sections(
        self,
        raw_sections: list[dict]
    ) -> list[dict]:

        sections = []


        for raw_section in raw_sections:

            title = (
                str(
                    raw_section.get(
                        "title",
                        "Sección"
                    )
                )
                .strip()
            )


            if (
                not title
            ):

                title = (
                    "Sección"
                )


            text = (
                self._clean_text(

                    str(
                        raw_section.get(
                            "text",
                            ""
                        )
                    )

                )
            )


            if (
                not text
            ):

                continue


            pieces = (
                self._split_large_text(
                    text
                )
            )


            for part_number, piece in enumerate(
                pieces,
                start=1
            ):

                final_title = (
                    title
                )


                if (
                    len(
                        pieces
                    )
                    >
                    1
                ):

                    final_title += (
                        f" · Parte {part_number}"
                    )


                sections.append({

                    "id":
                        len(
                            sections
                        )
                        +
                        1,

                    "title":
                        final_title,

                    "text":
                        piece

                })


        return sections


    # ======================================================
    # DIVIDIR TEXTO GRANDE
    # ======================================================

    def _split_large_text(
        self,
        text: str
    ) -> list[str]:

        if (
            len(
                text
            )
            <=
            self.MAX_SECTION_CHARACTERS
        ):

            return [
                text
            ]


        paragraphs = re.split(
            r"\n+",
            text
        )


        chunks = []


        current = []


        current_length = 0


        for paragraph in paragraphs:

            paragraph = (
                paragraph.strip()
            )


            if (
                not paragraph
            ):

                continue


            paragraph_length = (
                len(
                    paragraph
                )
            )


            # ==============================================
            # PÁRRAFO MUY LARGO
            # ==============================================

            if (
                paragraph_length
                >
                self.MAX_SECTION_CHARACTERS
            ):

                if (
                    current
                ):

                    chunks.append(
                        "\n".join(
                            current
                        )
                    )


                    current = []


                    current_length = 0


                for start in range(
                    0,
                    paragraph_length,
                    self.MAX_SECTION_CHARACTERS
                ):

                    chunks.append(

                        paragraph[
                            start:
                            start
                            +
                            self.MAX_SECTION_CHARACTERS
                        ]

                    )


                continue


            # ==============================================
            # CERRAR CHUNK
            # ==============================================

            projected_length = (

                current_length
                +
                paragraph_length
                +
                (
                    1
                    if current
                    else 0
                )

            )


            if (
                current
                and
                projected_length
                >
                self.MAX_SECTION_CHARACTERS
            ):

                chunks.append(
                    "\n".join(
                        current
                    )
                )


                current = [
                    paragraph
                ]


                current_length = (
                    paragraph_length
                )

            else:

                current.append(
                    paragraph
                )


                current_length = (
                    projected_length
                )


        if (
            current
        ):

            chunks.append(
                "\n".join(
                    current
                )
            )


        return chunks


    # ======================================================
    # LIMPIAR TEXTO
    # ======================================================

    @staticmethod
    def _clean_text(
        text: str
    ) -> str:

        if (
            not text
        ):

            return ""


        text = (
            text.replace(
                "\x00",
                ""
            )
        )


        text = re.sub(
            r"[ \t]+",
            " ",
            text
        )


        text = re.sub(
            r"\r\n?",
            "\n",
            text
        )


        text = re.sub(
            r"\n{3,}",
            "\n\n",
            text
        )


        return (
            text.strip()
        )


    # ======================================================
    # SCHEMA OPENAI
    # ======================================================

    @staticmethod
    def _translation_schema() -> dict:

        return {

            "type":
                "object",

            "properties": {

                "source_language": {

                    "type":
                        "string",

                    "enum": [
                        "es",
                        "en"
                    ]

                },

                "target_language": {

                    "type":
                        "string",

                    "enum": [
                        "es",
                        "en"
                    ]

                },

                "translations": {

                    "type":
                        "array",

                    "items": {

                        "type":
                            "object",

                        "properties": {

                            "id": {
                                "type":
                                    "integer"
                            },

                            "translated_title": {
                                "type":
                                    "string"
                            },

                            "translated_text": {
                                "type":
                                    "string"
                            }

                        },

                        "required": [
                            "id",
                            "translated_title",
                            "translated_text"
                        ],

                        "additionalProperties":
                            False

                    }

                }

            },

            "required": [
                "source_language",
                "target_language",
                "translations"
            ],

            "additionalProperties":
                False

        }


    # ======================================================
    # TRADUCIR CON OPENAI
    # ======================================================

    def _translate_sections(
        self,
        sections: list[dict]
    ) -> dict:

        instructions = """
You are a professional Spanish-English document translator.

You will receive structured document sections.

RULES:

1. Detect the predominant language of the document.

2. Only these source languages are valid:
   Spanish = es
   English = en

3. If the source language is Spanish:
   target_language must be "en".

4. If the source language is English:
   target_language must be "es".

5. Translate EVERY section completely.

6. Do not summarize.

7. Do not omit information.

8. Preserve names, numbers, dates, URLs, email addresses,
   currencies, units, acronyms and technical terms.

9. Preserve paragraph breaks whenever possible.

10. Translate section titles naturally.

11. Preserve table rows and separators when present.

12. Return exactly one translation entry for every input id.

13. Never invent content not present in the document.

14. Prefer natural professional translations over literal
    word-for-word translations.
""".strip()


        input_payload = {

            "sections": [

                {

                    "id":
                        section["id"],

                    "title":
                        section["title"],

                    "text":
                        section["text"]

                }

                for section
                in sections

            ]

        }


        result = (

            self.openai_service
            .create_structured_response(

                instructions=(
                    instructions
                ),

                input_text=(
                    json.dumps(
                        input_payload,
                        ensure_ascii=False
                    )
                ),

                schema_name=(
                    "translated_document"
                ),

                schema=(
                    self._translation_schema()
                ),

                max_output_tokens=(
                    12000
                )

            )

        )


        source_language = (
            result.get(
                "source_language"
            )
        )


        target_language = (
            result.get(
                "target_language"
            )
        )


        if (
            source_language
            not in {
                "es",
                "en"
            }
        ):

            raise DocumentServiceException(
                (
                    "No fue posible determinar "
                    "correctamente el idioma del documento."
                ),
                502
            )


        if (
            target_language
            not in {
                "es",
                "en"
            }
        ):

            raise DocumentServiceException(
                (
                    "La Inteligencia Artificial devolvió "
                    "un idioma de destino inválido."
                ),
                502
            )


        if (
            source_language == "es"
            and
            target_language != "en"
        ):

            raise DocumentServiceException(
                (
                    "La traducción devolvió una "
                    "dirección de idioma inválida."
                ),
                502
            )


        if (
            source_language == "en"
            and
            target_language != "es"
        ):

            raise DocumentServiceException(
                (
                    "La traducción devolvió una "
                    "dirección de idioma inválida."
                ),
                502
            )


        if (
            not isinstance(
                result.get(
                    "translations"
                ),
                list
            )
        ):

            raise DocumentServiceException(
                (
                    "La Inteligencia Artificial devolvió "
                    "un resultado de traducción inválido."
                ),
                502
            )


        return result


    # ======================================================
    # NOMBRE DEL ARCHIVO TRADUCIDO
    # ======================================================

    @staticmethod
    def _build_download_file_name(
        original_file_name: str,
        extension: str
    ) -> str:

        file_name = (
            str(
                original_file_name
                or
                "documento"
            )
        )


        if (
            "." in file_name
        ):

            base_name = (
                file_name
                .rsplit(
                    ".",
                    1
                )[0]
            )

        else:

            base_name = (
                file_name
            )


        base_name = re.sub(
            r'[\\/:*?"<>|]',
            "_",
            base_name
        )


        base_name = (
            base_name.strip()
        )


        if (
            not base_name
        ):

            base_name = (
                "documento"
            )


        return (
            f"{base_name}_traducido.{extension}"
        )


    # ======================================================
    # CONSTRUIR TXT
    # ======================================================

    def _build_txt_file(
        self,
        sections: list[dict]
    ) -> bytes:

        parts = []


        for section in sections:

            title = (
                str(
                    section.get(
                        "translated_title",
                        ""
                    )
                )
                .strip()
            )


            text = (
                str(
                    section.get(
                        "translated_text",
                        ""
                    )
                )
                .strip()
            )


            if (
                title
            ):

                parts.append(
                    title
                )


            if (
                text
            ):

                parts.append(
                    text
                )


        content = (
            "\n\n".join(
                parts
            )
            .strip()
        )


        if (
            not content
        ):

            raise DocumentServiceException(
                (
                    "No existe contenido traducido "
                    "para generar el TXT."
                ),
                400
            )


        # UTF-8 BOM para mejor compatibilidad en Windows.

        return (
            "\ufeff"
            +
            content
            +
            "\n"
        ).encode(
            "utf-8"
        )


    # ======================================================
    # CONSTRUIR DOCX REAL
    # ======================================================

    def _build_docx_file(
        self,
        original_file_name: str,
        target_language: str,
        sections: list[dict]
    ) -> bytes:

        document = (
            Document()
        )


        # ==================================================
        # METADATOS
        # ==================================================

        document.core_properties.title = (
            f"Traducción de {original_file_name}"
        )


        document.core_properties.subject = (
            "Documento traducido con Inteligencia Artificial"
        )


        document.core_properties.author = (
            "Traductor Inteligente Multimodal"
        )


        # ==================================================
        # ESTILO NORMAL
        # ==================================================

        normal_style = (
            document.styles[
                "Normal"
            ]
        )


        normal_style.font.name = (
            "Arial"
        )


        normal_style.font.size = (
            Pt(
                11
            )
        )


        # ==================================================
        # TÍTULO
        # ==================================================

        title = (
            document.add_heading(
                "Documento traducido",
                level=0
            )
        )


        title.alignment = (
            WD_ALIGN_PARAGRAPH.CENTER
        )


        # ==================================================
        # INFORMACIÓN
        # ==================================================

        info = (
            document.add_paragraph()
        )


        original_run = (
            info.add_run(
                "Archivo original: "
            )
        )


        original_run.bold = (
            True
        )


        info.add_run(
            original_file_name
        )


        info.add_run(
            "\n"
        )


        language_run = (
            info.add_run(
                "Idioma de destino: "
            )
        )


        language_run.bold = (
            True
        )


        target_label = (

            "English"

            if target_language == "en"

            else "Español"

        )


        info.add_run(
            target_label
        )


        document.add_paragraph(
            ""
        )


        # ==================================================
        # SECCIONES
        # ==================================================

        for section in sections:

            translated_title = (
                str(
                    section.get(
                        "translated_title",
                        ""
                    )
                )
                .strip()
            )


            translated_text = (
                str(
                    section.get(
                        "translated_text",
                        ""
                    )
                )
                .strip()
            )


            if (
                translated_title
            ):

                document.add_heading(
                    translated_title,
                    level=1
                )


            if (
                not translated_text
            ):

                continue


            blocks = re.split(
                r"\n\s*\n",
                translated_text
            )


            for block in blocks:

                block = (
                    block.strip()
                )


                if (
                    not block
                ):

                    continue


                paragraph = (
                    document.add_paragraph()
                )


                lines = (
                    block.splitlines()
                )


                for line_index, line in enumerate(
                    lines
                ):

                    if (
                        line_index > 0
                    ):

                        break_run = (
                            paragraph.add_run()
                        )


                        break_run.add_break()


                    paragraph.add_run(
                        line
                    )


        # ==================================================
        # NOTA FINAL
        # ==================================================

        document.add_paragraph(
            ""
        )


        footer = (
            document.add_paragraph()
        )


        footer_run = (
            footer.add_run(
                (
                    "Traducción generada mediante "
                    "Inteligencia Artificial."
                )
            )
        )


        footer_run.italic = (
            True
        )


        footer_run.font.size = (
            Pt(
                8
            )
        )


        # ==================================================
        # GUARDAR EN MEMORIA
        # ==================================================

        buffer = (
            io.BytesIO()
        )


        document.save(
            buffer
        )


        buffer.seek(
            0
        )


        return (
            buffer.getvalue()
        )


    # ======================================================
    # CONSTRUIR PDF REAL
    # ======================================================

    def _build_pdf_file(
        self,
        original_file_name: str,
        target_language: str,
        sections: list[dict]
    ) -> bytes:

        buffer = (
            io.BytesIO()
        )


        document = (
            SimpleDocTemplate(

                buffer,

                pagesize=(
                    LETTER
                ),

                rightMargin=(
                    0.7
                    *
                    inch
                ),

                leftMargin=(
                    0.7
                    *
                    inch
                ),

                topMargin=(
                    0.7
                    *
                    inch
                ),

                bottomMargin=(
                    0.7
                    *
                    inch
                ),

                title=(
                    f"Traducción de {original_file_name}"
                ),

                author=(
                    "Traductor Inteligente Multimodal"
                )

            )
        )


        styles = (
            getSampleStyleSheet()
        )


        # ==================================================
        # ESTILO TÍTULO
        # ==================================================

        title_style = (
            ParagraphStyle(

                "TranslatedDocumentTitle",

                parent=(
                    styles[
                        "Title"
                    ]
                ),

                fontName=(
                    "Helvetica-Bold"
                ),

                fontSize=(
                    20
                ),

                leading=(
                    24
                ),

                alignment=(
                    TA_CENTER
                ),

                textColor=(
                    colors.HexColor(
                        "#172033"
                    )
                ),

                spaceAfter=(
                    14
                )

            )
        )


        # ==================================================
        # INFORMACIÓN
        # ==================================================

        info_style = (
            ParagraphStyle(

                "TranslatedDocumentInfo",

                parent=(
                    styles[
                        "Normal"
                    ]
                ),

                fontName=(
                    "Helvetica"
                ),

                fontSize=(
                    9
                ),

                leading=(
                    13
                ),

                textColor=(
                    colors.HexColor(
                        "#64748B"
                    )
                ),

                spaceAfter=(
                    18
                )

            )
        )


        # ==================================================
        # HEADING
        # ==================================================

        heading_style = (
            ParagraphStyle(

                "TranslatedDocumentHeading",

                parent=(
                    styles[
                        "Heading1"
                    ]
                ),

                fontName=(
                    "Helvetica-Bold"
                ),

                fontSize=(
                    14
                ),

                leading=(
                    18
                ),

                textColor=(
                    colors.HexColor(
                        "#1D4ED8"
                    )
                ),

                spaceBefore=(
                    8
                ),

                spaceAfter=(
                    7
                )

            )
        )


        # ==================================================
        # BODY
        # ==================================================

        body_style = (
            ParagraphStyle(

                "TranslatedDocumentBody",

                parent=(
                    styles[
                        "BodyText"
                    ]
                ),

                fontName=(
                    "Helvetica"
                ),

                fontSize=(
                    10.5
                ),

                leading=(
                    16
                ),

                textColor=(
                    colors.HexColor(
                        "#334155"
                    )
                ),

                spaceAfter=(
                    9
                )

            )
        )


        story = []


        # ==================================================
        # TÍTULO
        # ==================================================

        story.append(

            Paragraph(
                "Documento traducido",
                title_style
            )

        )


        target_label = (

            "English"

            if target_language == "en"

            else "Español"

        )


        safe_original_name = (
            self._pdf_markup_text(
                original_file_name
            )
        )


        safe_target_label = (
            self._pdf_markup_text(
                target_label
            )
        )


        information = (

            "<b>Archivo original:</b> "
            +
            safe_original_name
            +
            "<br/>"
            +
            "<b>Idioma de destino:</b> "
            +
            safe_target_label

        )


        story.append(

            Paragraph(
                information,
                info_style
            )

        )


        story.append(
            Spacer(
                1,
                5
            )
        )


        # ==================================================
        # SECCIONES
        # ==================================================

        for section in sections:

            translated_title = (
                str(
                    section.get(
                        "translated_title",
                        ""
                    )
                )
                .strip()
            )


            translated_text = (
                str(
                    section.get(
                        "translated_text",
                        ""
                    )
                )
                .strip()
            )


            if (
                translated_title
            ):

                story.append(

                    Paragraph(

                        self._pdf_markup_text(
                            translated_title
                        ),

                        heading_style

                    )

                )


            if (
                not translated_text
            ):

                continue


            blocks = re.split(
                r"\n\s*\n",
                translated_text
            )


            for block in blocks:

                block = (
                    block.strip()
                )


                if (
                    not block
                ):

                    continue


                story.append(

                    Paragraph(

                        self._pdf_markup_text(
                            block
                        ),

                        body_style

                    )

                )


            story.append(
                Spacer(
                    1,
                    6
                )
            )


        # ==================================================
        # GENERAR
        # ==================================================

        try:

            document.build(

                story,

                onFirstPage=(
                    self._draw_pdf_footer
                ),

                onLaterPages=(
                    self._draw_pdf_footer
                )

            )

        except Exception as error:

            raise DocumentServiceException(
                (
                    "No fue posible construir "
                    "el archivo PDF traducido."
                ),
                500
            ) from error


        buffer.seek(
            0
        )


        return (
            buffer.getvalue()
        )


    # ======================================================
    # TEXTO SEGURO PARA PDF
    # ======================================================

    @staticmethod
    def _pdf_markup_text(
        value: str
    ) -> str:

        text = (
            str(
                value
                or ""
            )
        )


        # Helvetica de ReportLab soporta
        # Windows-1252. Sustituimos símbolos
        # externos para impedir errores.

        text = (
            text
            .encode(
                "cp1252",
                errors="replace"
            )
            .decode(
                "cp1252"
            )
        )


        text = (
            html.escape(
                text
            )
        )


        text = (
            text.replace(
                "\n",
                "<br/>"
            )
        )


        return text


    # ======================================================
    # FOOTER PDF
    # ======================================================

    @staticmethod
    def _draw_pdf_footer(
        canvas,
        document
    ):

        canvas.saveState()


        page_width, _ = (
            LETTER
        )


        canvas.setStrokeColor(

            colors.HexColor(
                "#E2E8F0"
            )

        )


        canvas.line(

            0.7
            *
            inch,

            0.53
            *
            inch,

            page_width
            -
            0.7
            *
            inch,

            0.53
            *
            inch

        )


        canvas.setFont(
            "Helvetica",
            7.5
        )


        canvas.setFillColor(

            colors.HexColor(
                "#64748B"
            )

        )


        canvas.drawString(

            0.7
            *
            inch,

            0.35
            *
            inch,

            "Traductor Inteligente Multimodal"

        )


        page_number = (
            getattr(
                document,
                "page",
                1
            )
        )


        canvas.drawRightString(

            page_width
            -
            0.7
            *
            inch,

            0.35
            *
            inch,

            f"Página {page_number}"

        )


        canvas.restoreState()