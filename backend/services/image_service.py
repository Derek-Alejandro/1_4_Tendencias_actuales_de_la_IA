import base64
import json
import re

import httpx

from backend.core.settings import (
    Settings
)


# ==========================================================
# EXCEPCIÓN
# ==========================================================

class ImageServiceException(
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
# SERVICIO
# ==========================================================

class ImageService:

    OPENAI_RESPONSES_URL = (
        "https://api.openai.com/v1/responses"
    )


    OPENAI_IMAGES_URL = (
        "https://api.openai.com/v1/images/generations"
    )


    ALLOWED_MIME_TYPES = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }


    ALLOWED_EXTENSIONS = {
        "jpg",
        "jpeg",
        "png",
        "webp"
    }


    def __init__(
        self,
        settings: Settings
    ):

        self.settings = (
            settings
        )


    # ======================================================
    # ANALIZAR IMAGEN
    # ======================================================

    def analyze_image(
        self,
        file_name: str,
        content_type: str,
        file_bytes: bytes
    ) -> dict:

        self._validate_image(

            file_name=(
                file_name
            ),

            content_type=(
                content_type
            ),

            file_bytes=(
                file_bytes
            )

        )


        mime_type = (
            content_type
            .split(";")[0]
            .strip()
            .lower()
        )


        image_base64 = (
            base64
            .b64encode(
                file_bytes
            )
            .decode(
                "ascii"
            )
        )


        data_url = (
            f"data:{mime_type};"
            f"base64,{image_base64}"
        )


        schema = (
            self._analysis_schema()
        )


        instructions = """
You are a professional Spanish-English visual translator.

Analyze the supplied image carefully.

The image may be:
- a sign
- poster
- advertisement
- menu
- screenshot
- label
- flyer
- photographed document
- interface
- informational graphic

Your task:

1. Determine whether the image contains readable Spanish or English text.

2. Do NOT invent text that cannot be read.

3. If there is no readable Spanish or English text:
   - has_readable_text = false
   - source_language = "unknown"
   - target_language = "unknown"
   - detected_text = ""
   - translated_text = ""
   - text_items = []

4. If readable text exists:
   - determine the predominant source language
   - Spanish -> English
   - English -> Spanish

5. Transcribe all meaningful readable text.

6. Translate it naturally and completely.

7. Preserve:
   - names
   - prices
   - numbers
   - dates
   - URLs
   - product names
   - acronyms
   - units

8. text_items must contain useful original/translated pairs.

9. Describe the visual appearance of the image in visual_description:
   - general scene
   - background
   - dominant colors
   - placement of text
   - typography style
   - objects
   - visual hierarchy
   - approximate composition

10. orientation must be:
    landscape, portrait or square.

11. confidence describes confidence in reading the visible text.

Do not add explanations outside the required JSON.
""".strip()


        payload = {

            "model":
                self.settings.text_model,

            "instructions":
                instructions,

            "input": [

                {

                    "role":
                        "user",

                    "content": [

                        {

                            "type":
                                "input_text",

                            "text":
                                (
                                    "Analyze and translate "
                                    "the readable text in this image."
                                )

                        },

                        {

                            "type":
                                "input_image",

                            "image_url":
                                data_url,

                            "detail":
                                "high"

                        }

                    ]

                }

            ],

            "text": {

                "format": {

                    "type":
                        "json_schema",

                    "name":
                        "image_translation_analysis",

                    "strict":
                        True,

                    "schema":
                        schema

                }

            },

            "max_output_tokens":
                4000,

            "store":
                False

        }


        result = (
            self._post_json(
                self.OPENAI_RESPONSES_URL,
                payload,
                timeout=90.0
            )
        )


        output_text = (
            self._extract_response_text(
                result
            )
        )


        try:

            analysis = (
                json.loads(
                    output_text
                )
            )

        except json.JSONDecodeError as error:

            raise ImageServiceException(
                (
                    "La Inteligencia Artificial devolvió "
                    "un análisis de imagen inválido."
                ),
                502
            ) from error


        # ==================================================
        # VALIDACIÓN
        # ==================================================

        if (
            not isinstance(
                analysis,
                dict
            )
        ):

            raise ImageServiceException(
                (
                    "La respuesta del análisis "
                    "de imagen no es válida."
                ),
                502
            )


        analysis[
            "file_name"
        ] = (
            file_name
        )


        has_text = (
            bool(
                analysis.get(
                    "has_readable_text"
                )
            )
        )


        if (
            not has_text
        ):

            analysis[
                "source_language"
            ] = (
                "unknown"
            )


            analysis[
                "target_language"
            ] = (
                "unknown"
            )


            analysis[
                "detected_text"
            ] = (
                ""
            )


            analysis[
                "translated_text"
            ] = (
                ""
            )


            analysis[
                "text_items"
            ] = []


        return analysis


    # ======================================================
    # GENERAR IMAGEN TRADUCIDA
    # ======================================================

    def generate_translated_image(
        self,
        original_file_name: str,
        source_language: str,
        target_language: str,
        orientation: str,
        translated_text: str,
        visual_description: str,
        text_items: list[dict]
    ) -> tuple[str, str, bytes]:

        if (
            not translated_text.strip()
        ):

            raise ImageServiceException(
                (
                    "No existe texto traducido "
                    "para generar la imagen."
                ),
                400
            )


        if (
            source_language
            not in {
                "es",
                "en"
            }
        ):

            raise ImageServiceException(
                "Idioma de origen inválido.",
                400
            )


        if (
            target_language
            not in {
                "es",
                "en"
            }
        ):

            raise ImageServiceException(
                "Idioma de destino inválido.",
                400
            )


        size = (
            self._get_image_size(
                orientation
            )
        )


        replacements = []


        for item in text_items:

            original = (
                str(
                    item.get(
                        "original_text",
                        ""
                    )
                )
                .strip()
            )


            translated = (
                str(
                    item.get(
                        "translated_text",
                        ""
                    )
                )
                .strip()
            )


            if (
                original
                and
                translated
            ):

                replacements.append(
                    (
                        f'- Replace "{original}" '
                        f'with exactly "{translated}".'
                    )
                )


        replacements_text = (
            "\n".join(
                replacements
            )
        )


        prompt = f"""
Create a NEW image inspired closely by the supplied visual description.

This is a translated recreation of an existing image, not an exact pixel-for-pixel copy.

GOAL:
Preserve the overall visual composition, visual hierarchy, background style,
dominant colors, approximate positioning of text, typography mood and objects.

VISUAL DESCRIPTION:
{visual_description}

TEXT TRANSLATION RULES:

The target language is:
{target_language}

The image must use ONLY the translated language for readable textual content.

Exact translation:
{translated_text}

Specific replacements:
{replacements_text}

IMPORTANT REQUIREMENTS:

- Render the translated text clearly and legibly.
- Spell the translated text accurately.
- Do not reinsert the original-language text.
- Preserve numbers, prices, dates, brand names and proper nouns where appropriate.
- Keep the visual appearance appropriate to the source image.
- Preserve approximately the same text hierarchy:
  large headings should remain large,
  secondary text should remain secondary.
- Do not add unrelated text.
- Do not add watermarks.
- Do not add explanations around the image.
- Produce a polished, realistic visual recreation suitable for comparison
  with the original image.
""".strip()


        payload = {

            "model":
                self.settings.image_model,

            "prompt":
                prompt,

            "n":
                1,

            "size":
                size,

            "quality":
                "medium",

            "output_format":
                "jpeg",

            "output_compression":
                85,

            "background":
                "opaque"

        }


        result = (
            self._post_json(

                self.OPENAI_IMAGES_URL,

                payload,

                timeout=150.0

            )
        )


        data = (
            result.get(
                "data"
            )
        )


        if (
            not isinstance(
                data,
                list
            )
            or
            not data
        ):

            raise ImageServiceException(
                (
                    "OpenAI no devolvió "
                    "la imagen generada."
                ),
                502
            )


        image_base64 = (
            data[0]
            .get(
                "b64_json"
            )
        )


        if (
            not image_base64
        ):

            raise ImageServiceException(
                (
                    "La respuesta no contiene "
                    "la imagen generada."
                ),
                502
            )


        try:

            image_bytes = (
                base64
                .b64decode(
                    image_base64
                )
            )

        except Exception as error:

            raise ImageServiceException(
                (
                    "No fue posible reconstruir "
                    "la imagen generada."
                ),
                502
            ) from error


        if (
            not image_bytes
        ):

            raise ImageServiceException(
                (
                    "La imagen generada "
                    "está vacía."
                ),
                502
            )


        file_name = (
            self._build_generated_file_name(
                original_file_name
            )
        )


        return (
            file_name,
            "image/jpeg",
            image_bytes
        )


    # ======================================================
    # VALIDAR IMAGEN
    # ======================================================

    def _validate_image(
        self,
        file_name: str,
        content_type: str,
        file_bytes: bytes
    ):

        if (
            not file_bytes
        ):

            raise ImageServiceException(
                "La imagen está vacía.",
                400
            )


        extension = (
            self._get_extension(
                file_name
            )
        )


        if (
            extension
            not in self.ALLOWED_EXTENSIONS
        ):

            raise ImageServiceException(
                (
                    "Formato no permitido. "
                    "Utiliza JPG, PNG o WEBP."
                ),
                415
            )


        mime_type = (
            content_type
            .split(";")[0]
            .strip()
            .lower()
        )


        if (
            mime_type
            not in self.ALLOWED_MIME_TYPES
        ):

            raise ImageServiceException(
                (
                    "El tipo del archivo no corresponde "
                    "a una imagen JPG, PNG o WEBP válida."
                ),
                415
            )


        max_bytes = (

            self.settings
            .max_image_size_mb

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

            raise ImageServiceException(
                (
                    "La imagen supera el límite "
                    f"de {self.settings.max_image_size_mb} MB."
                ),
                413
            )


    # ======================================================
    # SCHEMA DEL ANÁLISIS
    # ======================================================

    @staticmethod
    def _analysis_schema() -> dict:

        return {

            "type":
                "object",

            "properties": {

                "source_language": {

                    "type":
                        "string",

                    "enum": [
                        "es",
                        "en",
                        "unknown"
                    ]

                },

                "target_language": {

                    "type":
                        "string",

                    "enum": [
                        "es",
                        "en",
                        "unknown"
                    ]

                },

                "has_readable_text": {

                    "type":
                        "boolean"

                },

                "confidence": {

                    "type":
                        "string",

                    "enum": [
                        "high",
                        "medium",
                        "low"
                    ]

                },

                "orientation": {

                    "type":
                        "string",

                    "enum": [
                        "landscape",
                        "portrait",
                        "square"
                    ]

                },

                "detected_text": {

                    "type":
                        "string"

                },

                "translated_text": {

                    "type":
                        "string"

                },

                "visual_description": {

                    "type":
                        "string"

                },

                "text_items": {

                    "type":
                        "array",

                    "items": {

                        "type":
                            "object",

                        "properties": {

                            "original_text": {

                                "type":
                                    "string"

                            },

                            "translated_text": {

                                "type":
                                    "string"

                            }

                        },

                        "required": [
                            "original_text",
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
                "has_readable_text",
                "confidence",
                "orientation",
                "detected_text",
                "translated_text",
                "visual_description",
                "text_items"

            ],

            "additionalProperties":
                False

        }


    # ======================================================
    # POST OPENAI
    # ======================================================

    def _post_json(
        self,
        url: str,
        payload: dict,
        timeout: float
    ) -> dict:

        if (
            not self.settings
            .openai_api_key
        ):

            raise ImageServiceException(
                (
                    "La API de OpenAI "
                    "no está configurada."
                ),
                500
            )


        headers = {

            "Authorization":
                (
                    "Bearer "
                    +
                    self.settings
                    .openai_api_key
                ),

            "Content-Type":
                "application/json"

        }


        try:

            with httpx.Client(
                timeout=timeout
            ) as client:

                response = (
                    client.post(

                        url,

                        headers=(
                            headers
                        ),

                        json=(
                            payload
                        )

                    )
                )


        except httpx.TimeoutException as error:

            raise ImageServiceException(
                (
                    "OpenAI tardó demasiado "
                    "en procesar la imagen."
                ),
                504
            ) from error


        except httpx.RequestError as error:

            raise ImageServiceException(
                (
                    "No fue posible conectar "
                    "con OpenAI."
                ),
                502
            ) from error


        if (
            response.status_code
            >=
            400
        ):

            self._raise_openai_error(
                response
            )


        try:

            return (
                response.json()
            )

        except ValueError as error:

            raise ImageServiceException(
                (
                    "OpenAI devolvió una "
                    "respuesta inválida."
                ),
                502
            ) from error


    # ======================================================
    # ERROR OPENAI
    # ======================================================

    @staticmethod
    def _raise_openai_error(
        response
    ):

        status_code = (
            response.status_code
        )


        if (
            status_code == 401
        ):

            raise ImageServiceException(
                (
                    "No fue posible autenticar "
                    "el servicio de Inteligencia Artificial."
                ),
                502
            )


        if (
            status_code == 403
        ):

            raise ImageServiceException(
                (
                    "El proyecto no tiene permisos "
                    "para utilizar este modelo."
                ),
                502
            )


        if (
            status_code == 429
        ):

            raise ImageServiceException(
                (
                    "Se alcanzó temporalmente el límite "
                    "de uso del servicio de IA."
                ),
                429
            )


        if (
            status_code == 400
        ):

            try:

                data = (
                    response.json()
                )


                detail = (
                    data
                    .get(
                        "error",
                        {}
                    )
                    .get(
                        "message",
                        ""
                    )
                )


            except Exception:

                detail = ""


            if (
                detail
            ):

                raise ImageServiceException(
                    (
                        "OpenAI rechazó la solicitud "
                        f"de imagen. Detalle: {detail}"
                    ),
                    400
                )


        raise ImageServiceException(
            (
                "OpenAI no pudo completar "
                "el procesamiento de la imagen."
            ),
            502
        )


    # ======================================================
    # EXTRAER OUTPUT TEXT
    # ======================================================

    @staticmethod
    def _extract_response_text(
        result: dict
    ) -> str:

        output = (
            result.get(
                "output",
                []
            )
        )


        for item in output:

            if (
                item.get(
                    "type"
                )
                !=
                "message"
            ):

                continue


            for content in item.get(
                "content",
                []
            ):

                if (
                    content.get(
                        "type"
                    )
                    ==
                    "output_text"
                ):

                    text = (
                        content.get(
                            "text",
                            ""
                        )
                    )


                    if (
                        text
                    ):

                        return text


        raise ImageServiceException(
            (
                "OpenAI no devolvió "
                "el análisis de la imagen."
            ),
            502
        )


    # ======================================================
    # TAMAÑO DE GENERACIÓN
    # ======================================================

    @staticmethod
    def _get_image_size(
        orientation: str
    ) -> str:

        if (
            orientation == "landscape"
        ):

            return (
                "1536x1024"
            )


        if (
            orientation == "portrait"
        ):

            return (
                "1024x1536"
            )


        return (
            "1024x1024"
        )


    # ======================================================
    # EXTENSIÓN
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
    # NOMBRE IMAGEN GENERADA
    # ======================================================

    @staticmethod
    def _build_generated_file_name(
        original_file_name: str
    ) -> str:

        file_name = (
            original_file_name
            or
            "imagen"
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
            or
            "imagen"
        )


        return (
            f"{base_name}_traducida.jpg"
        )