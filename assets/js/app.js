// =========================================================
// IMPORTACIONES
// =========================================================

import {
    APP_CONFIG
} from "./config.js";


import {
    ChatModule
} from "./chat.js";


import {
    VoiceModule
} from "./voice.js";


// =========================================================
// CONFIGURACIÓN GENERAL
// =========================================================

const MAX_DOCUMENT_SIZE_MB = 10;
const MAX_IMAGE_SIZE_MB = 10;


const ALLOWED_DOCUMENT_EXTENSIONS = [
    "pdf",
    "docx",
    "txt"
];


const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];


// =========================================================
// ELEMENTOS GENERALES
// =========================================================

const moduleButtons =
    document.querySelectorAll(
        "[data-module-target]"
    );


const modules =
    document.querySelectorAll(
        ".app-module"
    );


// =========================================================
// TOAST
// =========================================================

const toastElement =
    document.getElementById(
        "appToast"
    );


const toast =
    bootstrap.Toast.getOrCreateInstance(
        toastElement
    );


function showToast(
    title,
    message,
    type = "info"
) {

    const titleElement =
        document.getElementById(
            "toastTitle"
        );


    const messageElement =
        document.getElementById(
            "toastMessage"
        );


    const icon =
        document.getElementById(
            "toastIcon"
        );


    titleElement.textContent =
        title;


    messageElement.textContent =
        message;


    icon.className =
        "bi me-2";


    switch (
        type
    ) {

        case "success":

            icon.classList.add(
                "bi-check-circle-fill",
                "text-success"
            );

            break;


        case "danger":

            icon.classList.add(
                "bi-exclamation-circle-fill",
                "text-danger"
            );

            break;


        case "warning":

            icon.classList.add(
                "bi-exclamation-triangle-fill",
                "text-warning"
            );

            break;


        default:

            icon.classList.add(
                "bi-info-circle-fill",
                "text-primary"
            );

    }


    toast.show();

}


// =========================================================
// NAVEGACIÓN
// =========================================================

function changeModule(
    moduleName
) {

    modules.forEach(
        module => {

            module.classList.remove(
                "active"
            );

        }
    );


    const selectedModule =
        document.getElementById(
            `module-${moduleName}`
        );


    if (
        selectedModule
    ) {

        selectedModule.classList.add(
            "active"
        );

    }


    moduleButtons.forEach(
        button => {

            const target =
                button.dataset.moduleTarget;


            button.classList.toggle(
                "active",
                target === moduleName
            );

        }
    );


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


moduleButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                changeModule(
                    button.dataset.moduleTarget
                );

            }
        );

    }
);


// =========================================================
// CHAT
// =========================================================

const chatModule =
    new ChatModule({

        apiBaseUrl:
            APP_CONFIG.apiBaseUrl,

        chatMessages:
            document.getElementById(
                "chatMessages"
            ),

        chatInput:
            document.getElementById(
                "chatInput"
            ),

        characterCounter:
            document.getElementById(
                "characterCounter"
            ),

        btnSendChat:
            document.getElementById(
                "btnSendChat"
            ),

        btnClearChat:
            document.getElementById(
                "btnClearChat"
            ),

        showToast:
            showToast

    });


// =========================================================
// VOZ REALTIME
// =========================================================

const voiceModule =
    new VoiceModule({

        apiBaseUrl:
            APP_CONFIG.apiBaseUrl,

        button:
            document.getElementById(
                "btnVoiceConversation"
            ),

        microphoneAnimation:
            document.getElementById(
                "microphoneAnimation"
            ),

        title:
            document.getElementById(
                "voiceTitle"
            ),

        status:
            document.getElementById(
                "voiceStatus"
            ),

        connectionBadge:
            document.getElementById(
                "voiceConnectionBadge"
            ),

        transcript:
            document.getElementById(
                "voiceTranscript"
            ),

        showToast:
            showToast

    });


// =========================================================
// DOCUMENTOS
// =========================================================

const documentDropZone =
    document.getElementById(
        "documentDropZone"
    );


const documentInput =
    document.getElementById(
        "documentInput"
    );


const btnSelectDocument =
    document.getElementById(
        "btnSelectDocument"
    );


const documentSelected =
    document.getElementById(
        "documentSelected"
    );


const documentFileName =
    document.getElementById(
        "documentFileName"
    );


const documentFileSize =
    document.getElementById(
        "documentFileSize"
    );


const btnRemoveDocument =
    document.getElementById(
        "btnRemoveDocument"
    );


const btnTranslateDocument =
    document.getElementById(
        "btnTranslateDocument"
    );


let selectedDocument =
    null;


// =========================================================
// SELECCIONAR DOCUMENTO
// =========================================================

btnSelectDocument.addEventListener(
    "click",
    () => {

        documentInput.click();

    }
);


documentInput.addEventListener(
    "change",
    () => {

        if (
            documentInput.files.length
        ) {

            processDocument(
                documentInput.files[0]
            );

        }

    }
);


btnRemoveDocument.addEventListener(
    "click",
    () => {

        removeDocument();

    }
);


btnTranslateDocument.addEventListener(
    "click",
    () => {

        if (
            !selectedDocument
        ) {

            showToast(
                "Archivo no seleccionado",
                (
                    "Selecciona un documento " +
                    "antes de continuar."
                ),
                "warning"
            );

            return;

        }


        showToast(
            "Documento preparado",
            (
                "El documento está listo. " +
                "La traducción se conectará " +
                "al backend posteriormente."
            ),
            "success"
        );

    }
);


// =========================================================
// DRAG & DROP DOCUMENTOS
// =========================================================

[
    "dragenter",
    "dragover"
].forEach(
    eventName => {

        documentDropZone.addEventListener(
            eventName,
            event => {

                event.preventDefault();
                event.stopPropagation();


                documentDropZone
                    .classList
                    .add(
                        "dragover"
                    );

            }
        );

    }
);


[
    "dragleave",
    "drop"
].forEach(
    eventName => {

        documentDropZone.addEventListener(
            eventName,
            event => {

                event.preventDefault();
                event.stopPropagation();


                documentDropZone
                    .classList
                    .remove(
                        "dragover"
                    );

            }
        );

    }
);


documentDropZone.addEventListener(
    "drop",
    event => {

        const files =
            event.dataTransfer.files;


        if (
            files.length
        ) {

            processDocument(
                files[0]
            );

        }

    }
);


// =========================================================
// PROCESAR DOCUMENTO
// =========================================================

function processDocument(
    file
) {

    const extension =
        getFileExtension(
            file.name
        );


    if (
        !ALLOWED_DOCUMENT_EXTENSIONS.includes(
            extension
        )
    ) {

        showToast(
            "Formato no permitido",
            (
                "Solo se permiten archivos " +
                "PDF, DOCX y TXT."
            ),
            "danger"
        );


        documentInput.value =
            "";

        return;

    }


    if (
        !validateFileSize(
            file,
            MAX_DOCUMENT_SIZE_MB
        )
    ) {

        showToast(
            "Archivo demasiado grande",
            (
                `El documento no debe superar ` +
                `${MAX_DOCUMENT_SIZE_MB} MB.`
            ),
            "danger"
        );


        documentInput.value =
            "";

        return;

    }


    selectedDocument =
        file;


    documentFileName.textContent =
        file.name;


    documentFileSize.textContent =
        formatFileSize(
            file.size
        );


    documentSelected
        .classList
        .remove(
            "d-none"
        );


    btnTranslateDocument.disabled =
        false;


    showToast(
        "Documento seleccionado",
        (
            "El archivo cumple con las " +
            "validaciones iniciales."
        ),
        "success"
    );

}


// =========================================================
// ELIMINAR DOCUMENTO
// =========================================================

function removeDocument() {

    selectedDocument =
        null;


    documentInput.value =
        "";


    documentSelected
        .classList
        .add(
            "d-none"
        );


    btnTranslateDocument.disabled =
        true;

}


// =========================================================
// IMÁGENES
// =========================================================

const imageDropZone =
    document.getElementById(
        "imageDropZone"
    );


const imageInput =
    document.getElementById(
        "imageInput"
    );


const btnSelectImage =
    document.getElementById(
        "btnSelectImage"
    );


const imagePreviewContainer =
    document.getElementById(
        "imagePreviewContainer"
    );


const imagePreview =
    document.getElementById(
        "imagePreview"
    );


const btnRemoveImage =
    document.getElementById(
        "btnRemoveImage"
    );


const btnAnalyzeImage =
    document.getElementById(
        "btnAnalyzeImage"
    );


const btnGenerateTranslatedImage =
    document.getElementById(
        "btnGenerateTranslatedImage"
    );


let selectedImage =
    null;


let imagePreviewUrl =
    null;


// =========================================================
// SELECCIONAR IMAGEN
// =========================================================

btnSelectImage.addEventListener(
    "click",
    () => {

        imageInput.click();

    }
);


imageInput.addEventListener(
    "change",
    () => {

        if (
            imageInput.files.length
        ) {

            processImage(
                imageInput.files[0]
            );

        }

    }
);


btnRemoveImage.addEventListener(
    "click",
    () => {

        removeImage();

    }
);


btnAnalyzeImage.addEventListener(
    "click",
    () => {

        if (
            !selectedImage
        ) {

            showToast(
                "Imagen no seleccionada",
                (
                    "Selecciona una imagen " +
                    "antes de continuar."
                ),
                "warning"
            );

            return;

        }


        showToast(
            "Imagen preparada",
            (
                "La imagen está lista para " +
                "ser procesada por la IA."
            ),
            "success"
        );

    }
);


btnGenerateTranslatedImage.addEventListener(
    "click",
    () => {

        if (
            !selectedImage
        ) {

            showToast(
                "Imagen no seleccionada",
                (
                    "Selecciona una imagen " +
                    "antes de continuar."
                ),
                "warning"
            );

            return;

        }


        showToast(
            "Generación preparada",
            (
                "Posteriormente generaremos una " +
                "versión visual traducida."
            ),
            "info"
        );

    }
);


// =========================================================
// DRAG & DROP IMÁGENES
// =========================================================

[
    "dragenter",
    "dragover"
].forEach(
    eventName => {

        imageDropZone.addEventListener(
            eventName,
            event => {

                event.preventDefault();
                event.stopPropagation();


                imageDropZone
                    .classList
                    .add(
                        "dragover"
                    );

            }
        );

    }
);


[
    "dragleave",
    "drop"
].forEach(
    eventName => {

        imageDropZone.addEventListener(
            eventName,
            event => {

                event.preventDefault();
                event.stopPropagation();


                imageDropZone
                    .classList
                    .remove(
                        "dragover"
                    );

            }
        );

    }
);


imageDropZone.addEventListener(
    "drop",
    event => {

        const files =
            event.dataTransfer.files;


        if (
            files.length
        ) {

            processImage(
                files[0]
            );

        }

    }
);


// =========================================================
// PROCESAR IMAGEN
// =========================================================

function processImage(
    file
) {

    if (
        !ALLOWED_IMAGE_TYPES.includes(
            file.type
        )
    ) {

        showToast(
            "Formato no permitido",
            (
                "Solo se permiten imágenes " +
                "JPG, JPEG, PNG y WEBP."
            ),
            "danger"
        );


        imageInput.value =
            "";

        return;

    }


    if (
        !validateFileSize(
            file,
            MAX_IMAGE_SIZE_MB
        )
    ) {

        showToast(
            "Imagen demasiado grande",
            (
                `La imagen no debe superar ` +
                `${MAX_IMAGE_SIZE_MB} MB.`
            ),
            "danger"
        );


        imageInput.value =
            "";

        return;

    }


    selectedImage =
        file;


    if (
        imagePreviewUrl
    ) {

        URL.revokeObjectURL(
            imagePreviewUrl
        );

    }


    imagePreviewUrl =
        URL.createObjectURL(
            file
        );


    imagePreview.src =
        imagePreviewUrl;


    imagePreview.alt =
        (
            `Vista previa de ` +
            `${file.name}`
        );


    imageDropZone
        .classList
        .add(
            "d-none"
        );


    imagePreviewContainer
        .classList
        .remove(
            "d-none"
        );


    btnAnalyzeImage.disabled =
        false;


    btnGenerateTranslatedImage.disabled =
        false;


    showToast(
        "Imagen seleccionada",
        (
            "La imagen cumple con las " +
            "validaciones iniciales."
        ),
        "success"
    );

}


// =========================================================
// ELIMINAR IMAGEN
// =========================================================

function removeImage() {

    selectedImage =
        null;


    imageInput.value =
        "";


    if (
        imagePreviewUrl
    ) {

        URL.revokeObjectURL(
            imagePreviewUrl
        );


        imagePreviewUrl =
            null;

    }


    imagePreview.src =
        "";


    imagePreviewContainer
        .classList
        .add(
            "d-none"
        );


    imageDropZone
        .classList
        .remove(
            "d-none"
        );


    btnAnalyzeImage.disabled =
        true;


    btnGenerateTranslatedImage.disabled =
        true;

}


// =========================================================
// UTILIDADES
// =========================================================

function getFileExtension(
    fileName
) {

    const parts =
        fileName
            .toLowerCase()
            .split(".");


    if (
        parts.length < 2
    ) {

        return "";

    }


    return parts.pop();

}


function validateFileSize(
    file,
    maxSizeMB
) {

    const maxSizeBytes =
        maxSizeMB *
        1024 *
        1024;


    return (
        file.size <=
        maxSizeBytes
    );

}


function formatFileSize(
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
        Math.floor(
            Math.log(
                bytes
            ) /
            Math.log(
                1024
            )
        );


    const value =
        bytes /
        Math.pow(
            1024,
            index
        );


    return (
        `${value.toFixed(2)} ` +
        `${units[index]}`
    );

}


// =========================================================
// CIERRE DE PÁGINA
// =========================================================

window.addEventListener(
    "beforeunload",
    () => {

        // Cierra WebRTC, micrófono y audio remoto.
        voiceModule.destroy();


        // Libera la URL temporal de la imagen.
        if (
            imagePreviewUrl
        ) {

            URL.revokeObjectURL(
                imagePreviewUrl
            );

        }

    }
);


// =========================================================
// INICIALIZACIÓN
// =========================================================

console.log(
    "Traductor Inteligente Multimodal - Interfaz inicializada."
);


console.log(
    "Backend configurado:",
    APP_CONFIG.apiBaseUrl
);