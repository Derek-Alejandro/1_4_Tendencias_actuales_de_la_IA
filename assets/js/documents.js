// =========================================================
// MÓDULO DE DOCUMENTOS
// =========================================================

export class DocumentsModule {

    constructor({
        apiBaseUrl,
        dropZone,
        input,
        selectButton,
        selectedContainer,
        fileName,
        fileSize,
        removeButton,
        translateButton,
        resultContainer,
        showToast
    }) {

        // =================================================
        // CONFIGURACIÓN
        // =================================================

        this.apiBaseUrl =
            apiBaseUrl;


        this.dropZone =
            dropZone;


        this.input =
            input;


        this.selectButton =
            selectButton;


        this.selectedContainer =
            selectedContainer;


        this.fileName =
            fileName;


        this.fileSize =
            fileSize;


        this.removeButton =
            removeButton;


        this.translateButton =
            translateButton;


        this.resultContainer =
            resultContainer;


        this.showToast =
            showToast;


        // =================================================
        // RESTRICCIONES
        // =================================================

        this.maxSizeMB =
            4;


        this.allowedExtensions = [

            "pdf",
            "docx",
            "txt"

        ];


        // =================================================
        // ESTADO
        // =================================================

        this.selectedFile =
            null;


        this.processing =
            false;


        this.lastResult =
            null;


        // =================================================
        // EVENTOS
        // =================================================

        this.bindEvents();

    }


    // =====================================================
    // EVENTOS
    // =====================================================

    bindEvents() {

        // =================================================
        // SELECCIONAR ARCHIVO
        // =================================================

        this.selectButton.addEventListener(
            "click",
            () => {

                if (
                    this.processing
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

                    this.processSelectedFile(
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

                this.removeFile();

            }
        );


        // =================================================
        // TRADUCIR
        // =================================================

        this.translateButton.addEventListener(
            "click",
            async () => {

                await this.translateDocument();

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
                            !this.processing
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
                    this.processing
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

                    this.processSelectedFile(
                        file
                    );

                }

            }
        );

    }


    // =====================================================
    // PROCESAR ARCHIVO
    // =====================================================

    processSelectedFile(
        file
    ) {

        const extension =
            this.getFileExtension(
                file.name
            );


        // =================================================
        // VALIDAR EXTENSIÓN
        // =================================================

        if (
            !this.allowedExtensions
                .includes(
                    extension
                )
        ) {

            this.input.value =
                "";


            this.showToast(

                "Formato no permitido",

                (
                    "Selecciona un archivo " +
                    "PDF, DOCX o TXT."
                ),

                "danger"

            );


            return;

        }


        // =================================================
        // VALIDAR TAMAÑO
        // =================================================

        if (
            !this.validateFileSize(
                file
            )
        ) {

            this.input.value =
                "";


            this.showToast(

                "Archivo demasiado grande",

                (
                    "El documento no debe superar " +
                    `${this.maxSizeMB} MB.`
                ),

                "danger"

            );


            return;

        }


        // =================================================
        // GUARDAR
        // =================================================

        this.selectedFile =
            file;


        this.lastResult =
            null;


        // =================================================
        // INFORMACIÓN
        // =================================================

        this.fileName.textContent =
            file.name;


        this.fileSize.textContent =
            this.formatFileSize(
                file.size
            );


        // =================================================
        // UI
        // =================================================

        this.selectedContainer
            .classList
            .remove(
                "d-none"
            );


        this.translateButton.disabled =
            false;


        this.resetResult();


        this.showToast(

            "Documento seleccionado",

            (
                "El archivo está listo para " +
                "ser traducido."
            ),

            "success"

        );

    }


    // =====================================================
    // TRADUCIR DOCUMENTO
    // =====================================================

    async translateDocument() {

        if (
            this.processing
        ) {

            return;

        }


        if (
            !this.selectedFile
        ) {

            this.showToast(

                "Archivo no seleccionado",

                (
                    "Selecciona un documento " +
                    "antes de traducir."
                ),

                "warning"

            );


            return;

        }


        // =================================================
        // ESTADO
        // =================================================

        this.processing =
            true;


        this.lastResult =
            null;


        this.setLoadingState();


        // =================================================
        // FORMDATA
        // =================================================

        const formData =
            new FormData();


        formData.append(

            "file",

            this.selectedFile,

            this.selectedFile.name

        );


        try {

            // =============================================
            // BACKEND
            // =============================================

            const response =
                await fetch(

                    (
                        `${this.apiBaseUrl}` +
                        `/api/document`
                    ),

                    {

                        method:
                            "POST",

                        body:
                            formData

                    }

                );


            // =============================================
            // RESPUESTA
            // =============================================

            let result;


            try {

                result =
                    await response.json();

            }

            catch {

                throw new Error(
                    (
                        "El servidor devolvió una " +
                        "respuesta no válida."
                    )
                );

            }


            // =============================================
            // ERROR HTTP
            // =============================================

            if (
                !response.ok
            ) {

                throw new Error(
                    (
                        result?.detail ||
                        (
                            "No fue posible traducir " +
                            "el documento."
                        )
                    )
                );

            }


            // =============================================
            // VALIDAR RESPUESTA
            // =============================================

            if (
                !result?.success ||
                !result?.data ||
                !Array.isArray(
                    result.data.sections
                )
            ) {

                throw new Error(
                    (
                        "La respuesta del servidor " +
                        "está incompleta."
                    )
                );

            }


            // =============================================
            // GUARDAR RESULTADO
            // =============================================

            this.lastResult =
                result.data;


            // =============================================
            // MOSTRAR
            // =============================================

            this.renderResult(
                result.data
            );


            this.showToast(

                "Documento traducido",

                (
                    "La traducción se generó " +
                    "correctamente."
                ),

                "success"

            );

        }

        catch (
            error
        ) {

            console.error(
                "Error al traducir documento:",
                error
            );


            this.lastResult =
                null;


            const message =
                (
                    error instanceof Error
                        ? error.message
                        : (
                            "No fue posible procesar " +
                            "el documento."
                        )
                );


            this.renderError(
                message
            );


            this.showToast(

                "Error de documento",

                message,

                "danger"

            );

        }

        finally {

            this.processing =
                false;


            this.restoreButtonState();

        }

    }


    // =====================================================
    // ESTADO DE CARGA
    // =====================================================

    setLoadingState() {

        this.translateButton.disabled =
            true;


        this.selectButton.disabled =
            true;


        this.removeButton.disabled =
            true;


        this.translateButton.innerHTML = `

            <span
                class="spinner-border spinner-border-sm me-2"
                aria-hidden="true"
            ></span>

            Traduciendo...

        `;


        this.resultContainer.innerHTML = `

            <div class="document-processing">

                <div class="document-processing-animation">

                    <div
                        class="spinner-border text-primary"
                        role="status"
                    >

                        <span class="visually-hidden">
                            Procesando documento...
                        </span>

                    </div>

                </div>


                <h3>
                    Traduciendo documento
                </h3>


                <p>
                    Estamos extrayendo el contenido,
                    detectando el idioma y generando
                    una traducción natural con
                    Inteligencia Artificial.
                </p>


                <div class="document-processing-steps">

                    <span>
                        <i class="bi bi-file-earmark-text"></i>
                        Extracción
                    </span>


                    <i class="bi bi-chevron-right"></i>


                    <span>
                        <i class="bi bi-translate"></i>
                        Traducción
                    </span>


                    <i class="bi bi-chevron-right"></i>


                    <span>
                        <i class="bi bi-check2-circle"></i>
                        Resultado
                    </span>

                </div>

            </div>

        `;

    }


    // =====================================================
    // RESTAURAR BOTONES
    // =====================================================

    restoreButtonState() {

        this.selectButton.disabled =
            false;


        this.removeButton.disabled =
            false;


        this.translateButton.disabled =
            !this.selectedFile;


        this.translateButton.innerHTML = `

            <i class="bi bi-translate"></i>

            Traducir documento

        `;

    }


    // =====================================================
    // MOSTRAR RESULTADO
    // =====================================================

    renderResult(
        data
    ) {

        this.resultContainer.innerHTML =
            "";


        // =================================================
        // IDIOMAS
        // =================================================

        const sourceLanguage =
            this.getLanguageLabel(
                data.source_language
            );


        const targetLanguage =
            this.getLanguageLabel(
                data.target_language
            );


        // =================================================
        // CABECERA PRINCIPAL
        // =================================================

        const header =
            document.createElement(
                "div"
            );


        header.className =
            "document-result-top";


        // =================================================
        // INFORMACIÓN DEL ARCHIVO
        // =================================================

        const fileInfo =
            document.createElement(
                "div"
            );


        fileInfo.className =
            "document-result-file";


        fileInfo.innerHTML = `

            <div class="document-result-file-icon">

                <i class="bi bi-file-earmark-check-fill"></i>

            </div>


            <div class="document-result-file-data">

                <span class="document-success-label">

                    <i class="bi bi-check-circle-fill"></i>

                    Traducción completada

                </span>


                <h3>
                    ${this.escapeHtml(
                        data.file_name
                    )}
                </h3>


                <div class="document-result-meta">

                    <span>

                        <i class="bi bi-file-earmark"></i>

                        ${this.escapeHtml(
                            data.file_type
                        )}

                    </span>


                    <span>

                        <i class="bi bi-layers"></i>

                        ${data.section_count}
                        ${
                            data.section_count === 1
                                ? "sección"
                                : "secciones"
                        }

                    </span>


                    <span>

                        <i class="bi bi-fonts"></i>

                        ${Number(
                            data.character_count
                        ).toLocaleString("es-MX")}
                        caracteres

                    </span>

                </div>

            </div>

        `;


        // =================================================
        // BOTONES
        // =================================================

        const actions =
            document.createElement(
                "div"
            );


        actions.className =
            "document-result-actions";


        // =================================================
        // COPIAR
        // =================================================

        const copyButton =
            document.createElement(
                "button"
            );


        copyButton.type =
            "button";


        copyButton.className =
            "btn btn-outline-secondary";


        copyButton.innerHTML = `

            <i class="bi bi-copy"></i>

            Copiar traducción

        `;


        copyButton.addEventListener(
            "click",
            async () => {

                await this.copyTranslation();

            }
        );


        // =================================================
        // DESCARGAR
        // =================================================

        const downloadButton =
            document.createElement(
                "button"
            );


        downloadButton.type =
            "button";


        downloadButton.className =
            "btn btn-primary";


        downloadButton.innerHTML = `

            <i class="bi bi-download"></i>

            Descargar traducción

        `;


        downloadButton.addEventListener(
            "click",
            () => {

                this.downloadTranslation();

            }
        );


        actions.append(
            copyButton,
            downloadButton
        );


        header.append(
            fileInfo,
            actions
        );


        this.resultContainer
            .appendChild(
                header
            );


        // =================================================
        // DIRECCIÓN DE TRADUCCIÓN
        // =================================================

        const direction =
            document.createElement(
                "div"
            );


        direction.className =
            "document-translation-direction";


        direction.innerHTML = `

            <div class="document-language-chip">

                <span class="document-language-flag">
                    ${sourceLanguage.flag}
                </span>


                <div>

                    <small>
                        Idioma original
                    </small>

                    <strong>
                        ${sourceLanguage.name}
                    </strong>

                </div>

            </div>


            <div class="document-direction-arrow">

                <i class="bi bi-arrow-right"></i>

            </div>


            <div
                class="
                    document-language-chip
                    destination
                "
            >

                <span class="document-language-flag">
                    ${targetLanguage.flag}
                </span>


                <div>

                    <small>
                        Idioma traducido
                    </small>

                    <strong>
                        ${targetLanguage.name}
                    </strong>

                </div>

            </div>

        `;


        this.resultContainer
            .appendChild(
                direction
            );


        // =================================================
        // ENCABEZADO SECCIONES
        // =================================================

        const sectionsHeader =
            document.createElement(
                "div"
            );


        sectionsHeader.className =
            "document-sections-title";


        sectionsHeader.innerHTML = `

            <div>

                <span>
                    CONTENIDO
                </span>

                <h3>
                    Comparación del documento
                </h3>

            </div>


            <small>
                Original y traducción
            </small>

        `;


        this.resultContainer
            .appendChild(
                sectionsHeader
            );


        // =================================================
        // SECCIONES
        // =================================================

        const sectionsContainer =
            document.createElement(
                "div"
            );


        sectionsContainer.className =
            "document-sections-modern";


        data.sections.forEach(
            (
                section,
                index
            ) => {

                const sectionElement =
                    this.createSectionElement(

                        section,

                        sourceLanguage,

                        targetLanguage,

                        index

                    );


                sectionsContainer
                    .appendChild(
                        sectionElement
                    );

            }
        );


        this.resultContainer
            .appendChild(
                sectionsContainer
            );


        // =================================================
        // NOTA FINAL
        // =================================================

        const footer =
            document.createElement(
                "div"
            );


        footer.className =
            "document-result-footer";


        footer.innerHTML = `

            <i class="bi bi-info-circle"></i>

            <span>

                La traducción fue generada mediante
                Inteligencia Artificial. Revisa información
                importante antes de utilizarla oficialmente.

            </span>

        `;


        this.resultContainer
            .appendChild(
                footer
            );


        // =================================================
        // SCROLL
        // =================================================

        requestAnimationFrame(
            () => {

                this.resultContainer
                    .scrollIntoView({

                        behavior:
                            "smooth",

                        block:
                            "start"

                    });

            }
        );

    }


    // =====================================================
    // CREAR SECCIÓN
    // =====================================================

    createSectionElement(
        section,
        sourceLanguage,
        targetLanguage,
        index
    ) {

        const article =
            document.createElement(
                "article"
            );


        article.className =
            "document-section-modern";


        // =================================================
        // HEADER
        // =================================================

        const header =
            document.createElement(
                "div"
            );


        header.className =
            "document-section-modern-header";


        const sectionNumber =
            document.createElement(
                "span"
            );


        sectionNumber.className =
            "document-modern-number";


        sectionNumber.textContent =
            String(
                index + 1
            );


        const titles =
            document.createElement(
                "div"
            );


        titles.className =
            "document-modern-titles";


        const originalTitle =
            document.createElement(
                "h4"
            );


        originalTitle.textContent =
            (
                section.title ||
                `Sección ${index + 1}`
            );


        const translatedTitle =
            document.createElement(
                "span"
            );


        translatedTitle.textContent =
            (
                section.translated_title ||
                ""
            );


        titles.append(
            originalTitle,
            translatedTitle
        );


        header.append(
            sectionNumber,
            titles
        );


        // =================================================
        // CUERPO
        // =================================================

        const body =
            document.createElement(
                "div"
            );


        body.className =
            "document-modern-comparison";


        // =================================================
        // ORIGINAL
        // =================================================

        const originalPanel =
            document.createElement(
                "div"
            );


        originalPanel.className =
            (
                "document-modern-panel " +
                "document-original-panel"
            );


        const originalHeader =
            document.createElement(
                "div"
            );


        originalHeader.className =
            "document-modern-panel-header";


        originalHeader.innerHTML = `

            <div>

                <span class="language-dot original-dot"></span>

                <strong>
                    Original
                </strong>

            </div>


            <span class="document-panel-language">

                ${sourceLanguage.flag}
                ${sourceLanguage.name}

            </span>

        `;


        const originalContent =
            document.createElement(
                "div"
            );


        originalContent.className =
            "document-modern-text";


        originalContent.textContent =
            section.original_text;


        originalPanel.append(
            originalHeader,
            originalContent
        );


        // =================================================
        // TRADUCCIÓN
        // =================================================

        const translatedPanel =
            document.createElement(
                "div"
            );


        translatedPanel.className =
            (
                "document-modern-panel " +
                "document-translated-panel"
            );


        const translatedHeader =
            document.createElement(
                "div"
            );


        translatedHeader.className =
            "document-modern-panel-header";


        translatedHeader.innerHTML = `

            <div>

                <span class="language-dot translated-dot"></span>

                <strong>
                    Traducción
                </strong>

            </div>


            <span class="document-panel-language">

                ${targetLanguage.flag}
                ${targetLanguage.name}

            </span>

        `;


        const translatedContent =
            document.createElement(
                "div"
            );


        translatedContent.className =
            "document-modern-text translated";


        translatedContent.textContent =
            section.translated_text;


        translatedPanel.append(
            translatedHeader,
            translatedContent
        );


        body.append(
            originalPanel,
            translatedPanel
        );


        article.append(
            header,
            body
        );


        return article;

    }


    // =====================================================
    // COPIAR TRADUCCIÓN
    // =====================================================

    async copyTranslation() {

        if (
            !this.lastResult
        ) {

            return;

        }


        const content =
            this.buildTranslatedText(
                this.lastResult
            );


        try {

            await navigator
                .clipboard
                .writeText(
                    content
                );


            this.showToast(

                "Traducción copiada",

                (
                    "El contenido traducido fue " +
                    "copiado al portapapeles."
                ),

                "success"

            );

        }

        catch (
            error
        ) {

            console.error(
                "Error copiando traducción:",
                error
            );


            this.showToast(

                "No se pudo copiar",

                (
                    "El navegador no permitió copiar " +
                    "el contenido automáticamente."
                ),

                "warning"

            );

        }

    }


    // =====================================================
    // DESCARGAR TRADUCCIÓN
    // =====================================================

    downloadTranslation() {

        if (
            !this.lastResult
        ) {

            this.showToast(

                "Sin traducción",

                (
                    "Primero debes traducir " +
                    "un documento."
                ),

                "warning"

            );


            return;

        }


        // =================================================
        // TEXTO
        // =================================================

        const content =
            this.buildTranslatedText(
                this.lastResult
            );


        // =================================================
        // BOM UTF-8
        // =================================================
        //
        // Ayuda a que Windows / Bloc de notas / Word
        // interpreten correctamente ñ, acentos, etc.
        //
        // =================================================

        const blob =
            new Blob(

                [
                    "\uFEFF",
                    content
                ],

                {
                    type:
                        "text/plain;charset=utf-8"
                }

            );


        const url =
            URL.createObjectURL(
                blob
            );


        // =================================================
        // NOMBRE
        // =================================================

        const downloadName =
            this.buildDownloadFileName(
                this.lastResult.file_name
            );


        // =================================================
        // LINK TEMPORAL
        // =================================================

        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            downloadName;


        link.style.display =
            "none";


        document.body
            .appendChild(
                link
            );


        link.click();


        link.remove();


        // =================================================
        // LIBERAR URL
        // =================================================

        window.setTimeout(
            () => {

                URL.revokeObjectURL(
                    url
                );

            },
            1000
        );


        this.showToast(

            "Descarga iniciada",

            (
                `Se descargará "${downloadName}".`
            ),

            "success"

        );

    }


    // =====================================================
    // CONSTRUIR DOCUMENTO TRADUCIDO
    // =====================================================

    buildTranslatedText(
        data
    ) {

        const targetLanguage =
            this.getLanguageLabel(
                data.target_language
            );


        const lines = [];


        // =================================================
        // CABECERA
        // =================================================

        lines.push(
            "TRADUCCIÓN DEL DOCUMENTO"
        );


        lines.push(
            "========================"
        );


        lines.push(
            ""
        );


        lines.push(
            `Archivo original: ${data.file_name}`
        );


        lines.push(
            `Idioma de traducción: ${targetLanguage.name}`
        );


        lines.push(
            ""
        );


        lines.push(
            "----------------------------------------"
        );


        lines.push(
            ""
        );


        // =================================================
        // SECCIONES
        // =================================================

        data.sections.forEach(
            (
                section,
                index
            ) => {

                const title =
                    (
                        section.translated_title ||
                        `Sección ${index + 1}`
                    )
                    .trim();


                if (
                    title
                ) {

                    lines.push(
                        title
                    );


                    lines.push(
                        ""
                    );

                }


                lines.push(
                    (
                        section.translated_text ||
                        ""
                    ).trim()
                );


                lines.push(
                    ""
                );


                if (
                    index <
                    data.sections.length - 1
                ) {

                    lines.push(
                        "----------------------------------------"
                    );


                    lines.push(
                        ""
                    );

                }

            }
        );


        return (
            lines
                .join(
                    "\n"
                )
                .trim()
            +
            "\n"
        );

    }


    // =====================================================
    // NOMBRE DEL ARCHIVO
    // =====================================================

    buildDownloadFileName(
        originalFileName
    ) {

        const fileName =
            String(
                originalFileName ||
                "documento"
            );


        const lastDot =
            fileName.lastIndexOf(
                "."
            );


        let baseName;


        if (
            lastDot > 0
        ) {

            baseName =
                fileName.substring(
                    0,
                    lastDot
                );

        }

        else {

            baseName =
                fileName;

        }


        baseName =
            baseName
                .replace(
                    /[\\/:*?"<>|]/g,
                    "_"
                )
                .trim();


        if (
            !baseName
        ) {

            baseName =
                "documento";

        }


        return (
            `${baseName}_traducido.txt`
        );

    }


    // =====================================================
    // ERROR VISUAL
    // =====================================================

    renderError(
        message
    ) {

        this.resultContainer.innerHTML =
            "";


        const container =
            document.createElement(
                "div"
            );


        container.className =
            "document-error-state";


        const icon =
            document.createElement(
                "div"
            );


        icon.className =
            "document-error-icon";


        icon.innerHTML =
            '<i class="bi bi-exclamation-triangle"></i>';


        const title =
            document.createElement(
                "h3"
            );


        title.textContent =
            "No fue posible traducir el documento";


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


        this.resultContainer
            .appendChild(
                container
            );

    }


    // =====================================================
    // RESULTADO VACÍO
    // =====================================================

    resetResult() {

        this.resultContainer.innerHTML = `

            <div class="result-empty document-modern-empty">

                <div class="document-empty-icon">

                    <i class="bi bi-file-earmark-text"></i>

                </div>


                <h3>
                    Traducción del documento
                </h3>


                <p>

                    Selecciona un archivo PDF, DOCX o TXT
                    y presiona
                    <strong>Traducir documento</strong>.

                </p>

            </div>

        `;

    }


    // =====================================================
    // ELIMINAR ARCHIVO
    // =====================================================

    removeFile() {

        if (
            this.processing
        ) {

            return;

        }


        this.selectedFile =
            null;


        this.lastResult =
            null;


        this.input.value =
            "";


        this.selectedContainer
            .classList
            .add(
                "d-none"
            );


        this.translateButton.disabled =
            true;


        this.resetResult();


        this.showToast(

            "Documento eliminado",

            (
                "El archivo seleccionado " +
                "fue retirado."
            ),

            "info"

        );

    }


    // =====================================================
    // EXTENSIÓN
    // =====================================================

    getFileExtension(
        fileName
    ) {

        const parts =
            String(
                fileName
            )
                .toLowerCase()
                .split(".");


        if (
            parts.length < 2
        ) {

            return "";

        }


        return parts.pop();

    }


    // =====================================================
    // VALIDAR TAMAÑO
    // =====================================================

    validateFileSize(
        file
    ) {

        const maximumBytes =
            this.maxSizeMB *
            1024 *
            1024;


        return (
            file.size <=
            maximumBytes
        );

    }


    // =====================================================
    // FORMATEAR TAMAÑO
    // =====================================================

    formatFileSize(
        bytes
    ) {

        if (
            bytes === 0
        ) {

            return "0 bytes";

        }


        const units = [

            "bytes",
            "KB",
            "MB",
            "GB"

        ];


        const index =
            Math.min(

                Math.floor(

                    Math.log(
                        bytes
                    )
                    /
                    Math.log(
                        1024
                    )

                ),

                units.length - 1

            );


        const value =
            bytes
            /
            Math.pow(
                1024,
                index
            );


        return (
            `${value.toFixed(2)} ` +
            `${units[index]}`
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


        return {

            name:
                "English",

            flag:
                "🇺🇸"

        };

    }


    // =====================================================
    // ESCAPAR HTML
    // =====================================================

    escapeHtml(
        value
    ) {

        const element =
            document.createElement(
                "div"
            );


        element.textContent =
            String(
                value ?? ""
            );


        return (
            element.innerHTML
        );

    }

}