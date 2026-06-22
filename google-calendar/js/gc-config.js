/*
  Nombre completo: gc-config.js
  Ruta: google-calendar/js/gc-config.js
  Función:
    - Centralizar constantes del módulo Google Calendar.
    - Crear el namespace global window.GC.
    - Definir nombres limpios para Firestore.
    - Definir URLs base y scopes de Google Calendar.
  Se conecta con:
    - gc-storage.js
    - gc-google-api.js
    - gc-event.service.js
    - gc-firebase-config.js
    - gc-firebase.service.js
    - gc-app.js

  Importante:
    - Este archivo NO usa window.TL.
    - Este archivo NO se conecta con Telegram.
*/

(function initGcConfig(global) {
  "use strict";

  global.GC = global.GC || {};

  global.GC.CONFIG = {
    APP_NAME: "AgendaJeff",
    MODULE_NAME: "Google Calendar",

    STORAGE_KEY: "gc_google_calendar_connection_v1",

    GOOGLE_AUTH_SCOPE_READONLY: "https://www.googleapis.com/auth/calendar.readonly",
    GOOGLE_AUTH_SCOPE_EVENTS: "https://www.googleapis.com/auth/calendar.events",

    GOOGLE_AUTH_SCOPES: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events"
    ].join(" "),

    GOOGLE_CALENDAR_API_BASE_URL: "https://www.googleapis.com/calendar/v3",

    FIREBASE_APP_NAME: "AgendaJeffGoogleCalendarLocal",
    FIREBASE_COLLECTION_CONNECTIONS: "conexiones",
    FIREBASE_DOC_GOOGLE_CALENDAR: "googleCalendar",

    PROVIDER_GOOGLE_CALENDAR: "googleCalendar",

    STATUS_IDLE: "idle",
    STATUS_CONNECTED: "connected",
    STATUS_DISCONNECTED: "disconnected",
    STATUS_ERROR: "error",

    SOURCE: "google-calendar-html-local",

    DEFAULT_CALENDAR_ID: "primary",
    DEFAULT_EVENT_TITLE: "Reunión de prueba Google Calendar",
    DEFAULT_EVENT_DURATION_MINUTES: 30,

    MAX_EVENTS_TO_READ: 10
  };
})(window);