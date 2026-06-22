/*
  Nombre completo: tl-config.js
  Ruta: telegram/js/tl-config.js
  Función:
    - Centralizar constantes del módulo Telegram.
    - Crear el namespace global window.TL.
    - Definir nombres limpios para Firestore.
  Se conecta con:
    - tl-storage.js
    - tl-telegram-api.js
    - tl-event.service.js
    - tl-firebase-config.js
    - tl-firebase.service.js
    - tl-app.js
*/

(function initTlConfig(global) {
  "use strict";

  global.TL = global.TL || {};

  global.TL.CONFIG = {
    APP_NAME: "AgendaJeff",
    MODULE_NAME: "Telegram",

    STORAGE_KEY: "tl_telegram_connection_v1",

    TELEGRAM_API_BASE_URL: "https://api.telegram.org",

    FIREBASE_APP_NAME: "AgendaJeffTelegramLocal",
    FIREBASE_COLLECTION_CONNECTIONS: "conexiones",
    FIREBASE_DOC_TELEGRAM: "telegram",

    PROVIDER_TELEGRAM: "telegram",

    STATUS_IDLE: "idle",
    STATUS_CONNECTED: "connected",
    STATUS_DISCONNECTED: "disconnected",
    STATUS_ERROR: "error",

    SOURCE: "telegram-html-local",

    DEFAULT_EVENT_TITLE: "Reunión de prueba"
  };
})(window);