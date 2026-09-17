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


import {
    ImagesModule
} from "./images.js";


// =========================================================
// UTILIDAD - ELEMENTOS OBLIGATORIOS
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
// ELEMENTOS DE NAVEGACIÓN
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
// TOAST - BOOTSTRAP
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
    // OCULTAR MÓDULOS
    // =====================================================

    modules.forEach(
        module => {

            module
                .classList
                .remove(
                    "active"
                );

        }
    );


    // =====================================================
    // BUSCAR MÓDULO
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


    // =====================================================
    // MOSTRAR MÓDULO
    // =====================================================

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
    // CERRAR MENÚ MÓVIL
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
    // SCROLL
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
// VOZ
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
// IMÁGENES
// =========================================================

const imagesModule =
    new ImagesModule({

        apiBaseUrl:
            APP_CONFIG.apiBaseUrl,


        dropZone:
            getRequiredElement(
                "imageDropZone"
            ),


        input:
            getRequiredElement(
                "imageInput"
            ),


        selectButton:
            getRequiredElement(
                "btnSelectImage"
            ),


        previewContainer:
            getRequiredElement(
                "imagePreviewContainer"
            ),


        preview:
            getRequiredElement(
                "imagePreview"
            ),


        removeButton:
            getRequiredElement(
                "btnRemoveImage"
            ),


        analyzeButton:
            getRequiredElement(
                "btnAnalyzeImage"
            ),


        translationResult:
            getRequiredElement(
                "imageTranslationResult"
            ),


        generateButton:
            getRequiredElement(
                "btnGenerateTranslatedImage"
            ),


        generatedResult:
            getRequiredElement(
                "imageGeneratedResult"
            ),


        generatedImage:
            getRequiredElement(
                "generatedTranslatedImage"
            ),


        downloadButton:
            getRequiredElement(
                "btnDownloadGeneratedImage"
            ),


        showToast:
            showToast

    });


// =========================================================
// PROMESAS NO CONTROLADAS
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
        // CERRAR VOZ / WEBRTC
        // =================================================

        voiceModule.destroy();


        // =================================================
        // LIBERAR OBJECT URL DE IMÁGENES
        // =================================================

        imagesModule.destroy();

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
            Boolean(
                imagesModule
            )

    }

);