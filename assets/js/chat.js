// =========================================================
// CHAT BILINGÜE
// =========================================================

export class ChatModule {

    constructor({
        apiBaseUrl,
        chatMessages,
        chatInput,
        characterCounter,
        btnSendChat,
        btnClearChat,
        showToast
    }) {

        this.apiBaseUrl =
            apiBaseUrl;

        this.chatMessages =
            chatMessages;

        this.chatInput =
            chatInput;

        this.characterCounter =
            characterCounter;

        this.btnSendChat =
            btnSendChat;

        this.btnClearChat =
            btnClearChat;

        this.showToast =
            showToast;


        this.maxCharacters =
            2000;


        this.maxHistoryItems =
            8;


        this.history =
            [];


        this.loading =
            false;


        this.bindEvents();

        this.updateCharacterCounter();

    }


    // =====================================================
    // EVENTOS
    // =====================================================

    bindEvents() {

        this.chatInput.addEventListener(
            "input",
            () => {

                this.updateCharacterCounter();

                this.autoResizeTextarea();

            }
        );


        this.chatInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    this.sendMessage();

                }

            }
        );


        this.btnSendChat.addEventListener(
            "click",
            () => {

                this.sendMessage();

            }
        );


        this.btnClearChat.addEventListener(
            "click",
            () => {

                this.clearConversation();

            }
        );

    }


    // =====================================================
    // ENVIAR MENSAJE
    // =====================================================

    async sendMessage() {

        if (
            this.loading
        ) {

            return;

        }


        const message =
            this.chatInput.value.trim();


        if (
            !message
        ) {

            this.showToast(
                "Mensaje vacío",
                "Escribe un mensaje antes de enviarlo.",
                "warning"
            );

            this.chatInput.focus();

            return;

        }


        if (
            message.length >
            this.maxCharacters
        ) {

            this.showToast(
                "Mensaje demasiado largo",
                (
                    `El mensaje no puede superar ` +
                    `${this.maxCharacters} caracteres.`
                ),
                "danger"
            );

            return;

        }


        this.setLoading(
            true
        );


        const loadingElement =
            this.showLoadingMessage();


        try {

            const response =
                await fetch(
                    `${this.apiBaseUrl}/api/chat`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            message:
                                message,

                            history:
                                this.history

                        })
                    }
                );


            let result;


            try {

                result =
                    await response.json();

            }

            catch {

                throw new Error(
                    "El servidor devolvió una respuesta no válida."
                );

            }


            if (
                !response.ok
            ) {

                const message =
                    result?.detail ||
                    "No fue posible procesar el mensaje.";


                throw new Error(
                    message
                );

            }


            if (
                !result.success ||
                !result.data
            ) {

                throw new Error(
                    "La respuesta del servidor está incompleta."
                );

            }


            const data =
                result.data;


            loadingElement.remove();


            this.removeEmptyState();


            // =============================================
            // MENSAJE DEL USUARIO
            // =============================================

            this.renderUserMessage(
                data
            );


            // =============================================
            // RESPUESTA IA
            // =============================================

            this.renderAssistantMessage(
                data
            );


            // =============================================
            // GUARDAR CONTEXTO
            // =============================================

            this.history.push({

                user_original:
                    data.original_message,

                assistant_original:
                    data.assistant_response,

                source_language:
                    data.source_language

            });


            if (
                this.history.length >
                this.maxHistoryItems
            ) {

                this.history =
                    this.history.slice(
                        -this.maxHistoryItems
                    );

            }


            // =============================================
            // LIMPIAR INPUT
            // =============================================

            this.chatInput.value =
                "";


            this.updateCharacterCounter();

            this.autoResizeTextarea();

            this.scrollToBottom();

        }

        catch (
            error
        ) {

            console.error(
                "Error del Chat:",
                error
            );


            loadingElement.remove();


            this.showToast(
                "Error de conversación",
                error.message,
                "danger"
            );

        }

        finally {

            this.setLoading(
                false
            );

        }

    }


    // =====================================================
    // MENSAJE USUARIO
    // =====================================================

    renderUserMessage(
        data
    ) {

        const language =
            data.source_language === "es"
                ? "Español"
                : "English";


        const targetLanguage =
            data.target_language === "es"
                ? "Español"
                : "English";


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "chat-message-row user-message-row";


        const bubble =
            document.createElement(
                "div"
            );


        bubble.className =
            "chat-bubble user-bubble";


        // HEADER

        const header =
            document.createElement(
                "div"
            );


        header.className =
            "chat-bubble-header";


        const sender =
            document.createElement(
                "span"
            );


        sender.className =
            "chat-sender";


        sender.textContent =
            data.source_language === "es"
                ? "🇲🇽 Tú"
                : "🇺🇸 You";


        const badge =
            document.createElement(
                "span"
            );


        badge.className =
            "chat-language-badge";


        badge.textContent =
            language;


        header.append(
            sender,
            badge
        );


        // ORIGINAL

        const originalBlock =
            this.createTextBlock(
                "Original",
                data.original_message
            );


        // TRADUCCIÓN

        const translationBlock =
            this.createTextBlock(
                `Traducción · ${targetLanguage}`,
                data.translated_message,
                true
            );


        bubble.append(
            header,
            originalBlock,
            translationBlock
        );


        row.appendChild(
            bubble
        );


        this.chatMessages.appendChild(
            row
        );

    }


    // =====================================================
    // MENSAJE IA
    // =====================================================

    renderAssistantMessage(
        data
    ) {

        const responseLanguage =
            data.target_language === "es"
                ? "Español"
                : "English";


        const translationLanguage =
            data.source_language === "es"
                ? "Español"
                : "English";


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "chat-message-row assistant-message-row";


        const bubble =
            document.createElement(
                "div"
            );


        bubble.className =
            "chat-bubble assistant-bubble";


        // HEADER

        const header =
            document.createElement(
                "div"
            );


        header.className =
            "chat-bubble-header";


        const sender =
            document.createElement(
                "span"
            );


        sender.className =
            "chat-sender";


        sender.innerHTML =
            '<i class="bi bi-stars"></i> IA';


        const badge =
            document.createElement(
                "span"
            );


        badge.className =
            "chat-language-badge assistant-language-badge";


        badge.textContent =
            responseLanguage;


        header.append(
            sender,
            badge
        );


        // RESPUESTA

        const responseBlock =
            this.createTextBlock(
                "Respuesta",
                data.assistant_response
            );


        // TRADUCCIÓN

        const translationBlock =
            this.createTextBlock(
                `Traducción · ${translationLanguage}`,
                data.assistant_response_translation,
                true
            );


        bubble.append(
            header,
            responseBlock,
            translationBlock
        );


        row.appendChild(
            bubble
        );


        this.chatMessages.appendChild(
            row
        );

    }


    // =====================================================
    // BLOQUE DE TEXTO
    // =====================================================

    createTextBlock(
        title,
        text,
        translated = false
    ) {

        const block =
            document.createElement(
                "div"
            );


        block.className =
            translated
                ? "chat-text-block translated-block"
                : "chat-text-block";


        const label =
            document.createElement(
                "span"
            );


        label.className =
            "chat-text-label";


        label.textContent =
            title;


        const paragraph =
            document.createElement(
                "p"
            );


        /*
        textContent evita interpretar contenido
        proveniente de la IA como HTML.
        */

        paragraph.textContent =
            text;


        block.append(
            label,
            paragraph
        );


        return block;

    }


    // =====================================================
    // LOADING
    // =====================================================

    showLoadingMessage() {

        this.removeEmptyState();


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "chat-message-row assistant-message-row";


        row.innerHTML = `
            <div class="chat-bubble assistant-bubble loading-bubble">

                <div class="chat-loading">

                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>

                    <span>
                        Traduciendo y generando respuesta...
                    </span>

                </div>

            </div>
        `;


        this.chatMessages.appendChild(
            row
        );


        this.scrollToBottom();


        return row;

    }


    // =====================================================
    // ESTADO DE CARGA
    // =====================================================

    setLoading(
        loading
    ) {

        this.loading =
            loading;


        this.btnSendChat.disabled =
            loading;


        this.chatInput.disabled =
            loading;


        if (
            loading
        ) {

            this.btnSendChat.innerHTML = `
                <span
                    class="spinner-border spinner-border-sm"
                    aria-hidden="true"
                ></span>

                <span class="d-none d-sm-inline">
                    Procesando
                </span>
            `;

        }

        else {

            this.btnSendChat.innerHTML = `
                <i class="bi bi-send-fill"></i>

                <span class="d-none d-sm-inline">
                    Enviar
                </span>
            `;


            this.chatInput.focus();

        }

    }


    // =====================================================
    // CONTADOR
    // =====================================================

    updateCharacterCounter() {

        const length =
            this.chatInput.value.length;


        this.characterCounter.textContent =
            (
                `${length} / ` +
                `${this.maxCharacters}`
            );


        this.characterCounter.classList.toggle(
            "text-danger",
            length >= this.maxCharacters
        );

    }


    // =====================================================
    // TEXTAREA
    // =====================================================

    autoResizeTextarea() {

        this.chatInput.style.height =
            "auto";


        this.chatInput.style.height =
            (
                `${Math.min(
                    this.chatInput.scrollHeight,
                    140
                )}px`
            );

    }


    // =====================================================
    // ELIMINAR ESTADO VACÍO
    // =====================================================

    removeEmptyState() {

        const emptyState =
            this.chatMessages.querySelector(
                ".empty-state"
            );


        if (
            emptyState
        ) {

            emptyState.remove();

        }

    }


    // =====================================================
    // NUEVA CONVERSACIÓN
    // =====================================================

    clearConversation() {

        if (
            this.loading
        ) {

            return;

        }


        this.history =
            [];


        this.chatMessages.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    <i class="bi bi-translate"></i>
                </div>

                <h2>
                    Inicia una conversación
                </h2>

                <p>
                    Puedes escribir en español o inglés.
                    El idioma será identificado
                    automáticamente.
                </p>

                <div class="language-flow">

                    <span>
                        🇲🇽 Español
                    </span>

                    <i class="bi bi-arrow-left-right"></i>

                    <span>
                        🇺🇸 English
                    </span>

                </div>

            </div>
        `;


        this.chatInput.value =
            "";


        this.updateCharacterCounter();

        this.autoResizeTextarea();


        this.showToast(
            "Nueva conversación",
            "El historial de esta sesión fue eliminado.",
            "success"
        );

    }


    // =====================================================
    // SCROLL
    // =====================================================

    scrollToBottom() {

        requestAnimationFrame(
            () => {

                this.chatMessages.scrollTop =
                    this.chatMessages.scrollHeight;

            }
        );

    }

}