/*
  Nombre completo: nt-config.js
  Ruta: notificaciones-desktop/js/nt-config.js
  Función:
    - Crear el namespace global window.NT.
    - Centralizar constantes del módulo Notificaciones Desktop.
    - Definir nombres limpios para localStorage.
    - Definir colección y documento Firestore.
    - Definir estados, tipos de entorno y tipos de prueba.

  Se conecta con:
    - nt-storage.js
    - nt-firebase-config.js
    - nt-firebase.service.js
    - nt-environment.service.js
    - nt-index.html

  Firestore:
    - Colección: conexiones
    - Documento: notificacionesDesktop
*/

(function initNtConfig(global) {
  "use strict";

  global.NT = global.NT || {};

  const CONFIG = {
    APP_NAME: "AgendaJeff",
    MODULE_NAME: "Notificaciones Desktop",

    STORAGE_KEY: "nt_desktop_notifications_connection_v1",

    FIREBASE_APP_NAME: "AgendaJeffNotificacionesDesktopLocal",
    FIREBASE_COLLECTION_CONNECTIONS: "conexiones",
    FIREBASE_DOC_NOTIFICATIONS: "notificacionesDesktop",

    PROVIDER_NOTIFICATIONS: "notificacionesDesktop",

    ENVIRONMENT_WEB: "web",
    ENVIRONMENT_ELECTRON: "electron",
    ENVIRONMENT_UNKNOWN: "unknown",

    ORIGIN_FILE: "file",
    ORIGIN_LOCALHOST: "localhost",
    ORIGIN_REMOTE: "remote",
    ORIGIN_UNKNOWN: "unknown",

    STATUS_IDLE: "idle",
    STATUS_CONFIGURED: "configured",
    STATUS_CONNECTED: "connected",
    STATUS_DISCONNECTED: "disconnected",
    STATUS_ERROR: "error",

    TEST_WEB_PERMISSION: "web-permission",
    TEST_WEB_SIMPLE: "web-simple",
    TEST_WEB_EVENT: "web-event",
    TEST_WEB_TASK: "web-task",
    TEST_WEB_DEFENSE: "web-defense",
    TEST_WEB_SOUND: "web-sound",

    TEST_ELECTRON_NOTIFICATION: "electron-notification",
    TEST_WINDOWS_TOAST: "windows-toast",
    TEST_TRAY_ICON: "tray-icon",
    TEST_TRAY_MENU: "tray-menu",
    TEST_MINIMIZE_TO_TRAY: "minimize-to-tray",
    TEST_BACKGROUND: "background",
    TEST_REMINDER: "reminder",

    DEFAULT_SOURCE: "notificaciones-desktop-html-local",

    DEFAULT_SETTINGS: {
      configured: false,
      desktopNotificationsEnabled: true,
      trayEnabled: true,
      soundEnabled: true,
      remindersEnabled: true,
      environmentMode: "web",
      electronAvailable: false,
      webNotificationsSupported: false,
      webNotificationsPermission: "unknown",
      originMode: "unknown",
      lastTestAt: "",
      lastTestType: "",
      lastTestStatus: "",
      lastErrorMessage: ""
    },

    ELECTRON_BRIDGE_NAMES: [
      "agendaJeffNotifications",
      "agendaJeff",
      "electronAPI",
      "api"
    ]
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function cleanString(value) {
    return String(value ?? "").trim();
  }

  function safeLower(value) {
    return cleanString(value).toLowerCase();
  }

  function isPlainObject(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function toBoolean(value, defaultValue) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalized = safeLower(value);

      if (["true", "1", "yes", "si", "sí", "on"].includes(normalized)) {
        return true;
      }

      if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
      }
    }

    return Boolean(defaultValue);
  }

  function normalizeStatus(value) {
    const normalized = safeLower(value);

    if (
      [
        CONFIG.STATUS_IDLE,
        CONFIG.STATUS_CONFIGURED,
        CONFIG.STATUS_CONNECTED,
        CONFIG.STATUS_DISCONNECTED,
        CONFIG.STATUS_ERROR
      ].includes(normalized)
    ) {
      return normalized;
    }

    return CONFIG.STATUS_IDLE;
  }

  function normalizeEnvironmentMode(value) {
    const normalized = safeLower(value);

    if (normalized === CONFIG.ENVIRONMENT_ELECTRON) {
      return CONFIG.ENVIRONMENT_ELECTRON;
    }

    if (normalized === CONFIG.ENVIRONMENT_WEB) {
      return CONFIG.ENVIRONMENT_WEB;
    }

    return CONFIG.ENVIRONMENT_UNKNOWN;
  }

  function normalizePermission(value) {
    const normalized = safeLower(value);

    if (["granted", "denied", "default", "unsupported"].includes(normalized)) {
      return normalized;
    }

    return "unknown";
  }

  function cloneDefaultSettings() {
    return {
      ...CONFIG.DEFAULT_SETTINGS
    };
  }

  global.NT.CONFIG = CONFIG;

  global.NT.Utils = {
    nowIso,
    cleanString,
    safeLower,
    isPlainObject,
    toBoolean,
    normalizeStatus,
    normalizeEnvironmentMode,
    normalizePermission,
    cloneDefaultSettings
  };
})(window);