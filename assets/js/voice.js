// =========================================================
// MÓDULO DE VOZ EN TIEMPO REAL
// =========================================================

export class VoiceModule {

    constructor({
        apiBaseUrl,
        button,
        microphoneAnimation,
        title,
        status,
        connectionBadge,
        transcript,
        showToast
    }) {

        this.apiBaseUrl = apiBaseUrl;

        this.button = button;

        this.microphoneAnimation =
            microphoneAnimation;

        this.title = title;

        this.status = status;

        this.connectionBadge =
            connectionBadge;

        this.transcript =
            transcript;

        this.showToast =
            showToast;


        // ================================================
        // WEBRTC
        // ================================================

        this.peerConnection =
            null;

        this.dataChannel =
            null;

        this.localStream =
            null;

        this.remoteAudio =
            null;


        // ================================================
        // ESTADO
        // ================================================

        this.active =
            false;

        this.connecting =
            false;

        this.stopping =
            false;


        // ================================================
        // TRANSCRIPCIÓN IA
        // ================================================

        this.currentAssistantText =
            "";

        this.currentAssistantElement =
            null;


        this.bindEvents();

    }


    // =====================================================
    // EVENTOS
    // =====================================================

    bindEvents() {

        this.button.addEventListener(
            "click",
            async () => {

                if (
                    this.active ||
                    this.connecting
                ) {

                    this.stopConversation();

                    return;

                }


                await this.startConversation();

            }
        );

    }


    // =====================================================
    // INICIAR CONVERSACIÓN
    // =====================================================

    async startConversation() {

        if (
            this.active ||
            this.connecting
        ) {

            return;

        }


        // =================================================
        // VALIDAR MICRÓFONO
        // =================================================

        if (
            !navigator.mediaDevices?.getUserMedia
        ) {

            this.showToast(
                "Micrófono no disponible",
                (
                    "Este navegador no permite " +
                    "utilizar el micrófono."
                ),
                "danger"
            );

            return;

        }


        // =================================================
        // VALIDAR WEBRTC
        // =================================================

        if (
            typeof RTCPeerConnection ===
            "undefined"
        ) {

            this.showToast(
                "WebRTC no disponible",
                (
                    "Este navegador no permite iniciar " +
                    "la conversación de voz."
                ),
                "danger"
            );

            return;

        }


        this.connecting =
            true;


        this.setConnectingState();


        try {

            // =============================================
            // 1. SOLICITAR MICRÓFONO
            // =============================================

            this.localStream =
                await navigator
                    .mediaDevices
                    .getUserMedia({

                        audio: {

                            echoCancellation:
                                true,

                            noiseSuppression:
                                true,

                            autoGainControl:
                                true

                        }

                    });


            // =============================================
            // 2. CREAR CONEXIÓN WEBRTC
            // =============================================

            this.peerConnection =
                new RTCPeerConnection();


            // =============================================
            // 3. PREPARAR AUDIO DE RESPUESTA
            // =============================================

            this.remoteAudio =
                document.createElement(
                    "audio"
                );


            this.remoteAudio.autoplay =
                true;


            this.remoteAudio.playsInline =
                true;


            this.remoteAudio.style.display =
                "none";


            document.body.appendChild(
                this.remoteAudio
            );


            // =============================================
            // 4. RECIBIR AUDIO DE OPENAI
            // =============================================

            this.peerConnection
                .addEventListener(
                    "track",
                    event => {

                        const [
                            remoteStream
                        ] = event.streams;


                        if (
                            !remoteStream ||
                            !this.remoteAudio
                        ) {

                            return;

                        }


                        this.remoteAudio.srcObject =
                            remoteStream;


                        this.remoteAudio
                            .play()
                            .catch(
                                () => {

                                    /*
                                    Algunos navegadores
                                    reproducen automáticamente
                                    cuando llega audio WebRTC.
                                    */

                                }
                            );

                    }
                );


            // =============================================
            // 5. ENVIAR MICRÓFONO
            // =============================================

            this.localStream
                .getTracks()
                .forEach(
                    track => {

                        this.peerConnection
                            .addTrack(
                                track,
                                this.localStream
                            );

                    }
                );


            // =============================================
            // 6. CANAL DE EVENTOS OPENAI
            // =============================================

            this.dataChannel =
                this.peerConnection
                    .createDataChannel(
                        "oai-events"
                    );


            this.configureDataChannel();


            // =============================================
            // 7. OBSERVAR ESTADO WEBRTC
            // =============================================

            this.peerConnection
                .addEventListener(
                    "connectionstatechange",
                    () => {

                        this.handleConnectionState();

                    }
                );


            // =============================================
            // 8. CREAR OFFER
            // =============================================

            const offer =
                await this.peerConnection
                    .createOffer();


            await this.peerConnection
                .setLocalDescription(
                    offer
                );


            // Esperamos brevemente a ICE.

            await this.waitForIceGathering();


            const localDescription =
                this.peerConnection
                    .localDescription;


            if (
                !localDescription?.sdp
            ) {

                throw new Error(
                    (
                        "No fue posible generar " +
                        "la oferta WebRTC."
                    )
                );

            }


            // =============================================
            // 9. ENVIAR SDP A VERCEL
            // =============================================

            const response =
                await fetch(
                    (
                        `${this.apiBaseUrl}` +
                        `/api/realtime/session`
                    ),
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                sdp:
                                    localDescription.sdp

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
                    (
                        "El backend devolvió " +
                        "una respuesta no válida."
                    )
                );

            }


            // =============================================
            // 10. VALIDAR RESPUESTA
            // =============================================

            if (
                !response.ok
            ) {

                throw new Error(
                    (
                        result?.detail ||
                        (
                            "No fue posible crear " +
                            "la sesión de voz."
                        )
                    )
                );

            }


            const answerSdp =
                result?.data?.sdp;


            if (
                !answerSdp
            ) {

                throw new Error(
                    (
                        "El servidor no devolvió una " +
                        "respuesta WebRTC válida."
                    )
                );

            }


            // =============================================
            // 11. COMPLETAR WEBRTC
            // =============================================

            await this.peerConnection
                .setRemoteDescription({

                    type:
                        "answer",

                    sdp:
                        answerSdp

                });


            // =============================================
            // 12. SESIÓN ACTIVA
            // =============================================

            this.active =
                true;


            this.connecting =
                false;


            this.prepareTranscript();


            this.setConnectedState();


            this.showToast(
                "Conversación activa",
                (
                    "Habla en español o inglés. " +
                    "La IA traducirá tu voz al " +
                    "idioma contrario."
                ),
                "success"
            );

        }

        catch (
            error
        ) {

            console.error(
                "Error de voz:",
                error
            );


            this.connecting =
                false;


            this.active =
                false;


            this.closeResources();


            this.setDisconnectedState();


            this.showToast(
                "Error de voz",

                (
                    error instanceof Error
                        ? error.message
                        : (
                            "No fue posible iniciar " +
                            "la conversación de voz."
                        )
                ),

                "danger"
            );

        }

    }


    // =====================================================
    // CONFIGURAR DATA CHANNEL
    // =====================================================

    configureDataChannel() {

        if (
            !this.dataChannel
        ) {

            return;

        }


        // ================================================
        // CANAL ABIERTO
        // ================================================

        this.dataChannel
            .addEventListener(
                "open",
                () => {

                    this.status.textContent =
                        (
                            "Conexión establecida. " +
                            "Habla en español o inglés."
                        );

                }
            );


        // ================================================
        // MENSAJES OPENAI
        // ================================================

        this.dataChannel
            .addEventListener(
                "message",
                event => {

                    try {

                        const data =
                            JSON.parse(
                                event.data
                            );


                        this.handleRealtimeEvent(
                            data
                        );

                    }

                    catch (
                        error
                    ) {

                        console.warn(
                            (
                                "Evento Realtime " +
                                "no reconocido:"
                            ),
                            error
                        );

                    }

                }
            );


        // ================================================
        // ERROR
        // ================================================

        this.dataChannel
            .addEventListener(
                "error",
                error => {

                    console.error(
                        (
                            "Error del canal " +
                            "Realtime:"
                        ),
                        error
                    );

                }
            );


        // ================================================
        // CANAL CERRADO
        // ================================================

        this.dataChannel
            .addEventListener(
                "close",
                () => {

                    if (
                        !this.stopping &&
                        this.active
                    ) {

                        this.stopConversation(
                            false
                        );

                    }

                }
            );

    }


    // =====================================================
    // PROCESAR EVENTOS REALTIME
    // =====================================================

    handleRealtimeEvent(
        event
    ) {

        if (
            !event ||
            typeof event.type !== "string"
        ) {

            return;

        }


        switch (
            event.type
        ) {

            // =============================================
            // USUARIO EMPIEZA A HABLAR
            // =============================================

            case "input_audio_buffer.speech_started":

                this.title.textContent =
                    "Escuchando...";


                this.status.textContent =
                    (
                        "Estoy escuchando tu mensaje."
                    );

                break;


            // =============================================
            // USUARIO TERMINA DE HABLAR
            // =============================================

            case "input_audio_buffer.speech_stopped":

                this.title.textContent =
                    "Traduciendo...";


                this.status.textContent =
                    (
                        "Procesando tu mensaje y " +
                        "preparando la traducción."
                    );

                break;


            // =============================================
            // TRANSCRIPCIÓN DEL USUARIO
            // =============================================

            case "conversation.item.input_audio_transcription.completed":

                if (
                    event.transcript
                ) {

                    this.renderTranscriptMessage(
                        "user",
                        event.transcript
                    );

                }

                break;


            // =============================================
            // ERROR DE TRANSCRIPCIÓN
            // =============================================

            case "conversation.item.input_audio_transcription.failed":

                this.showToast(
                    "Transcripción no disponible",

                    (
                        event?.error?.message ||
                        (
                            "No fue posible transcribir " +
                            "el audio del usuario."
                        )
                    ),

                    "warning"
                );

                break;


            // =============================================
            // TRADUCCIÓN IA EN STREAMING
            // =============================================

            case "response.output_audio_transcript.delta":

                this.appendAssistantDelta(
                    event.delta || ""
                );

                break;


            // =============================================
            // TRADUCCIÓN IA COMPLETA
            // =============================================

            case "response.output_audio_transcript.done":

                this.finishAssistantTranscript(
                    (
                        event.transcript ||
                        this.currentAssistantText
                    )
                );

                break;


            // =============================================
            // RESPUESTA COMPLETA
            // =============================================

            case "response.done":

                this.title.textContent =
                    "Micrófono activo";


                this.status.textContent =
                    (
                        "Puedes continuar hablando " +
                        "en español o inglés."
                    );

                break;


            // =============================================
            // ERROR REALTIME
            // =============================================

            case "error":

                console.error(
                    "OpenAI Realtime:",
                    event
                );


                this.showToast(
                    "Error en la conversación",

                    (
                        event?.error?.message ||
                        (
                            "Ocurrió un error durante " +
                            "la traducción."
                        )
                    ),

                    "danger"
                );

                break;


            // =============================================
            // OTROS EVENTOS
            // =============================================

            default:

                /*
                OpenAI Realtime envía otros
                eventos internos.

                No necesitamos mostrarlos.
                */

                break;

        }

    }


    // =====================================================
    // LIMPIAR ÁREA DE TRANSCRIPCIÓN
    // =====================================================

    prepareTranscript() {

        this.transcript.innerHTML =
            "";

    }


    // =====================================================
    // MOSTRAR MENSAJE
    // =====================================================

    renderTranscriptMessage(
        role,
        text
    ) {

        const cleanText =
            String(
                text || ""
            ).trim();


        if (
            !cleanText
        ) {

            return;

        }


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            (
                "voice-transcript-message " +
                (
                    role === "user"
                        ? "voice-user-message"
                        : "voice-ai-message"
                )
            );


        // ================================================
        // HEADER
        // ================================================

        const header =
            document.createElement(
                "div"
            );


        header.className =
            "voice-transcript-header";


        const name =
            document.createElement(
                "strong"
            );


        name.textContent =
            (
                role === "user"
                    ? "🎙️ Tú · Original"
                    : "✨ IA · Traducción"
            );


        // ================================================
        // TEXTO
        // ================================================

        const paragraph =
            document.createElement(
                "p"
            );


        paragraph.textContent =
            cleanText;


        header.appendChild(
            name
        );


        wrapper.append(
            header,
            paragraph
        );


        this.transcript.appendChild(
            wrapper
        );


        this.scrollTranscript();

    }


    // =====================================================
    // TRADUCCIÓN IA - DELTAS
    // =====================================================

    appendAssistantDelta(
        delta
    ) {

        if (
            !delta
        ) {

            return;

        }


        this.currentAssistantText +=
            delta;


        // ================================================
        // CREAR BURBUJA
        // ================================================

        if (
            !this.currentAssistantElement
        ) {

            this.currentAssistantElement =
                document.createElement(
                    "div"
                );


            this.currentAssistantElement.className =
                (
                    "voice-transcript-message " +
                    "voice-ai-message"
                );


            const header =
                document.createElement(
                    "div"
                );


            header.className =
                "voice-transcript-header";


            const strong =
                document.createElement(
                    "strong"
                );


            strong.textContent =
                "✨ IA · Traducción";


            const paragraph =
                document.createElement(
                    "p"
                );


            header.appendChild(
                strong
            );


            this.currentAssistantElement
                .append(
                    header,
                    paragraph
                );


            this.transcript.appendChild(
                this.currentAssistantElement
            );

        }


        // ================================================
        // ACTUALIZAR TEXTO
        // ================================================

        const paragraph =
            this.currentAssistantElement
                .querySelector(
                    "p"
                );


        if (
            paragraph
        ) {

            paragraph.textContent =
                this.currentAssistantText;

        }


        this.scrollTranscript();

    }


    // =====================================================
    // FINALIZAR TEXTO IA
    // =====================================================

    finishAssistantTranscript(
        finalText
    ) {

        const cleanText =
            String(
                finalText || ""
            ).trim();


        if (
            this.currentAssistantElement
        ) {

            const paragraph =
                this.currentAssistantElement
                    .querySelector(
                        "p"
                    );


            if (
                paragraph
            ) {

                paragraph.textContent =
                    (
                        cleanText ||
                        this.currentAssistantText
                    );

            }


            this.currentAssistantElement =
                null;

        }

        else if (
            cleanText
        ) {

            this.renderTranscriptMessage(
                "assistant",
                cleanText
            );

        }


        this.currentAssistantText =
            "";


        this.scrollTranscript();

    }


    // =====================================================
    // ESPERAR ICE
    // =====================================================

    waitForIceGathering() {

        return new Promise(
            resolve => {

                if (
                    !this.peerConnection ||
                    this.peerConnection
                        .iceGatheringState ===
                        "complete"
                ) {

                    resolve();

                    return;

                }


                const timeoutId =
                    window.setTimeout(
                        () => {

                            cleanup();

                            resolve();

                        },
                        3000
                    );


                const handleIceStateChange =
                    () => {

                        if (
                            this.peerConnection
                                ?.iceGatheringState ===
                                "complete"
                        ) {

                            cleanup();

                            resolve();

                        }

                    };


                const cleanup =
                    () => {

                        window.clearTimeout(
                            timeoutId
                        );


                        this.peerConnection
                            ?.removeEventListener(
                                (
                                    "icegatheringstatechange"
                                ),
                                handleIceStateChange
                            );

                    };


                this.peerConnection
                    .addEventListener(
                        (
                            "icegatheringstatechange"
                        ),
                        handleIceStateChange
                    );

            }
        );

    }


    // =====================================================
    // ESTADO WEBRTC
    // =====================================================

    handleConnectionState() {

        if (
            !this.peerConnection ||
            this.stopping
        ) {

            return;

        }


        const state =
            this.peerConnection
                .connectionState;


        // ================================================
        // CONECTADO
        // ================================================

        if (
            state === "connected"
        ) {

            this.active =
                true;


            this.connecting =
                false;


            this.setConnectedState();


            return;

        }


        // ================================================
        // FALLÓ
        // ================================================

        if (
            state === "failed"
        ) {

            this.showToast(
                "Conexión finalizada",
                (
                    "La conexión de voz falló."
                ),
                "warning"
            );


            this.stopConversation(
                false
            );


            return;

        }


        // ================================================
        // CERRADA
        // ================================================

        if (
            state === "closed"
        ) {

            this.stopConversation(
                false
            );

        }

    }


    // =====================================================
    // DETENER CONVERSACIÓN
    // =====================================================

    stopConversation(
        showMessage = true
    ) {

        if (
            this.stopping
        ) {

            return;

        }


        this.stopping =
            true;


        this.closeResources();


        this.active =
            false;


        this.connecting =
            false;


        this.currentAssistantText =
            "";


        this.currentAssistantElement =
            null;


        this.setDisconnectedState();


        this.stopping =
            false;


        if (
            showMessage
        ) {

            this.showToast(
                "Conversación finalizada",
                (
                    "La sesión de voz se cerró " +
                    "correctamente."
                ),
                "info"
            );

        }

    }


    // =====================================================
    // CERRAR RECURSOS
    // =====================================================

    closeResources() {

        // ================================================
        // DATA CHANNEL
        // ================================================

        if (
            this.dataChannel
        ) {

            try {

                this.dataChannel.close();

            }

            catch {

                // No hacer nada.

            }

        }


        this.dataChannel =
            null;


        // ================================================
        // WEBRTC
        // ================================================

        if (
            this.peerConnection
        ) {

            try {

                this.peerConnection.close();

            }

            catch {

                // No hacer nada.

            }

        }


        this.peerConnection =
            null;


        // ================================================
        // MICRÓFONO
        // ================================================

        if (
            this.localStream
        ) {

            this.localStream
                .getTracks()
                .forEach(
                    track => {

                        track.stop();

                    }
                );

        }


        this.localStream =
            null;


        // ================================================
        // AUDIO REMOTO
        // ================================================

        if (
            this.remoteAudio
        ) {

            try {

                this.remoteAudio.pause();


                this.remoteAudio.srcObject =
                    null;


                this.remoteAudio.remove();

            }

            catch {

                // No hacer nada.

            }

        }


        this.remoteAudio =
            null;

    }


    // =====================================================
    // UI - CONECTANDO
    // =====================================================

    setConnectingState() {

        this.button.disabled =
            true;


        this.button.innerHTML = `
            <span
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
            ></span>

            Conectando...
        `;


        this.title.textContent =
            "Conectando...";


        this.status.textContent =
            (
                "Preparando la conversación de voz " +
                "con Inteligencia Artificial."
            );


        this.connectionBadge.textContent =
            "Conectando";


        this.connectionBadge.className =
            "badge text-bg-warning";

    }


    // =====================================================
    // UI - CONECTADO
    // =====================================================

    setConnectedState() {

        this.button.disabled =
            false;


        this.button.innerHTML = `
            <i class="bi bi-stop-circle-fill"></i>
            Finalizar conversación
        `;


        this.microphoneAnimation
            .classList
            .add(
                "active"
            );


        this.title.textContent =
            "Micrófono activo";


        this.status.textContent =
            (
                "Habla en español o inglés. " +
                "La IA responderá con la " +
                "traducción hablada."
            );


        this.connectionBadge.textContent =
            "Conectado";


        this.connectionBadge.className =
            "badge text-bg-success";

    }


    // =====================================================
    // UI - DESCONECTADO
    // =====================================================

    setDisconnectedState() {

        this.button.disabled =
            false;


        this.button.innerHTML = `
            <i class="bi bi-mic-fill"></i>
            Iniciar conversación
        `;


        this.microphoneAnimation
            .classList
            .remove(
                "active"
            );


        this.title.textContent =
            "Micrófono listo";


        this.status.textContent =
            (
                "Presiona el botón para iniciar " +
                "la traducción de voz."
            );


        this.connectionBadge.textContent =
            "Desconectado";


        this.connectionBadge.className =
            "badge text-bg-secondary";

    }


    // =====================================================
    // SCROLL
    // =====================================================

    scrollTranscript() {

        requestAnimationFrame(
            () => {

                this.transcript.scrollTop =
                    this.transcript.scrollHeight;

            }
        );

    }


    // =====================================================
    // DESTRUIR MÓDULO
    // =====================================================

    destroy() {

        this.stopConversation(
            false
        );

    }

}