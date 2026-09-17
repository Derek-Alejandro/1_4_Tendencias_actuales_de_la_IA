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


import {
    DocumentsModule
} from "./documents.js";


// =========================================================
// CONFIGURACIÓN GENERAL
// =========================================================

const MAX_IMAGE_SIZE_MB =
    4;


const ALLOWED_IMAGE_TYPES = [

    "image/jpeg",
    "image/png",
    "image/webp"

];


// =========================================================
// UTILIDAD PARA ELEMENTOS OBLIGATORIOS
// =========================================================

function getRequiredElement(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (
        !element
    ) {

        throw new Error(
            (
                "No se encontró el elemento requerido " +
                `con id="${id}".`
            )
        );

    }


    return element;

}


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
// TOAST - ELEMENTOS
// =========================================================

const toastElement =
    getRequiredElement(
        "appToast"
    );


const toastTitle =
    getRequiredElement(
        "toastTitle"
    );


const toastMessage =
    getRequiredElement(
        "toastMessage"
    );


const toastIcon =
    getRequiredElement(
        "toastIcon"
    );


// =========================================================
// TOAST - INSTANCIA BOOTSTRAP
// =========================================================

const toast =
    bootstrap.Toast
        .getOrCreateInstance(

            toastElement,

            {
                delay:
                    4500
            }

        );


// =========================================================
// MOSTRAR TOAST
// =========================================================

function showToast(
    title,
    message,
    type = "info"
) {

    toastTitle.textContent =
        title;


    toastMessage.textContent =
        message;


    toastIcon.className =
        "bi me-2";


    switch (
        type
    ) {

        // =================================================
        // ÉXITO
        // =================================================

        case "success":

            toastIcon
                .classList
                .add(

                    "bi-check-circle-fill",
                    "text-success"

                );

            break;


        // =================================================
        // ERROR
        // =================================================

        case "danger":

            toastIcon
                .classList
                .add(

                    "bi-exclamation-circle-fill",
                    "text-danger"

                );

            break;


        // =================================================
        // ADVERTENCIA
        // =================================================

        case "warning":

            toastIcon
                .classList
                .add(

                    "bi-exclamation-triangle-fill",
                    "text-warning"

                );

            break;


        // =================================================
        // INFORMACIÓN
        // =================================================

        default:

            toastIcon
                .classList
                .add(

                    "bi-info-circle-fill",
                    "text-primary"

                );

            break;

    }


    toast.show();

}


// =========================================================
// CAMBIAR ENTRE MÓDULOS
// =========================================================

function changeModule(
    moduleName
) {

    // =====================================================
    // OCULTAR TODOS
    // =====================================================

    modules.forEach(
        module => {

            module.classList.remove(
                "active"
            );

        }
    );


    // =====================================================
    // MOSTRAR SELECCIONADO
    // =====================================================

    const selectedModule =
        document.getElementById(
            `module-${moduleName}`
        );


    if (
        !selectedModule
    ) {

        console.warn(
            (
                "No existe el módulo solicitado: " +
                moduleName
            )
        );


        return;

    }


    selectedModule
        .classList
        .add(
            "active"
        );


    // =====================================================
    // ACTUALIZAR BOTONES
    // =====================================================

    moduleButtons.forEach(
        button => {

            const target =
                button.dataset
                    .moduleTarget;


            button
                .classList
                .toggle(

                    "active",

                    target ===
                        moduleName

                );

        }
    );


    // =====================================================
    // CERRAR OFFCANVAS MÓVIL
    // =====================================================

    const mobileMenu =
        document.getElementById(
            "mobileMenu"
        );


    if (
        mobileMenu
    ) {

        const offcanvas =
            bootstrap
                .Offcanvas
                .getInstance(
                    mobileMenu
                );


        if (
            offcanvas
        ) {

            offcanvas.hide();

        }

    }


    // =====================================================
    // SUBIR AL INICIO
    // =====================================================

    window.scrollTo({

        top:
            0,

        behavior:
            "smooth"

    });

}


// =========================================================
// EVENTOS DE NAVEGACIÓN
// =========================================================

moduleButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const moduleName =
                    button.dataset
                        .moduleTarget;


                if (
                    moduleName
                ) {

                    changeModule(
                        moduleName
                    );

                }

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
            getRequiredElement(
                "chatMessages"
            ),


        chatInput:
            getRequiredElement(
                "chatInput"
            ),


        characterCounter:
            getRequiredElement(
                "characterCounter"
            ),


        btnSendChat:
            getRequiredElement(
                "btnSendChat"
            ),


        btnClearChat:
            getRequiredElement(
                "btnClearChat"
            ),


        showToast:
            showToast

    });


// =========================================================
// VOZ EN TIEMPO REAL
// =========================================================

const voiceModule =
    new VoiceModule({

        apiBaseUrl:
            APP_CONFIG.apiBaseUrl,


        button:
            getRequiredElement(
                "btnVoiceConversation"
            ),


        microphoneAnimation:
            getRequiredElement(
                "microphoneAnimation"
            ),


        title:
            getRequiredElement(
                "voiceTitle"
            ),


        status:
            getRequiredElement(
                "voiceStatus"
            ),


        connectionBadge:
            getRequiredElement(
                "voiceConnectionBadge"
            ),


        transcript:
            getRequiredElement(
                "voiceTranscript"
            ),


        showToast:
            showToast

    });


// =========================================================
// DOCUMENTOS
// =========================================================

const documentsModule =
    new DocumentsModule({

        apiBaseUrl:
            APP_CONFIG.apiBaseUrl,


        dropZone:
            getRequiredElement(
                "documentDropZone"
            ),


        input:
            getRequiredElement(
                "documentInput"
            ),


        selectButton:
            getRequiredElement(
                "btnSelectDocument"
            ),


        selectedContainer:
            getRequiredElement(
                "documentSelected"
            ),


        fileName:
            getRequiredElement(
                "documentFileName"
            ),


        fileSize:
            getRequiredElement(
                "documentFileSize"
            ),


        removeButton:
            getRequiredElement(
                "btnRemoveDocument"
            ),


        translateButton:
            getRequiredElement(
                "btnTranslateDocument"
            ),


        resultContainer:
            getRequiredElement(
                "documentResultContent"
            ),


        showToast:
            showToast

    });


// =========================================================
// IMÁGENES - ELEMENTOS
// =========================================================

const imageDropZone =
    getRequiredElement(
        "imageDropZone"
    );


const imageInput =
    getRequiredElement(
        "imageInput"
    );


const btnSelectImage =
    getRequiredElement(
        "btnSelectImage"
    );


const imagePreviewContainer =
    getRequiredElement(
        "imagePreviewContainer"
    );


const imagePreview =
    getRequiredElement(
        "imagePreview"
    );


const btnRemoveImage =
    getRequiredElement(
        "btnRemoveImage"
    );


const btnAnalyzeImage =
    getRequiredElement(
        "btnAnalyzeImage"
    );


const btnGenerateTranslatedImage =
    getRequiredElement(
        "btnGenerateTranslatedImage"
    );


// =========================================================
// IMÁGENES - ESTADO
// =========================================================

let selectedImage =
    null;


let imagePreviewUrl =
    null;


// =========================================================
// IMÁGENES - SELECCIONAR ARCHIVO
// =========================================================

btnSelectImage.addEventListener(
    "click",
    () => {

        imageInput.click();

    }
);


// =========================================================
// IMÁGENES - INPUT
// =========================================================

imageInput.addEventListener(
    "change",
    () => {

        const file =
            imageInput
                .files?.[0];


        if (
            file
        ) {

            processImage(
                file
            );

        }

    }
);


// =========================================================
// IMÁGENES - ELIMINAR
// =========================================================

btnRemoveImage.addEventListener(
    "click",
    () => {

        removeImage();

    }
);


// =========================================================
// IMÁGENES - ANALIZAR
// =========================================================

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


        // =================================================
        // POR AHORA SOLO PREPARADO
        // =================================================

        showToast(

            "Imagen preparada",

            (
                "La imagen está lista para conectarse " +
                "al módulo de Inteligencia Artificial."
            ),

            "success"

        );

    }
);


// =========================================================
// IMÁGENES - GENERAR VERSIÓN TRADUCIDA
// =========================================================

btnGenerateTranslatedImage
    .addEventListener(
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


            // =============================================
            // POR AHORA SOLO PREPARADO
            // =============================================

            showToast(

                "Generación preparada",

                (
                    "El módulo de generación visual " +
                    "traducida se conectará en la " +
                    "siguiente etapa."
                ),

                "info"

            );

        }
    );


// =========================================================
// IMÁGENES - DRAG ENTER / DRAG OVER
// =========================================================

[
    "dragenter",
    "dragover"
].forEach(
    eventName => {

        imageDropZone
            .addEventListener(
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


// =========================================================
// IMÁGENES - DRAG LEAVE / DROP
// =========================================================

[
    "dragleave",
    "drop"
].forEach(
    eventName => {

        imageDropZone
            .addEventListener(
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


// =========================================================
// IMÁGENES - DROP
// =========================================================

imageDropZone.addEventListener(
    "drop",
    event => {

        const file =
            event
                .dataTransfer
                ?.files?.[0];


        if (
            file
        ) {

            processImage(
                file
            );

        }

    }
);


// =========================================================
// IMÁGENES - PROCESAR ARCHIVO
// =========================================================

function processImage(
    file
) {

    // =====================================================
    // VALIDAR TIPO
    // =====================================================

    if (
        !ALLOWED_IMAGE_TYPES
            .includes(
                file.type
            )
    ) {

        imageInput.value =
            "";


        showToast(

            "Formato no permitido",

            (
                "Solo se permiten imágenes " +
                "JPG, JPEG, PNG y WEBP."
            ),

            "danger"

        );


        return;

    }


    // =====================================================
    // VALIDAR TAMAÑO
    // =====================================================

    if (
        !validateFileSize(
            file,
            MAX_IMAGE_SIZE_MB
        )
    ) {

        imageInput.value =
            "";


        showToast(

            "Imagen demasiado grande",

            (
                "La imagen no debe superar " +
                `${MAX_IMAGE_SIZE_MB} MB.`
            ),

            "danger"

        );


        return;

    }


    // =====================================================
    // GUARDAR
    // =====================================================

    selectedImage =
        file;


    // =====================================================
    // LIBERAR URL PREVIA
    // =====================================================

    releaseImagePreviewUrl();


    // =====================================================
    // CREAR PREVIEW
    // =====================================================

    imagePreviewUrl =
        URL.createObjectURL(
            file
        );


    imagePreview.src =
        imagePreviewUrl;


    imagePreview.alt =
        (
            "Vista previa de " +
            file.name
        );


    // =====================================================
    // ACTUALIZAR INTERFAZ
    // =====================================================

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
// IMÁGENES - QUITAR ARCHIVO
// =========================================================

function removeImage() {

    // =====================================================
    // BORRAR ESTADO
    // =====================================================

    selectedImage =
        null;


    imageInput.value =
        "";


    // =====================================================
    // LIBERAR OBJECT URL
    // =====================================================

    releaseImagePreviewUrl();


    // =====================================================
    // LIMPIAR IMG
    // =====================================================

    imagePreview
        .removeAttribute(
            "src"
        );


    imagePreview.alt =
        "Vista previa de la imagen seleccionada";


    // =====================================================
    // INTERFAZ
    // =====================================================

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


    showToast(

        "Imagen eliminada",

        (
            "La imagen seleccionada " +
            "fue retirada."
        ),

        "info"

    );

}


// =========================================================
// IMÁGENES - LIBERAR URL TEMPORAL
// =========================================================

function releaseImagePreviewUrl() {

    if (
        !imagePreviewUrl
    ) {

        return;

    }


    URL.revokeObjectURL(
        imagePreviewUrl
    );


    imagePreviewUrl =
        null;

}


// =========================================================
// UTILIDAD - VALIDAR TAMAÑO
// =========================================================

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


// =========================================================
// MANEJO GLOBAL DE PROMESAS RECHAZADAS
// =========================================================

window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(

            "Promesa rechazada sin manejar:",

            event.reason

        );

    }
);


// =========================================================
// LIMPIEZA AL CERRAR / RECARGAR
// =========================================================

window.addEventListener(
    "beforeunload",
    () => {

        // =================================================
        // VOZ
        // =================================================

        voiceModule.destroy();


        // =================================================
        // IMAGEN
        // =================================================

        releaseImagePreviewUrl();

    }
);


// =========================================================
// INICIALIZACIÓN
// =========================================================

console.log(
    (
        "Traductor Inteligente Multimodal - " +
        "Interfaz inicializada."
    )
);


console.log(

    "Backend configurado:",

    APP_CONFIG.apiBaseUrl

);


console.log(

    "Módulos cargados:",

    {

        chat:
            Boolean(
                chatModule
            ),

        voice:
            Boolean(
                voiceModule
            ),

        documents:
            Boolean(
                documentsModule
            ),

        images:
            true

    }

);