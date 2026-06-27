/*
  Nombre completo: gc-connection-clear.js
  Ruta: modulos/googlecalendar/connection/gc-connection-clear.js

  Función:
    - Limpiar conexión local Google Calendar.
    - Marcar en Firebase que la conexión fue limpiada cuando Firebase esté disponible.
    - Entregar resultado estándar para UI y diagnóstico.

  Se conecta con:
    - modulos/googlecalendar/storage/gc-local-clear.js
    - modulos/googlecalendar/firebase/gc-firebase-save.js
*/

(function initGoogleCalendarConnectionClear(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const connection = googleCalendar.Connection = googleCalendar.Connection || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function createResult(payload) {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  async function clearConnection(options) {
    const config = getConfig();
    const opts = options && typeof options === "object" ? options : {};
    const storage = googleCalendar.Storage || {};
    const firebase = googleCalendar.Firebase || {};
    const file = "modulos/googlecalendar/connection/gc-connection-clear.js";
    const checkedAt = new Date().toISOString();

    const localResult = storage.clearLocalConnection
      ? storage.clearLocalConnection({ all: opts.all !== false })
      : null;

    const firebaseResult = firebase.saveFirebaseConnection && opts.skipFirebase !== true
      ? await firebase.saveFirebaseConnection({
          configured: false,
          configurado: false,
          status: config.status ? config.status.CLEARED : "cleared",
          estado: config.status ? config.status.CLEARED : "cleared",
          lastAction: config.action ? config.action.CLEAR : "clear",
          ultimaAccion: config.action ? config.action.CLEAR : "clear",
          firebaseConnectionOk: true,
          firebaseConexionOk: true,
          clearedAt: checkedAt,
          updatedAt: checkedAt,
          actualizadoEn: checkedAt
        }, {
          action: config.action ? config.action.CLEAR : "clear",
          status: config.status ? config.status.CLEARED : "cleared"
        })
      : null;

    const ok = Boolean((localResult && localResult.ok) || (firebaseResult && firebaseResult.ok));

    return createResult({
      ok,
      status: ok ? (config.status ? config.status.CLEARED : "cleared") : (config.status ? config.status.ERROR : "error"),
      action: config.action ? config.action.CLEAR : "clear",
      source: firebaseResult && firebaseResult.ok ? "firebase" : "local",
      file,
      message: ok
        ? "Conexión Google Calendar limpiada correctamente."
        : "No se pudo limpiar la conexión Google Calendar.",
      error: ok ? null : { message: "Falló limpieza local y registro Firebase.", file },
      data: { localResult, firebaseResult },
      checkedAt
    });
  }

  connection.clearConnection = clearConnection;
})(window);
