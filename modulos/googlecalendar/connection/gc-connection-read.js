/*
  Nombre completo: gc-connection-read.js
  Ruta: modulos/googlecalendar/connection/gc-connection-read.js

  Función:
    - Leer conexión Google Calendar desde Firebase con respaldo local.
    - Normalizar la conexión encontrada.
    - Calcular estado funcional de conexión.

  Se conecta con:
    - modulos/googlecalendar/firebase/gc-firebase-read.js
    - modulos/googlecalendar/storage/gc-local-read.js
    - modulos/googlecalendar/connection/gc-connection-status.js
*/

(function initGoogleCalendarConnectionRead(global) {
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

  function getConnectionFromResult(result) {
    return result && result.data ? result.data.connection || null : null;
  }

  async function readConnection(options) {
    const config = getConfig();
    const opts = options && typeof options === "object" ? options : {};
    const firebase = googleCalendar.Firebase || {};
    const storage = googleCalendar.Storage || {};
    const file = "modulos/googlecalendar/connection/gc-connection-read.js";
    const checkedAt = new Date().toISOString();
    let firebaseResult = null;
    let localResult = null;
    let source = config.source ? config.source.NONE : "none";
    let foundConnection = null;

    if (opts.preferLocal !== true && firebase.readFirebaseConnection) {
      firebaseResult = await firebase.readFirebaseConnection();
      if (firebaseResult && firebaseResult.ok) {
        foundConnection = getConnectionFromResult(firebaseResult);
        source = config.source ? config.source.FIREBASE : "firebase";
      }
    }

    if (!foundConnection && storage.readLocalConnectionWithFallback) {
      localResult = storage.readLocalConnectionWithFallback();
      if (localResult && localResult.ok) {
        foundConnection = getConnectionFromResult(localResult);
        source = config.source ? config.source.LOCAL : "local";
      }
    }

    if (!foundConnection) {
      return createResult({
        ok: false,
        status: config.status ? config.status.IDLE : "idle",
        action: config.action ? config.action.READ : "read",
        source,
        file,
        message: "No se encontró conexión Google Calendar en Firebase ni en respaldo local.",
        data: { firebaseResult, localResult, connection: null },
        checkedAt
      });
    }

    const statusResult = connection.calculateConnectionStatus
      ? connection.calculateConnectionStatus(foundConnection, { action: "read", source })
      : null;
    const finalConnection = statusResult && statusResult.data && statusResult.data.connection
      ? statusResult.data.connection
      : foundConnection;

    if (source === (config.source ? config.source.FIREBASE : "firebase") && storage.saveLocalBackup) {
      storage.saveLocalBackup(finalConnection);
    }

    return createResult({
      ok: true,
      status: statusResult ? statusResult.status : (config.status ? config.status.READY : "ready"),
      action: config.action ? config.action.READ : "read",
      source,
      file,
      message: source === (config.source ? config.source.FIREBASE : "firebase")
        ? "Conexión Google Calendar leída desde Firebase."
        : "Conexión Google Calendar leída desde respaldo local.",
      data: { firebaseResult, localResult, statusResult, connection: finalConnection },
      checkedAt
    });
  }

  connection.readConnection = readConnection;
})(window);
