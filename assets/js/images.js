class ImagesModule {

    constructor({
        apiBaseUrl,
        dropZone,
        input,
        selectButton,
        previewContainer,
        preview,
        removeButton,
        analyzeButton,
        translationResult,
        generateButton,
        generatedResult,
        generatedImage,
        downloadButton,
        showToast
    }) {

        this.apiBaseUrl =
            apiBaseUrl;

        this.dropZone =
            dropZone;

        this.input =
            input;

        this.selectButton =
            selectButton;

        this.previewContainer =
            previewContainer;

        this.preview =
            preview;

        this.removeButton =
            removeButton;

        this.analyzeButton =
            analyzeButton;

        this.translationResult =
            translationResult;

        this.generateButton =
            generateButton;

        this.generatedResult =
            generatedResult;

        this.generatedImage =
            generatedImage;

        this.downloadButton =
            downloadButton;

        this.showToast =
            showToast;


        this.allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];


        this.maxSizeMB =
            4;


        this.selectedFile =
            null;


        this.previewUrl =
            null;


        this.generatedUrl =
            null;


        this.generatedFileName =
            null;


        this.lastAnalysis =
            null;


        this.analyzing =
            false;


        this.generating =
            false;


        this.bindEvents();

    }


    // =====================================================
    // EVENTOS
    // =====================================================

    bindEvents() {

        // =================================================
        // SELECCIONAR IMAGEN
        // =================================================

        this.selectButton.addEventListener(
            "click",
            () => {

                if (
                    this.analyzing
                    ||
                    this.generating
                ) {

                    return;

                }


                this.input.click();

            }
        );


        // =================================================
        // INPUT
        // =================================================

        this.input.addEventListener(
            "change",
            () => {

                const file =
                    this.input
                        .files?.[0];


                if (
                    file
                ) {

                    this.processImage(
                        file
                    );

                }

            }
        );


        // =================================================
        // ELIMINAR
        // =================================================

        this.removeButton.addEventListener(
            "click",
            () => {

                this.removeImage();

            }
        );


        // =================================================
        // ANALIZAR
        // =================================================

        this.analyzeButton.addEventListener(
            "click",
            async () => {

                await this.analyzeImage();

            }
        );


        // =================================================
        // GENERAR
        // =================================================

        this.generateButton.addEventListener(
            "click",
            async () => {

                await this.generateImage();

            }
        );


        // =================================================
        // DESCARGAR
        // =================================================

        this.downloadButton.addEventListener(
            "click",
            () => {

                this.downloadGeneratedImage();

            }
        );


        // =================================================
        // DRAG ENTER / OVER
        // =================================================

        [
            "dragenter",
            "dragover"
        ].forEach(
            eventName => {

                this.dropZone.addEventListener(
                    eventName,
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        if (
                            !this.analyzing
                            &&
                            !this.generating
                        ) {

                            this.dropZone
                                .classList
                                .add(
                                    "dragover"
                                );

                        }

                    }
                );

            }
        );


        // =================================================
        // DRAG LEAVE / DROP
        // =================================================

        [
            "dragleave",
            "drop"
        ].forEach(
            eventName => {

                this.dropZone.addEventListener(
                    eventName,
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        this.dropZone
                            .classList
                            .remove(
                                "dragover"
                            );

                    }
                );

            }
        );


        // =================================================
        // DROP
        // =================================================

        this.dropZone.addEventListener(
            "drop",
            event => {

                if (
                    this.analyzing
                    ||
                    this.generating
                ) {

                    return;

                }


                const file =
                    event
                        .dataTransfer
                        ?.files?.[0];


                if (
                    file
                ) {

                    this.processImage(
                        file
                    );

                }

            }
        );

    }


    // =====================================================
    // PROCESAR IMAGEN
    // =====================================================

    processImage(
        file
    ) {

        // =================================================
        // VALIDAR FORMATO
        // =================================================

        if (
            !this.allowedTypes
                .includes(
                    file.type
                )
        ) {

            this.input.value =
                "";


            this.showToast(

                "Formato no permitido",

                (
                    "Selecciona una imagen " +
                    "JPG, PNG o WEBP."
                ),

                "danger"

            );


            return;

        }


        // =================================================
        // VALIDAR TAMAÑO
        // =================================================

        const maximumBytes =
            this.maxSizeMB
            *
            1024
            *
            1024;


        if (
            file.size >
            maximumBytes
        ) {

            this.input.value =
                "";


            this.showToast(

                "Imagen demasiado grande",

                (
                    `La imagen no debe superar ` +
                    `${this.maxSizeMB} MB.`
                ),

                "danger"

            );


            return;

        }


        // =================================================
        // LIMPIAR ESTADO ANTERIOR
        // =================================================

        this.releasePreview();

        this.releaseGeneratedImage();


        this.selectedFile =
            file;


        this.lastAnalysis =
            null;


        this.generatedFileName =
            null;


        // =================================================
        // PREVIEW
        // =================================================

        this.previewUrl =
            URL.createObjectURL(
                file
            );


        this.preview.src =
            this.previewUrl;


        this.preview.alt =
            (
                "Vista previa de " +
                file.name
            );


        // =================================================
        // UI
        // =================================================

        this.dropZone
            .classList
            .add(
                "d-none"
            );


        this.previewContainer
            .classList
            .remove(
                "d-none"
            );


        this.analyzeButton.disabled =
            false;


        this.generateButton.disabled =
            true;


        this.generatedResult
            .classList
            .add(
                "d-none"
            );


        this.resetTranslationResult();


        this.showToast(

            "Imagen seleccionada",

            (
                "La imagen está lista " +
                "para ser analizada."
            ),

            "success"

        );

    }


    // =====================================================
    // ANALIZAR IMAGEN
    // =====================================================

    async analyzeImage() {

        if (
            this.analyzing
            ||
            !this.selectedFile
        ) {

            return;

        }


        this.analyzing =
            true;


        this.lastAnalysis =
            null;


        this.generateButton.disabled =
            true;


        const previousButton =
            this.analyzeButton.innerHTML;


        this.analyzeButton.disabled =
            true;


        this.analyzeButton.innerHTML = `

            <span
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
            ></span>

            Analizando imagen...

        `;


        this.renderAnalysisLoading();


        const formData =
            new FormData();


        formData.append(

            "file",

            this.selectedFile,

            this.selectedFile.name

        );


        try {

            const response =
                await fetch(

                    (
                        `${this.apiBaseUrl}` +
                        `/api/image/analyze`
                    ),

                    {

                        method:
                            "POST",

                        body:
                            formData

                    }

                );


            let result;


            try {

                result =
                    await response.json();

            }

            catch {

                throw new Error(
                    (
                        "El servidor devolvió " +
                        "una respuesta inválida."
                    )
                );

            }


            if (
                !response.ok
            ) {

                throw new Error(

                    result?.detail
                    ||
                    (
                        "No fue posible analizar " +
                        "la imagen."
                    )

                );

            }


            if (
                !result?.success
                ||
                !result?.data
            ) {

                throw new Error(
                    (
                        "La respuesta del análisis " +
                        "está incompleta."
                    )
                );

            }


            // =============================================
            // GUARDAR ANÁLISIS
            // =============================================

            this.lastAnalysis =
                result.data;


            // =============================================
            // MOSTRAR
            // =============================================

            this.renderAnalysis(
                result.data
            );


            // =============================================
            // HABILITAR GENERACIÓN
            // =============================================

            if (
                result.data
                    .has_readable_text
            ) {

                this.generateButton.disabled =
                    false;


                this.showToast(

                    "Imagen traducida",

                    (
                        "Se detectó y tradujo " +
                        "el texto de la imagen."
                    ),

                    "success"

                );

            }

            else {

                this.generateButton.disabled =
                    true;


                this.showToast(

                    "Sin texto legible",

                    (
                        "La imagen no contiene " +
                        "texto legible en español " +
                        "o inglés."
                    ),

                    "warning"

                );

            }

        }

        catch (
            error
        ) {

            console.error(
                "Error analizando imagen:",
                error
            );


            this.lastAnalysis =
                null;


            const message = (

                error instanceof Error

                    ? error.message

                    : (
                        "No fue posible " +
                        "analizar la imagen."
                    )

            );


            this.renderError(
                message
            );


            this.showToast(

                "Error de imagen",

                message,

                "danger"

            );

        }

        finally {

            this.analyzing =
                false;


            this.analyzeButton.disabled =
                !this.selectedFile;


            this.analyzeButton.innerHTML =
                previousButton;

        }

    }


    // =====================================================
    // LOADING
    // =====================================================

    renderAnalysisLoading() {

        this.translationResult.innerHTML = `

            <div class="image-analysis-loading">

                <div
                    class="spinner-border text-primary"
                    role="status"
                >

                    <span class="visually-hidden">
                        Analizando...
                    </span>

                </div>


                <h3>
                    Interpretando imagen
                </h3>


                <p>
                    Detectando texto, idioma,
                    contexto visual y traducción.
                </p>

            </div>

        `;

    }


    // =====================================================
    // RESULTADO
    // =====================================================

    renderAnalysis(
        data
    ) {

        this.translationResult.innerHTML =
            "";


        // =================================================
        // SIN TEXTO
        // =================================================

        if (
            !data.has_readable_text
        ) {

            this.translationResult.innerHTML = `

                <div class="image-no-text-state">

                    <div class="image-no-text-icon">

                        <i class="bi bi-eye-slash"></i>

                    </div>


                    <h3>
                        No se encontró texto legible
                    </h3>


                    <p>
                        Prueba con una imagen más nítida
                        o con texto visible en español
                        o inglés.
                    </p>

                </div>

            `;


            return;

        }


        const source =
            this.getLanguageLabel(
                data.source_language
            );


        const target =
            this.getLanguageLabel(
                data.target_language
            );


        // =================================================
        // RESUMEN
        // =================================================

        const summary =
            document.createElement(
                "div"
            );


        summary.className =
            "image-analysis-summary";


        summary.innerHTML = `

            <div class="image-analysis-success">

                <i class="bi bi-check-circle-fill"></i>

                Texto identificado

            </div>


            <div class="image-analysis-languages">

                <span>

                    ${source.flag}

                    <strong>
                        ${source.name}
                    </strong>

                </span>


                <i class="bi bi-arrow-right"></i>


                <span>

                    ${target.flag}

                    <strong>
                        ${target.name}
                    </strong>

                </span>

            </div>


            <div class="image-confidence">

                Confianza:

                <strong>
                    ${this.getConfidenceLabel(
                        data.confidence
                    )}
                </strong>

            </div>

        `;


        this.translationResult
            .appendChild(
                summary
            );


        // =================================================
        // COMPARACIÓN
        // =================================================

        const comparison =
            document.createElement(
                "div"
            );


        comparison.className =
            "image-text-comparison";


        // =================================================
        // ORIGINAL
        // =================================================

        const original =
            document.createElement(
                "div"
            );


        original.className =
            "image-text-card";


        const originalHeader =
            document.createElement(
                "div"
            );


        originalHeader.className =
            "image-text-card-header";


        originalHeader.textContent =
            (
                `${source.flag} ` +
                `Texto original`
            );


        const originalText =
            document.createElement(
                "div"
            );


        originalText.className =
            "image-detected-text";


        originalText.textContent =
            data.detected_text
            ||
            "";


        original.append(
            originalHeader,
            originalText
        );


        // =================================================
        // TRADUCCIÓN
        // =================================================

        const translated =
            document.createElement(
                "div"
            );


        translated.className =
            (
                "image-text-card " +
                "translated"
            );


        const translatedHeader =
            document.createElement(
                "div"
            );


        translatedHeader.className =
            "image-text-card-header";


        translatedHeader.textContent =
            (
                `${target.flag} ` +
                `Traducción`
            );


        const translatedText =
            document.createElement(
                "div"
            );


        translatedText.className =
            "image-detected-text";


        translatedText.textContent =
            data.translated_text
            ||
            "";


        translated.append(
            translatedHeader,
            translatedText
        );


        comparison.append(
            original,
            translated
        );


        this.translationResult
            .appendChild(
                comparison
            );


        // =================================================
        // FRAGMENTOS
        // =================================================

        if (
            Array.isArray(
                data.text_items
            )
            &&
            data.text_items.length
        ) {

            const items =
                document.createElement(
                    "div"
                );


            items.className =
                "image-text-items";


            const heading =
                document.createElement(
                    "h3"
                );


            heading.textContent =
                "Fragmentos identificados";


            items.appendChild(
                heading
            );


            data.text_items.forEach(
                item => {

                    const row =
                        document.createElement(
                            "div"
                        );


                    row.className =
                        "image-text-item";


                    const left =
                        document.createElement(
                            "span"
                        );


                    left.textContent =
                        item.original_text
                        ||
                        "";


                    const arrow =
                        document.createElement(
                            "i"
                        );


                    arrow.className =
                        "bi bi-arrow-right";


                    const right =
                        document.createElement(
                            "strong"
                        );


                    right.textContent =
                        item.translated_text
                        ||
                        "";


                    row.append(
                        left,
                        arrow,
                        right
                    );


                    items.appendChild(
                        row
                    );

                }
            );


            this.translationResult
                .appendChild(
                    items
                );

        }

    }


    // =====================================================
    // GENERAR IMAGEN TRADUCIDA
    // =====================================================

    async generateImage() {

        if (
            this.generating
            ||
            !this.lastAnalysis
            ||
            !this.lastAnalysis
                .has_readable_text
        ) {

            return;

        }


        this.generating =
            true;


        const previousButton =
            this.generateButton.innerHTML;


        this.generateButton.disabled =
            true;


        this.generateButton.innerHTML = `

            <span
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
            ></span>

            Generando imagen...

        `;


        try {

            const payload = {

                original_file_name:
                    this.lastAnalysis
                        .file_name,

                source_language:
                    this.lastAnalysis
                        .source_language,

                target_language:
                    this.lastAnalysis
                        .target_language,

                orientation:
                    this.lastAnalysis
                        .orientation,

                translated_text:
                    this.lastAnalysis
                        .translated_text,

                visual_description:
                    this.lastAnalysis
                        .visual_description,

                text_items:
                    this.lastAnalysis
                        .text_items

            };


            const response =
                await fetch(

                    (
                        `${this.apiBaseUrl}` +
                        `/api/image/generate`
                    ),

                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify(
                                payload
                            )

                    }

                );


            // =============================================
            // ERROR
            // =============================================

            if (
                !response.ok
            ) {

                let message =
                    (
                        "No fue posible generar " +
                        "la imagen traducida."
                    );


                const type =
                    (
                        response.headers
                            .get(
                                "content-type"
                            )
                        ||
                        ""
                    );


                if (
                    type.includes(
                        "application/json"
                    )
                ) {

                    try {

                        const result =
                            await response.json();


                        message =
                            (
                                result?.detail
                                ||
                                message
                            );

                    }

                    catch {

                        // Mantener mensaje.

                    }

                }


                throw new Error(
                    message
                );

            }


            // =============================================
            // BLOB
            // =============================================

            const blob =
                await response.blob();


            if (
                !blob.size
            ) {

                throw new Error(
                    (
                        "El servidor devolvió " +
                        "una imagen vacía."
                    )
                );

            }


            // =============================================
            // LIMPIAR IMAGEN ANTERIOR
            // =============================================

            this.releaseGeneratedImage();


            // =============================================
            // URL
            // =============================================

            this.generatedUrl =
                URL.createObjectURL(
                    blob
                );


            this.generatedFileName =
                this.getDownloadFileName(
                    response
                );


            // =============================================
            // MOSTRAR
            // =============================================

            this.generatedImage.src =
                this.generatedUrl;


            this.generatedResult
                .classList
                .remove(
                    "d-none"
                );


            this.generatedResult
                .scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });


            this.showToast(

                "Imagen generada",

                (
                    "Se creó una nueva versión " +
                    "visual con la traducción."
                ),

                "success"

            );

        }

        catch (
            error
        ) {

            console.error(
                "Error generando imagen:",
                error
            );


            const message = (

                error instanceof Error

                    ? error.message

                    : (
                        "No fue posible generar " +
                        "la imagen traducida."
                    )

            );


            this.showToast(

                "Error de generación",

                message,

                "danger"

            );

        }

        finally {

            this.generating =
                false;


            this.generateButton.disabled =
                (
                    !this.lastAnalysis
                    ||
                    !this.lastAnalysis
                        .has_readable_text
                );


            this.generateButton.innerHTML =
                previousButton;

        }

    }


    // =====================================================
    // DESCARGAR IMAGEN
    // =====================================================

    downloadGeneratedImage() {

        if (
            !this.generatedUrl
        ) {

            this.showToast(

                "Imagen no disponible",

                (
                    "Primero genera una " +
                    "imagen traducida."
                ),

                "warning"

            );


            return;

        }


        const link =
            document.createElement(
                "a"
            );


        link.href =
            this.generatedUrl;


        link.download =
            (
                this.generatedFileName
                ||
                "imagen_traducida.jpg"
            );


        link.style.display =
            "none";


        document.body
            .appendChild(
                link
            );


        link.click();


        link.remove();


        this.showToast(

            "Descarga iniciada",

            (
                "La imagen traducida " +
                "se está descargando."
            ),

            "success"

        );

    }


    // =====================================================
    // ELIMINAR IMAGEN
    // =====================================================

    removeImage() {

        if (
            this.analyzing
            ||
            this.generating
        ) {

            return;

        }


        this.selectedFile =
            null;


        this.lastAnalysis =
            null;


        this.input.value =
            "";


        this.generatedFileName =
            null;


        this.releasePreview();

        this.releaseGeneratedImage();


        this.preview
            .removeAttribute(
                "src"
            );


        this.generatedImage
            .removeAttribute(
                "src"
            );


        this.previewContainer
            .classList
            .add(
                "d-none"
            );


        this.dropZone
            .classList
            .remove(
                "d-none"
            );


        this.generatedResult
            .classList
            .add(
                "d-none"
            );


        this.analyzeButton.disabled =
            true;


        this.generateButton.disabled =
            true;


        this.resetTranslationResult();


        this.showToast(

            "Imagen eliminada",

            (
                "La imagen seleccionada " +
                "fue retirada."
            ),

            "info"

        );

    }


    // =====================================================
    // ESTADO VACÍO
    // =====================================================

    resetTranslationResult() {

        this.translationResult.innerHTML = `

            <div class="image-result-empty">

                <i class="bi bi-textarea-t"></i>

                <h3>
                    Análisis visual
                </h3>

                <p>
                    Selecciona una imagen para detectar
                    y traducir su contenido textual.
                </p>

            </div>

        `;

    }


    // =====================================================
    // ERROR VISUAL
    // =====================================================

    renderError(
        message
    ) {

        this.translationResult.innerHTML =
            "";


        const container =
            document.createElement(
                "div"
            );


        container.className =
            "image-no-text-state";


        const icon =
            document.createElement(
                "div"
            );


        icon.className =
            "image-no-text-icon error";


        icon.innerHTML =
            (
                '<i class="bi ' +
                'bi-exclamation-triangle"></i>'
            );


        const title =
            document.createElement(
                "h3"
            );


        title.textContent =
            "No fue posible analizar la imagen";


        const paragraph =
            document.createElement(
                "p"
            );


        paragraph.textContent =
            message;


        container.append(
            icon,
            title,
            paragraph
        );


        this.translationResult
            .appendChild(
                container
            );

    }


    // =====================================================
    // OBTENER NOMBRE DE DESCARGA
    // =====================================================

    getDownloadFileName(
        response
    ) {

        const disposition =
            response.headers.get(
                "Content-Disposition"
            );


        // =================================================
        // CONTENT-DISPOSITION UTF-8
        // =================================================

        if (
            disposition
        ) {

            const utf8Match =
                disposition.match(
                    /filename\*=UTF-8''([^;]+)/i
                );


            if (
                utf8Match?.[1]
            ) {

                try {

                    return decodeURIComponent(

                        utf8Match[1]
                            .replace(
                                /^['"]|['"]$/g,
                                ""
                            )
                            .trim()

                    );

                }

                catch {

                    // Fallback posterior.

                }

            }


            // =============================================
            // FILENAME NORMAL
            // =============================================

            const normalMatch =
                disposition.match(
                    /filename="?([^";]+)"?/i
                );


            if (
                normalMatch?.[1]
            ) {

                return (
                    normalMatch[1]
                        .trim()
                );

            }

        }


        // =================================================
        // FALLBACK
        // =================================================

        const original =
            (
                this.lastAnalysis
                    ?.file_name
                ||
                "imagen"
            );


        const lastDot =
            original.lastIndexOf(
                "."
            );


        const base = (

            lastDot > 0

                ? original.substring(
                    0,
                    lastDot
                )

                : original

        );


        const safeBase =
            (
                base
                    .replace(
                        /[\\/:*?"<>|]/g,
                        "_"
                    )
                    .trim()
                ||
                "imagen"
            );


        return (
            `${safeBase}_traducida.jpg`
        );

    }


    // =====================================================
    // IDIOMAS
    // =====================================================

    getLanguageLabel(
        language
    ) {

        if (
            language === "es"
        ) {

            return {

                name:
                    "Español",

                flag:
                    "🇲🇽"

            };

        }


        if (
            language === "en"
        ) {

            return {

                name:
                    "English",

                flag:
                    "🇺🇸"

            };

        }


        return {

            name:
                "Desconocido",

            flag:
                "🌐"

        };

    }


    // =====================================================
    // CONFIANZA
    // =====================================================

    getConfidenceLabel(
        confidence
    ) {

        switch (
            confidence
        ) {

            case "high":

                return "Alta";


            case "medium":

                return "Media";


            default:

                return "Baja";

        }

    }


    // =====================================================
    // LIBERAR PREVIEW
    // =====================================================

    releasePreview() {

        if (
            this.previewUrl
        ) {

            URL.revokeObjectURL(
                this.previewUrl
            );


            this.previewUrl =
                null;

        }

    }


    // =====================================================
    // LIBERAR IMAGEN GENERADA
    // =====================================================

    releaseGeneratedImage() {

        if (
            this.generatedUrl
        ) {

            URL.revokeObjectURL(
                this.generatedUrl
            );


            this.generatedUrl =
                null;

        }

    }


    // =====================================================
    // DESTRUIR
    // =====================================================

    destroy() {

        this.releasePreview();

        this.releaseGeneratedImage();

    }

}


// =========================================================
// EXPORTACIÓN
// =========================================================

export {
    ImagesModule
};