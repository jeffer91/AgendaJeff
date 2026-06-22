/*
  Nombre completo: ag-config.js
  Ruta: Agendador/js/ag-config.js

  Función:
    - Crear namespace global window.AG.
    - Centralizar constantes del Agendador.
    - Definir claves de localStorage.
    - Definir estados, tipos, filtros, canales y configuración visual.
    - No lee ni escribe datos directamente.

  Se conecta con:
    - ag-storage.js
    - ag-ui.js
    - ag-app.js
    - ag-bindings.js
    - servicios/ag-event.service.js
*/

(function initAgConfig(global) {
  "use strict";

  global.AG = global.AG || {};

  global.AG.CONFIG = {
    APP_NAME: "AgendaJeff",
    MODULE_NAME: "Agendador",

    VERSION: "1.0.0",

    STORAGE_KEYS: {
      ITEMS: "ag_agendador_items_v1",
      RESPONSIBLES: "ag_agendador_responsibles_v1",
      CONNECTION_STATUS: "ag_agendador_connection_status_v1",
      ACTIVE_FILTER: "ag_agendador_active_filter_v1",
      SETTINGS: "ag_agendador_settings_v1"
    },

    TYPES: {
      EVENT: "event",
      PENDING: "pending",
      REMINDER: "reminder"
    },

    TYPE_LABELS: {
      event: "Evento",
      pending: "Pendiente",
      reminder: "Recordatorio"
    },

    STATUS: {
      ACTIVE: "active",
      COMPLETED: "completed",
      PAST: "past"
    },

    PRIORITIES: {
      LOW: "low",
      NORMAL: "normal",
      HIGH: "high",
      URGENT: "urgent"
    },

    PRIORITY_LABELS: {
      low: "Baja",
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente"
    },

    FILTERS: {
      UPCOMING: "upcoming",
      TODAY: "today",
      PENDING: "pending",
      PAST: "past",
      ALL: "all"
    },

    FILTER_LABELS: {
      upcoming: "Próximos",
      today: "Hoy",
      pending: "Pendientes",
      past: "Pasados",
      all: "Todos"
    },

    CONNECTIONS: {
      LOCAL: "local",
      FIREBASE: "firebase",
      TELEGRAM: "telegram",
      GOOGLE: "googleCalendar",
      MICROSOFT: "microsoftCalendar",
      DESKTOP: "desktopNotifications"
    },

    CONNECTION_LABELS: {
      local: "Local",
      firebase: "Firebase",
      telegram: "Telegram",
      googleCalendar: "Google",
      microsoftCalendar: "Microsoft",
      desktopNotifications: "Notificaciones"
    },

    CONNECTION_STATUS: {
      IDLE: "idle",
      OK: "ok",
      WARNING: "warning",
      ERROR: "error"
    },

    DEFAULT_RESPONSIBLE: {
      id: "me",
      name: "Yo",
      email: "",
      phone: "",
      type: "internal",
      createdAt: "system"
    },

    DEFAULT_CHANNELS: [
      "local",
      "telegram",
      "googleCalendar",
      "microsoftCalendar",
      "desktopNotifications",
      "firebase"
    ],

    DEFAULT_REMINDERS: ["5d", "3d", "1d", "0d"],

    REMINDER_LABELS: {
      "5d": "5 días antes",
      "3d": "3 días antes",
      "1d": "1 día antes",
      "0d": "Mismo día",
      "30m": "30 minutos antes"
    },

    DEFAULT_DURATION_MINUTES: 30,

    DATE_LOCALE: "es-EC",

    DEFAULT_TIMEZONE: "America/Guayaquil",

    SOURCE: "agendador-local",

    OUTPUT_LIMIT: 80
  };
})(window);