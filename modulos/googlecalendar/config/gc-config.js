/*
  Nombre completo: gc-config.js
  Ruta: modulos/googlecalendar/config/gc-config.js

  Función:
    - Centralizar la configuración general del módulo Google Calendar.
    - Definir nombre de módulo, estados, acciones, claves locales y rutas Firebase.
    - Servir como contrato estable para storage, Firebase, autenticación, API, conexión y diagnóstico.

  Se conecta con:
    - modulos/googlecalendar/config/gc-firebase-config.js
    - modulos/googlecalendar/config/gc-google-config.js
    - modulos/googlecalendar/utils/*
    - futuras capas de Google Calendar
*/

(function initGoogleCalendarConfig(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};

  const STATUS = Object.freeze({
    IDLE: "idle",
    READY: "ready",
    PARTIAL: "partial",
    ERROR: "error",
    TESTING: "testing",
    SAVING: "saving",
    LOADING: "loading",
    CLEARED: "cleared",
    AUTH_REQUIRED: "authRequired",
    AUTHORIZED: "authorized"
  });

  const SOURCE = Object.freeze({
    FIREBASE: "firebase",
    LOCAL: "local",
    MEMORY: "memory",
    USER: "user",
    SYSTEM: "system",
    GOOGLE: "google-calendar-api",
    AUTH: "google-calendar-auth",
    NONE: "none"
  });

  const ACTION = Object.freeze({
    INIT: "init",
    READ: "read",
    SAVE: "save",
    CLEAR: "clear",
    TEST_LOCAL: "testLocal",
    TEST_FIREBASE: "testFirebase",
    START_AUTH: "startAuth",
    EXCHANGE_CODE: "exchangeCode",
    REFRESH_ACCESS: "refreshAccess",
    TEST_GOOGLE: "testGoogle",
    READ_EVENTS: "readEvents",
    CREATE_EVENT: "createEvent",
    DIAGNOSTIC: "diagnostic"
  });

  const FILE_HINTS = Object.freeze({
    MODULE_HTML: "modulos/googlecalendar/gc-module.html",
    MODULE_CSS: "modulos/googlecalendar/gc-module.css",
    CONFIG: "modulos/googlecalendar/config/gc-config.js",
    FIREBASE_CONFIG: "modulos/googlecalendar/config/gc-firebase-config.js",
    GOOGLE_CONFIG: "modulos/googlecalendar/config/gc-google-config.js",
    UTILS: "modulos/googlecalendar/utils/",
    STORAGE: "modulos/googlecalendar/storage/",
    FIREBASE: "modulos/googlecalendar/firebase/",
    AUTH: "modulos/googlecalendar/auth/",
    API: "modulos/googlecalendar/api/",
    CONNECTION: "modulos/googlecalendar/connection/",
    DIAGNOSTIC: "modulos/googlecalendar/diagnostic/",
    CONNECTOR: "modulos/googlecalendar/connector/",
    UI: "modulos/googlecalendar/ui/",
    STARTUP: "modulos/googlecalendar/startup/gc-start.js"
  });

  const CONFIG = Object.freeze({
    module: Object.freeze({
      id: "googleCalendar",
      prefix: "gc",
      name: "Google Calendar",
      title: "Conexión Google Calendar",
      version: "0.1.0",
      description: "Módulo independiente para conectar AgendaJeff con Google Calendar."
    }),

    firebase: Object.freeze({
      collection: "conexiones",
      document: "googleCalendar",
      provider: "googleCalendar",
      appName: "AgendaJeff",
      source: "google-calendar-module-v1"
    }),

    storage: Object.freeze({
      mainKey: "agendaJeff.googleCalendar.connection.v1",
      backupKey: "agendaJeff.googleCalendar.backup.v1",
      authKey: "agendaJeff.googleCalendar.auth.v1",
      diagnosticKey: "agendaJeff.googleCalendar.diagnostic.v1",
      lastResultKey: "agendaJeff.googleCalendar.lastResult.v1"
    }),

    google: Object.freeze({
      defaultCalendarId: "primary",
      defaultCredentialType: "desktop",
      runtimeMode: "desktop",
      provider: "googleCalendar",
      apiBaseUrl: "https://www.googleapis.com/calendar/v3",
      oauthBaseUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      exchangeUrl: "https://oauth2.googleapis.com/token"
    }),

    defaults: Object.freeze({
      enabled: true,
      activeCredentialType: "desktop",
      calendarId: "primary",
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
      proveedor: CONFIG.firebase.provider,
      appName: CONFIG.firebase.appName,
      source: CONFIG.defaults.source,
      status: CONFIG.defaults.status,
      estado: CONFIG.defaults.status,
      activeCredentialType: CONFIG.defaults.activeCredentialType,
      calendarId: CONFIG.defaults.calendarId,
      clientIdDesktop: "",
      clientIdDesktopMasked: "",
      clientIdWeb: "",
      clientIdWebMasked: "",
      configured: false,
      configurado: false,
      firebaseConnectionOk: false,
      firebaseConexionOk: false,
      googleConnectionOk: false,
      calendarConnectionOk: false,
      fallbackUsed: false,
      runtimeMode: CONFIG.google.runtimeMode,
      lastAction: CONFIG.defaults.lastAction,
      ultimaAccion: CONFIG.defaults.lastAction,
      lastError: CONFIG.defaults.lastError,
      ultimoError: CONFIG.defaults.lastError,
      lastErrorFile: "",
      lastCheckedAt: CONFIG.defaults.lastCheckedAt,
      updatedAt: CONFIG.defaults.updatedAt,
      actualizadoEn: CONFIG.defaults.updatedAt
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

  googleCalendar.CONFIG = CONFIG;
  googleCalendar.getDefaultConnection = getDefaultConnection;
  googleCalendar.createResult = createResult;
})(window);
