/*
  Nombre completo: gc-config.js
  Ruta: modulos/google-calendar/config/gc-config.js

  Función:
    - Centralizar la configuración general del módulo Google Calendar.
    - Definir estados, fuentes, acciones, claves locales, documento Firebase y scopes de Google.
    - Evitar valores repetidos en storage, Firebase, OAuth, API, conexión y diagnóstico.
    - Servir como contrato estable para el resto del módulo Google Calendar.

  Se conecta con:
    - modulos/google-calendar/config/gc-firebase-config.js
    - modulos/google-calendar/utils/*
    - modulos/google-calendar/storage/*
    - modulos/google-calendar/firebase/*
    - modulos/google-calendar/oauth/*
    - modulos/google-calendar/api/*
    - modulos/google-calendar/connection/*
    - modulos/google-calendar/diagnostic/*
    - modulos/google-calendar/connector/*
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
    AUTHORIZED: "authorized",
    UNAUTHORIZED: "unauthorized"
  });

  const SOURCE = Object.freeze({
    FIREBASE: "firebase",
    LOCAL: "local",
    MEMORY: "memory",
    USER: "user",
    SYSTEM: "system",
    GOOGLE: "google-api",
    OAUTH: "google-oauth",
    NONE: "none"
  });

  const ACTION = Object.freeze({
    INIT: "init",
    READ: "read",
    SAVE: "save",
    CLEAR: "clear",
    AUTHORIZE: "authorize",
    REVOKE: "revoke",
    TEST_LOCAL: "testLocal",
    TEST_FIREBASE: "testFirebase",
    TEST_GOOGLE: "testGoogle",
    TEST_CALENDAR: "testCalendar",
    LIST_CALENDARS: "listCalendars",
    LIST_EVENTS: "listEvents",
    CREATE_EVENT: "createEvent",
    DIAGNOSTIC: "diagnostic"
  });

  const FILE_HINTS = Object.freeze({
    CONFIG: "modulos/google-calendar/config/gc-config.js",
    FIREBASE_CONFIG: "modulos/google-calendar/config/gc-firebase-config.js",
    LOCAL_READ: "modulos/google-calendar/storage/gc-local-read.js",
    LOCAL_SAVE: "modulos/google-calendar/storage/gc-local-save.js",
    LOCAL_CLEAR: "modulos/google-calendar/storage/gc-local-clear.js",
    LOCAL_TEST: "modulos/google-calendar/storage/gc-local-test.js",
    FIREBASE_INIT: "modulos/google-calendar/firebase/gc-firebase-init.js",
    FIREBASE_READ: "modulos/google-calendar/firebase/gc-firebase-read.js",
    FIREBASE_SAVE: "modulos/google-calendar/firebase/gc-firebase-save.js",
    FIREBASE_TEST: "modulos/google-calendar/firebase/gc-firebase-test.js",
    OAUTH_TOKEN: "modulos/google-calendar/oauth/gc-token.service.js",
    GOOGLE_API: "modulos/google-calendar/api/gc-google-api.js",
    API_CALENDARS: "modulos/google-calendar/api/gc-api-calendars.js",
    API_EVENTS: "modulos/google-calendar/api/gc-api-events.js",
    API_TEST: "modulos/google-calendar/api/gc-api-test.js",
    CONNECTION_READ: "modulos/google-calendar/connection/gc-connection-read.js",
    CONNECTION_SAVE: "modulos/google-calendar/connection/gc-connection-save.js",
    CONNECTION_CLEAR: "modulos/google-calendar/connection/gc-connection-clear.js",
    CONNECTION_STATUS: "modulos/google-calendar/connection/gc-connection-status.js",
    CONNECTION_TEST: "modulos/google-calendar/connection/gc-connection-test.js",
    DIAGNOSTIC: "modulos/google-calendar/diagnostic/",
    CONNECTOR: "modulos/google-calendar/connector/",
    UI: "modulos/google-calendar/ui/",
    STARTUP: "modulos/google-calendar/startup/gc-start.js"
  });

  const CONFIG = Object.freeze({
    module: Object.freeze({
      id: "google-calendar",
      prefix: "gc",
      name: "Google Calendar",
      title: "Conexión Google Calendar",
      version: "0.1.0",
      description: "Módulo independiente para conectar AgendaJeff con Google Calendar."
    }),

    firebase: Object.freeze({
      collection: "conexiones",
      document: "google-calendar",
      provider: "google-calendar",
      appName: "AgendaJeff",
      source: "google-calendar-module-v1"
    }),

    storage: Object.freeze({
      mainKey: "agendaJeff.googleCalendar.connection.v1",
      backupKey: "agendaJeff.googleCalendar.backup.v1",
      tokenKey: "agendaJeff.googleCalendar.token.v1",
      diagnosticKey: "agendaJeff.googleCalendar.diagnostic.v1",
      lastResultKey: "agendaJeff.googleCalendar.lastResult.v1"
    }),

    google: Object.freeze({
      apiBaseUrl: "https://www.googleapis.com/calendar/v3",
      identityScriptUrl: "https://accounts.google.com/gsi/client",
      defaultCalendarId: "primary",
      defaultTimeZone: "America/Guayaquil",
      scopes: Object.freeze([
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly"
      ]),
      discoveryDocs: Object.freeze([
        "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"
      ]),
      requestTimeoutMs: 15000
    }),

    defaults: Object.freeze({
      enabled: true,
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      calendarId: "primary",
      accountEmail: "",
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
      clientId: CONFIG.defaults.clientId,
      clientSecret: CONFIG.defaults.clientSecret,
      clientIdMasked: "",
      clientSecretMasked: "",
      redirectUri: CONFIG.defaults.redirectUri,
      calendarId: CONFIG.defaults.calendarId,
      accountEmail: CONFIG.defaults.accountEmail,
      clientConfigured: false,
      calendarConfigured: true,
      googleAuthorized: false,
      firebaseConnectionOk: false,
      googleConnectionOk: false,
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

  googleCalendar.CONFIG = CONFIG;
  googleCalendar.getDefaultConnection = getDefaultConnection;
  googleCalendar.createResult = createResult;
})(window);
