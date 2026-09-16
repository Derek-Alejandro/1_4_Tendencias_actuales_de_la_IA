// =========================================================
// CONFIGURACIÓN GENERAL
// =========================================================

const MAX_CHAT_CHARACTERS = 2000;

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

const moduleButtons = document.querySelectorAll(
    "[data-module-target]"
);

const modules = document.querySelectorAll(
    ".app-module"
);


// =========================================================
// TOAST
// =========================================================

const toastElement =
    document.getElementById("appToast");

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


    switch (type) {

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
// NAVEGACIÓN ENTRE MÓDULOS
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

const chatInput =
    document.getElementById(
        "chatInput"
    );

const characterCounter =
    document.getElementById(
        "characterCounter"
    );

const btnSendChat =
    document.getElementById(
        "btnSendChat"
    );

const btnClearChat =
    document.getElementById(
        "btnClearChat"
    );


function updateCharacterCounter() {

    const length =
        chatInput.value.length;


    characterCounter.textContent =
        `${length} / ${MAX_CHAT_CHARACTERS}`;


    if (
        length >=
        MAX_CHAT_CHARACTERS
    ) {

        characterCounter.classList.add(
            "text-danger"
        );

    } else {

        characterCounter.classList.remove(
            "text-danger"
        );

    }

}


function autoResizeTextarea() {

    chatInput.style.height =
        "auto";


    chatInput.style.height =
        `${Math.min(
            chatInput.scrollHeight,
            140
        )}px`;

}


chatInput.addEventListener(
    "input",
    () => {

        updateCharacterCounter();

        autoResizeTextarea();

    }
);


chatInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            prepareChatMessage();

        }

    }
);


btnSendChat.addEventListener(
    "click",
    prepareChatMessage
);


function prepareChatMessage() {

    const message =
        chatInput.value.trim();


    if (
        !message
    ) {

        showToast(
            "Mensaje vacío",
            "Escribe un mensaje antes de enviarlo.",
            "warning"
        );

        chatInput.focus();

        return;

    }


    /*
        En el siguiente paso esta función
        enviará el mensaje al backend.

        Por ahora únicamente comprobamos
        la interfaz.
    */

    showToast(
        "Interfaz lista",
        "El módulo de chat está preparado. La conexión con OpenAI será el siguiente paso.",
        "success"
    );

}


btnClearChat.addEventListener(
    "click",
    () => {

        chatInput.value =
            "";

        updateCharacterCounter();

        autoResizeTextarea();


        showToast(
            "Nueva conversación",
            "El área de conversación está lista.",
            "info"
        );

    }
);


// =========================================================
// VOZ
// =========================================================

const btnVoiceConversation =
    document.getElementById(
        "btnVoiceConversation"
    );

const microphoneAnimation =
    document.getElementById(
        "microphoneAnimation"
    );

const voiceTitle =
    document.getElementById(
        "voiceTitle"
    );

const voiceStatus =
    document.getElementById(
        "voiceStatus"
    );

const voiceConnectionBadge =
    document.getElementById(
        "voiceConnectionBadge"
    );


let microphoneStream =
    null;

let microphoneActive =
    false;


btnVoiceConversation.addEventListener(
    "click",
    async () => {

        if (
            microphoneActive
        ) {

            stopMicrophone();

            return;

        }


        await startMicrophone();

    }
);


async function startMicrophone() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        showToast(
            "Micrófono no disponible",
            "El navegador no permite acceder al micrófono.",
            "danger"
        );

        return;

    }


    try {

        voiceStatus.textContent =
            "Solicitando permiso para utilizar el micrófono...";


        microphoneStream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });


        microphoneActive =
            true;


        microphoneAnimation.classList.add(
            "active"
        );


        voiceTitle.textContent =
            "Micrófono activo";


        voiceStatus.textContent =
            "El acceso al micrófono funciona correctamente. En el siguiente paso conectaremos la conversación con OpenAI.";


        voiceConnectionBadge.textContent =
            "Micrófono activo";


        voiceConnectionBadge.className =
            "badge text-bg-success";


        btnVoiceConversation.innerHTML =
            `
                <i class="bi bi-stop-circle-fill"></i>
                Detener micrófono
            `;


        showToast(
            "Micrófono conectado",
            "La aplicación tiene acceso al micrófono.",
            "success"
        );

    }

    catch (
        error
    ) {

        console.error(
            "Error de micrófono:",
            error
        );


        voiceTitle.textContent =
            "Acceso denegado";


        voiceStatus.textContent =
            "No fue posible utilizar el micrófono. Revisa los permisos del navegador.";


        showToast(
            "Permiso de micrófono",
            "No fue posible acceder al micrófono.",
            "danger"
        );

    }

}


function stopMicrophone() {

    if (
        microphoneStream
    ) {

        microphoneStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

    }


    microphoneStream =
        null;

    microphoneActive =
        false;


    microphoneAnimation.classList.remove(
        "active"
    );


    voiceTitle.textContent =
        "Micrófono listo";


    voiceStatus.textContent =
        "Presiona el botón para comprobar el acceso al micrófono.";


    voiceConnectionBadge.textContent =
        "Desconectado";


    voiceConnectionBadge.className =
        "badge text-bg-secondary";


    btnVoiceConversation.innerHTML =
        `
            <i class="bi bi-mic-fill"></i>
            Iniciar conversación
        `;

}


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
    removeDocument
);


btnTranslateDocument.addEventListener(
    "click",
    () => {

        if (
            !selectedDocument
        ) {

            return;

        }


        showToast(
            "Documento preparado",
            "El archivo ya pasó las validaciones de la interfaz. Próximamente será enviado al backend.",
            "success"
        );

    }
);


// =========================================================
// DRAG AND DROP DOCUMENTOS
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

                documentDropZone.classList.add(
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

                documentDropZone.classList.remove(
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
            "Solo se permiten documentos PDF, DOCX y TXT.",
            "danger"
        );

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
            `El documento no debe superar ${MAX_DOCUMENT_SIZE_MB} MB.`,
            "danger"
        );

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


    documentSelected.classList.remove(
        "d-none"
    );


    btnTranslateDocument.disabled =
        false;


    showToast(
        "Documento seleccionado",
        "El archivo cumple las validaciones iniciales.",
        "success"
    );

}


function removeDocument() {

    selectedDocument =
        null;


    documentInput.value =
        "";


    documentSelected.classList.add(
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
    removeImage
);


btnAnalyzeImage.addEventListener(
    "click",
    () => {

        if (
            !selectedImage
        ) {

            return;

        }


        showToast(
            "Imagen preparada",
            "La imagen está lista para enviarse a la IA en los siguientes pasos.",
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

            return;

        }


        showToast(
            "Generación preparada",
            "La recreación visual se conectará posteriormente al servicio de generación de imágenes.",
            "info"
        );

    }
);


// =========================================================
// DRAG AND DROP IMÁGENES
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

                imageDropZone.classList.add(
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

                imageDropZone.classList.remove(
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
            "Solo se permiten imágenes JPG, PNG y WEBP.",
            "danger"
        );

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
            `La imagen no debe superar ${MAX_IMAGE_SIZE_MB} MB.`,
            "danger"
        );

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


    imageDropZone.classList.add(
        "d-none"
    );


    imagePreviewContainer.classList.remove(
        "d-none"
    );


    btnAnalyzeImage.disabled =
        false;


    /*
        El botón de generación se habilitará
        definitivamente después de analizar
        correctamente la imagen.

        Por ahora lo dejamos disponible para
        comprobar la interfaz.
    */

    btnGenerateTranslatedImage.disabled =
        false;


    showToast(
        "Imagen seleccionada",
        "La imagen cumple las validaciones iniciales.",
        "success"
    );

}


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


    imagePreviewContainer.classList.add(
        "d-none"
    );


    imageDropZone.classList.remove(
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
            Math.log(bytes) /
            Math.log(1024)
        );


    const value =
        bytes /
        Math.pow(
            1024,
            index
        );


    return (
        `${value.toFixed(2)} ${units[index]}`
    );

}


// =========================================================
// CIERRE DE PÁGINA
// =========================================================

window.addEventListener(
    "beforeunload",
    () => {

        if (
            microphoneStream
        ) {

            microphoneStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

        }


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

updateCharacterCounter();

console.log(
    "Traductor Inteligente Multimodal - Interfaz inicializada."
);