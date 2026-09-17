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


        this.maxSizeMB =
            4;


        this.allowedExtensions = [
            "pdf",
            "docx",
            "txt"
        ];


        this.selectedFile =
            null;


        this.processing =
            false;


        this.lastResult =
            null;


        this.bindEvents();

    }


    // =====================================================
    // EVENTOS
    // =====================================================

    bindEvents() {

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


        this.removeButton.addEventListener(
            "click",
            () => {

                this.removeFile();

            }
        );


        this.translateButton.addEventListener(
            "click",
            async () => {

                await this.translateDocument();

            }
        );


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
    // SELECCIONAR ARCHIVO
    // =====================================================

    processSelectedFile(
        file
    ) {

        const extension =
            this.getFileExtension(
                file.name
            );


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
                    "Selecciona un archivo "
                    +
                    "PDF, DOCX o TXT."
                ),

                "danger"

            );


            return;

        }


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
                    "El documento no debe superar "
                    +
                    `${this.maxSizeMB} MB.`
                ),

                "danger"

            );


            return;

        }


        this.selectedFile =
            file;


        this.lastResult =
            null;


        this.fileName.textContent =
            file.name;


        this.fileSize.textContent =
            this.formatFileSize(
                file.size
            );


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
                "El archivo está listo para "
                +
                "ser traducido."
            ),

            "success"

        );

    }


    // =====================================================
    // TRADUCIR
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
                    "Selecciona un documento "
                    +
                    "antes de traducir."
                ),

                "warning"

            );


            return;

        }


        this.processing =
            true;


        this.lastResult =
            null;


        this.setLoadingState();


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
                        `/api/document`
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
                        "El servidor devolvió una "
                        +
                        "respuesta no válida."
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
                        "No fue posible traducir "
                        +
                        "el documento."
                    )

                );

            }


            if (
                !result?.success
                ||
                !result?.data
                ||
                !Array.isArray(
                    result.data.sections
                )
            ) {

                throw new Error(
                    (
                        "La respuesta del servidor "
                        +
                        "está incompleta."
                    )
                );

            }


            this.lastResult =
                result.data;


            this.renderResult(
                result.data
            );


            this.showToast(

                "Documento traducido",

                (
                    "La traducción fue generada "
                    +
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


            const message = (

                error instanceof Error

                    ? error.message

                    : (
                        "No fue posible procesar "
                        +
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
    // LOADING
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
                            Procesando...
                        </span>

                    </div>

                </div>


                <h3>
                    Traduciendo documento
                </h3>


                <p>
                    Extrayendo contenido, detectando
                    el idioma y generando la traducción
                    con Inteligencia Artificial.
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
    // RESTAURAR CONTROLES
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


        const sourceLanguage =
            this.getLanguageLabel(
                data.source_language
            );


        const targetLanguage =
            this.getLanguageLabel(
                data.target_language
            );


        const fileType =
            String(
                data.file_type
                ||
                "TXT"
            )
            .toUpperCase();


        // =================================================
        // CABECERA
        // =================================================

        const header =
            document.createElement(
                "div"
            );


        header.className =
            "document-result-top";


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
                            fileType
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
        // ACCIONES
        // =================================================

        const actions =
            document.createElement(
                "div"
            );


        actions.className =
            "document-result-actions";


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

            Descargar ${this.escapeHtml(
                fileType
            )}

        `;


        downloadButton.addEventListener(
            "click",
            async () => {

                await this.downloadTranslation(
                    downloadButton
                );

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
        // IDIOMAS
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
        // SECCIONES
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

                sectionsContainer
                    .appendChild(

                        this.createSectionElement(

                            section,

                            sourceLanguage,

                            targetLanguage,

                            index

                        )

                    );

            }
        );


        this.resultContainer
            .appendChild(
                sectionsContainer
            );


        // =================================================
        // FOOTER
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

                Puedes descargar la traducción
                nuevamente como archivo
                <strong>
                    ${this.escapeHtml(fileType)}
                </strong>.
                La estructura textual se conserva,
                aunque el diseño puede diferir
                del original.

            </span>

        `;


        this.resultContainer
            .appendChild(
                footer
            );

    }


    // =====================================================
    // CREAR SECCIÓN VISUAL
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


        const header =
            document.createElement(
                "div"
            );


        header.className =
            "document-section-modern-header";


        const number =
            document.createElement(
                "span"
            );


        number.className =
            "document-modern-number";


        number.textContent =
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
                section.title
                ||
                `Sección ${index + 1}`
            );


        const translatedTitle =
            document.createElement(
                "span"
            );


        translatedTitle.textContent =
            (
                section.translated_title
                ||
                ""
            );


        titles.append(
            originalTitle,
            translatedTitle
        );


        header.append(
            number,
            titles
        );


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
                "document-modern-panel "
                +
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

                <span
                    class="
                        language-dot
                        original-dot
                    "
                ></span>

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
                "document-modern-panel "
                +
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

                <span
                    class="
                        language-dot
                        translated-dot
                    "
                ></span>

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
                    "El contenido traducido fue "
                    +
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
                    "El navegador no permitió "
                    +
                    "copiar el contenido."
                ),

                "warning"

            );

        }

    }


    // =====================================================
    // DESCARGAR ARCHIVO REAL
    // =====================================================

    async downloadTranslation(
        button
    ) {

        if (
            !this.lastResult
        ) {

            this.showToast(

                "Sin traducción",

                (
                    "Primero debes traducir "
                    +
                    "un documento."
                ),

                "warning"

            );


            return;

        }


        const previousContent =
            button.innerHTML;


        button.disabled =
            true;


        button.innerHTML = `

            <span
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
            ></span>

            Generando...

        `;


        try {

            const payload = {

                original_file_name:
                    this.lastResult.file_name,

                file_type:
                    String(
                        this.lastResult.file_type
                    )
                    .toLowerCase(),

                target_language:
                    this.lastResult.target_language,

                sections:
                    this.lastResult
                        .sections
                        .map(
                            section => ({

                                translated_title:
                                    section.translated_title
                                    ||
                                    "",

                                translated_text:
                                    section.translated_text

                            })
                        )

            };


            const response =
                await fetch(

                    (
                        `${this.apiBaseUrl}` +
                        `/api/document/download`
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


            // =================================================
            // ERROR DEL BACKEND
            // =================================================

            if (
                !response.ok
            ) {

                let message =
                    (
                        "No fue posible generar "
                        +
                        "el archivo traducido."
                    );


                const contentType =
                    (
                        response.headers
                            .get(
                                "content-type"
                            )
                        ||
                        ""
                    );


                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    try {

                        const errorData =
                            await response.json();


                        message =
                            (
                                errorData?.detail
                                ||
                                message
                            );

                    }

                    catch {

                        // Mantener mensaje predeterminado.

                    }

                }


                throw new Error(
                    message
                );

            }


            // =================================================
            // ARCHIVO
            // =================================================

            const blob =
                await response.blob();


            if (
                blob.size <= 0
            ) {

                throw new Error(
                    (
                        "El servidor devolvió "
                        +
                        "un archivo vacío."
                    )
                );

            }


            // =================================================
            // NOMBRE
            // =================================================

            const downloadName =
                this.getDownloadFileName(
                    response
                );


            // =================================================
            // DESCARGAR
            // =================================================

            const url =
                URL.createObjectURL(
                    blob
                );


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
                    `Descargando "${downloadName}".`
                ),

                "success"

            );

        }

        catch (
            error
        ) {

            console.error(
                "Error descargando documento:",
                error
            );


            this.showToast(

                "Error de descarga",

                (
                    error instanceof Error

                        ? error.message

                        : (
                            "No fue posible descargar "
                            +
                            "el archivo."
                        )
                ),

                "danger"

            );

        }

        finally {

            button.disabled =
                false;


            button.innerHTML =
                previousContent;

        }

    }


    // =====================================================
    // NOMBRE DESDE CONTENT-DISPOSITION
    // =====================================================

    getDownloadFileName(
        response
    ) {

        const fallback =
            this.buildDownloadFileName();


        const disposition =
            response.headers.get(
                "Content-Disposition"
            );


        if (
            !disposition
        ) {

            return fallback;

        }


        // =================================================
        // RFC 5987
        // filename*=UTF-8''archivo.pdf
        // =================================================

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
                            /^["']|["']$/g,
                            ""
                        )
                        .trim()
                );

            }

            catch {

                return fallback;

            }

        }


        // =================================================
        // filename="archivo.pdf"
        // =================================================

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


        return fallback;

    }


    // =====================================================
    // NOMBRE FALLBACK
    // =====================================================

    buildDownloadFileName() {

        const originalFileName =
            String(
                this.lastResult
                    ?.file_name
                ||
                "documento"
            );


        const extension =
            String(
                this.lastResult
                    ?.file_type
                ||
                "txt"
            )
            .toLowerCase();


        const lastDot =
            originalFileName
                .lastIndexOf(
                    "."
                );


        let baseName;


        if (
            lastDot > 0
        ) {

            baseName =
                originalFileName
                .substring(
                    0,
                    lastDot
                );

        }

        else {

            baseName =
                originalFileName;

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
            `${baseName}_traducido.${extension}`
        );

    }


    // =====================================================
    // TEXTO PARA PORTAPAPELES
    // =====================================================

    buildTranslatedText(
        data
    ) {

        const lines = [];


        data.sections.forEach(
            (
                section,
                index
            ) => {

                const title =
                    (
                        section.translated_title
                        ||
                        `Sección ${index + 1}`
                    )
                    .trim();


                const text =
                    (
                        section.translated_text
                        ||
                        ""
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


                if (
                    text
                ) {

                    lines.push(
                        text
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
        );

    }


    // =====================================================
    // ERROR
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
            (
                '<i class="bi '
                +
                'bi-exclamation-triangle"></i>'
            );


        const title =
            document.createElement(
                "h3"
            );


        title.textContent =
            (
                "No fue posible traducir "
                +
                "el documento"
            );


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
    // ESTADO VACÍO
    // =====================================================

    resetResult() {

        this.resultContainer.innerHTML = `

            <div
                class="
                    result-empty
                    document-modern-empty
                "
            >

                <div class="document-empty-icon">

                    <i class="bi bi-file-earmark-text"></i>

                </div>


                <h3>
                    Traducción del documento
                </h3>


                <p>

                    Selecciona un archivo
                    PDF, DOCX o TXT y presiona

                    <strong>
                        Traducir documento
                    </strong>.

                </p>

            </div>

        `;

    }


    // =====================================================
    // ELIMINAR DOCUMENTO
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
                "El archivo seleccionado "
                +
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


        return (
            parts.pop()
        );

    }


    // =====================================================
    // VALIDAR TAMAÑO
    // =====================================================

    validateFileSize(
        file
    ) {

        const maximumBytes =
            this.maxSizeMB
            *
            1024
            *
            1024;


        return (
            file.size
            <=
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
            `${value.toFixed(2)} `
            +
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