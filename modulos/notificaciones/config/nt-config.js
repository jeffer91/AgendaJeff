/*
  Nombre completo: nt-config.js
  Ruta: modulos/notificaciones/config/nt-config.js

  Función:
    - Centralizar la configuración del módulo Notificaciones.
    - Definir estados, acciones, tipos de prueba, modos de visualización y resultado estándar.
*/

(function initNotificacionesConfig(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const notificaciones = root.Notificaciones = root.Notificaciones || {};

  const STATUS = Object.freeze({
    IDLE: "idle",
    READY: "ready",
    TESTING: "testing",
    SUCCESS: "success",
    ERROR: "error",
    PARTIAL: "partial"
  });

  const ACTION = Object.freeze({
    INIT: "init",
    DIAGNOSTIC: "diagnostic",
    SEND: "sendNotification",
    TEST: "testNotification",
    VISUAL: "visualNotification"
  });

  const TYPES = Object.freeze({
    NORMAL: "normal",
    SOUND: "sound",
    SILENT: "silent",
    LONG: "long",
    REMINDER: "reminder",
    SUCCESS: "success",
    ERROR: "error"
  });

  const DISPLAY_MODES = Object.freeze({
    NATIVE: "native",
    TOAST: "toast",
    BANNER: "banner",
    CENTER: "center"
  });

  const CONFIG = Object.freeze({
    module: Object.freeze({
      id: "notificaciones",
      prefix: "nt",
      name: "Notificaciones",
      title: "Notificaciones de escritorio",
      version: "0.2.0",
      description: "Módulo independiente para probar notificaciones nativas de escritorio y notificaciones visuales internas en AgendaJeff."
    }),
    defaults: Object.freeze({
      title: "AgendaJeff",
      body: "notificaciones prueba",
      delaySeconds: 5,
      silent: false,
      displayMode: DISPLAY_MODES.NATIVE
    }),
    status: STATUS,
    action: ACTION,
    types: TYPES,
    displayModes: DISPLAY_MODES,
    fileHints: Object.freeze({
      MODULE_HTML: "modulos/notificaciones/nt-module.html",
      CONFIG: "modulos/notificaciones/config/nt-config.js",
      NORMALIZE: "modulos/notificaciones/utils/nt-normalize.js",
      DESKTOP: "modulos/notificaciones/desktop/",
      VISUAL: "modulos/notificaciones/visual/",
      DIAGNOSTIC: "modulos/notificaciones/diagnostic/",
      UI: "modulos/notificaciones/ui/",
      STARTUP: "modulos/notificaciones/startup/nt-start.js"
    })
  });

  function createResult(payload) {
    const data = payload && typeof payload === "object" ? payload : {};

    return {
      ok: Boolean(data.ok),
      status: data.status || (data.ok ? STATUS.READY : STATUS.ERROR),
      action: data.action || "",
      source: data.source || "notificaciones",
      message: data.message || "",
      file: data.file || "",
      data: data.data || null,
      error: data.error || null,
      checkedAt: data.checkedAt || new Date().toISOString()
    };
  }

  function getDefaultNotification() {
    return {
      title: CONFIG.defaults.title,
      body: CONFIG.defaults.body,
      silent: CONFIG.defaults.silent,
      delaySeconds: CONFIG.defaults.delaySeconds,
      displayMode: CONFIG.defaults.displayMode,
      type: TYPES.NORMAL
    };
  }

  notificaciones.CONFIG = CONFIG;
  notificaciones.createResult = createResult;
  notificaciones.getDefaultNotification = getDefaultNotification;
})(window);