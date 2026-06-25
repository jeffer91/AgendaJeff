/*
  Nombre completo: tl-config.js
  Ruta: modulos/telegram/config/tl-config.js

  Función:
    - Centralizar la configuración general del módulo Telegram.
    - Definir nombres de módulo, estados, claves locales y rutas Firebase.
    - Evitar valores repetidos en archivos de storage, Firebase, conexión y diagnóstico.
    - Servir como contrato estable para el resto del módulo Telegram.

  Se conecta con:
    - modulos/telegram/config/tl-firebase-config.js
    - modulos/telegram/storage/*
    - modulos/telegram/firebase/*
    - modulos/telegram/api/*
    - modulos/telegram/connection/*
    - modulos/telegram/diagnostic/*
    - modulos/telegram/connector/*
*/

(function initTelegramConfig(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};

  const STATUS = Object.freeze({
    IDLE: "idle",
    READY: "ready",
    PARTIAL: "partial",
    ERROR: "error",
    TESTING: "testing",
    SAVING: "saving",
    LOADING: "loading",
    CLEARED: "cleared"
  });

  const SOURCE = Object.freeze({
    FIREBASE: "firebase",
    LOCAL: "local",
    MEMORY: "memory",
    USER: "user",
    SYSTEM: "system",
    NONE: "none"
  });

  const ACTION = Object.freeze({
    INIT: "init",
    READ: "read",
    SAVE: "save",
    CLEAR: "clear",
    TEST_LOCAL: "testLocal",
    TEST_FIREBASE: "testFirebase",
    TEST_TELEGRAM: "testTelegram",
    SEND_MESSAGE: "sendMessage",
    SEND_TEST_MESSAGE: "sendTestMessage",
    DIAGNOSTIC: "diagnostic"
  });

  const FILE_HINTS = Object.freeze({
    CONFIG: "modulos/telegram/config/tl-config.js",
    FIREBASE_CONFIG: "modulos/telegram/config/tl-firebase-config.js",
    LOCAL_READ: "modulos/telegram/storage/tl-local-read.js",
    LOCAL_SAVE: "modulos/telegram/storage/tl-local-save.js",
    LOCAL_CLEAR: "modulos/telegram/storage/tl-local-clear.js",
    LOCAL_TEST: "modulos/telegram/storage/tl-local-test.js",
    FIREBASE_INIT: "modulos/telegram/firebase/tl-firebase-init.js",
    FIREBASE_READ: "modulos/telegram/firebase/tl-firebase-read.js",
    FIREBASE_SAVE: "modulos/telegram/firebase/tl-firebase-save.js",
    FIREBASE_TEST: "modulos/telegram/firebase/tl-firebase-test.js",
    API_URL: "modulos/telegram/api/tl-api-url.js",
    API_GETME: "modulos/telegram/api/tl-api-getme.js",
    API_SEND: "modulos/telegram/api/tl-api-send.js",
    API_TEST: "modulos/telegram/api/tl-api-test.js",
    CONNECTION_READ: "modulos/telegram/connection/tl-connection-read.js",
    CONNECTION_SAVE: "modulos/telegram/connection/tl-connection-save.js",
    CONNECTION_CLEAR: "modulos/telegram/connection/tl-connection-clear.js",
    CONNECTION_STATUS: "modulos/telegram/connection/tl-connection-status.js",
    CONNECTION_TEST: "modulos/telegram/connection/tl-connection-test.js",
    DIAGNOSTIC: "modulos/telegram/diagnostic/",
    CONNECTOR: "modulos/telegram/connector/",
    UI: "modulos/telegram/ui/",
    STARTUP: "modulos/telegram/startup/tl-start.js"
  });

  const CONFIG = Object.freeze({
    module: Object.freeze({
      id: "telegram",
      prefix: "tl",
      name: "Telegram",
      title: "Conexión Telegram",
      version: "0.1.0",
      description: "Módulo independiente para conectar AgendaJeff con Telegram Bot API."
    }),

    firebase: Object.freeze({
      collection: "conexiones",
      document: "telegram",
      provider: "telegram",
      appName: "AgendaJeff",
      source: "telegram-module-v2"
    }),

    storage: Object.freeze({
      mainKey: "agendaJeff.telegram.connection.v2",
      backupKey: "agendaJeff.telegram.backup.v2",
      diagnosticKey: "agendaJeff.telegram.diagnostic.v2",
      lastResultKey: "agendaJeff.telegram.lastResult.v2"
    }),

    telegramApi: Object.freeze({
      baseUrl: "https://api.telegram.org",
      getMeMethod: "getMe",
      sendMessageMethod: "sendMessage",
      defaultParseMode: "HTML",
      requestTimeoutMs: 15000
    }),

    defaults: Object.freeze({
      enabled: true,
      botToken: "",
      chatId: "",
      status: STATUS.IDLE,
      source: SOURCE.NONE,
      lastError: "",
      lastAction: "",
      lastCheckedAt: "",
      updatedAt: ""
    }),

    status: STATUS,
    source: SOURCE,
    action: ACTION,
    fileHints: FILE_HINTS
  });

  function getDefaultConnection() {
    return {
      enabled: CONFIG.defaults.enabled,
      provider: CONFIG.firebase.provider,
      appName: CONFIG.firebase.appName,
      source: CONFIG.defaults.source,
      status: CONFIG.defaults.status,
      botToken: CONFIG.defaults.botToken,
      chatId: CONFIG.defaults.chatId,
      botTokenMasked: "",
      chatIdMasked: "",
      botConfigured: false,
      chatConfigured: false,
      firebaseConnectionOk: false,
      telegramConnectionOk: false,
      lastAction: CONFIG.defaults.lastAction,
      lastError: CONFIG.defaults.lastError,
      lastErrorFile: "",
      lastCheckedAt: CONFIG.defaults.lastCheckedAt,
      updatedAt: CONFIG.defaults.updatedAt
    };
  }

  function createResult(payload) {
    const data = payload && typeof payload === "object" ? payload : {};

    return {
      ok: Boolean(data.ok),
      status: data.status || (data.ok ? STATUS.READY : STATUS.ERROR),
      action: data.action || "",
      source: data.source || SOURCE.SYSTEM,
      message: data.message || "",
      file: data.file || "",
      data: data.data || null,
      error: data.error || null,
      checkedAt: data.checkedAt || new Date().toISOString()
    };
  }

  telegram.CONFIG = CONFIG;
  telegram.getDefaultConnection = getDefaultConnection;
  telegram.createResult = createResult;
})(window);
