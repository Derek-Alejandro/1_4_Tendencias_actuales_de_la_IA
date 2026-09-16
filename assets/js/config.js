/*
=========================================================
CONFIGURACIÓN DEL FRONTEND
=========================================================

Este archivo NO debe contener la API Key de OpenAI.

La API Key real solamente existirá en el backend
y posteriormente como Environment Variable en Vercel.
*/


export const APP_CONFIG = {

    development: {

        apiBaseUrl:
            "http://127.0.0.1:8000"

    },

    production: {

        /*
        Posteriormente colocaremos aquí
        la URL pública de Vercel.

        Ejemplo:

        https://mi-backend.vercel.app
        */

        apiBaseUrl:
            ""

    }

};