/*
  Nombre completo: gc-connection-save.js
  Ruta: modulos/googlecalendar/connection/gc-connection-save.js

  Función:
    - Guardar conexión Google Calendar en Firebase y respaldo local.
    - Validar y normalizar datos antes de guardar.
    - Mantener fallback local cuando Firebase falle.
    - No guardar secretos OAuth en Firebase ni en respaldo local.

  Se conecta con:
    - modulos/googlecalendar/firebase/gc-firebase-save.js
    - modulos/googlecalendar/storage/gc-local-save.js
    - modulos/googlecalendar/connection/gc-connection-status.js
*/

(function initGoogleCalendarConnectionSave(global) {
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

  function validateConnection(data) {
    const validate = googleCalendar.Utils && googleCalendar.Utils.Validate ? googleCalendar.Utils.Validate : {};

    if (validate.validateConnection) {
      return validate.validateConnection(data);
    }

    return { ok: true, data: data || {}, errors: [], message: "Validación base aprobada." };
  }

  function normalizeConnection(data) {
    const normalize = googleCalendar.Utils && googleCalendar.Utils.Normalize ? googleCalendar.Utils.Normalize : {};

    if (normalize.normalizeConnection) {
      return normalize.normalizeConnection(data || {}, { source: "connection" });
    }

    return data && typeof data === "object" ? data : {};
  }

  function removeSensitiveFields(data) {
    const source = data && typeof data === "object" ? data : {};
    const safeData = { ...source };

    delete safeData.clientSecret;
    delete safeData.clientSecretDesktop;
    delete safeData.clientSecretWeb;
    delete safeData.accessToken;
    delete safeData.refreshToken;
    delete safeData.authorizationCode;
    delete safeData.code;

    safeData.hasClientSecretDesktop = Boolean(source.clientSecretDesktop || source.clientSecret);
    safeData.hasClientSecretWeb = Boolean(source.clientSecretWeb);
    safeData.secretStoragePolicy = "manual-only";

    return safeData;
  }

  async function saveConnection(input, options) {
    const config = getConfig();
    const opts = options && typeof options === "object" ? options : {};
    const firebase = googleCalendar.Firebase || {};
    const storage = googleCalendar.Storage || {};
    const file = "modulos/googlecalendar/connection/gc-connection-save.js";
    const validation = validateConnection(input);
    const checkedAt = new Date().toISOString();

    if (!validation.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.SAVE : "save",
        source: "connection",
        file,
        message: validation.message || "Datos Google Calendar inválidos.",
        error: { message: validation.errors.map(function mapError(item) { return item.message; }).join(" "), file },
        data: { validation },
        checkedAt
      });
    }

    const safeValidationData = removeSensitiveFields(validation.data);
    const normalized = normalizeConnection({
      ...safeValidationData,
      configured: true,
      configurado: true,
      status: config.status ? config.status.PARTIAL : "partial",
      estado: config.status ? config.status.PARTIAL : "partial",
      lastAction: config.action ? config.action.SAVE : "save",
      ultimaAccion: config.action ? config.action.SAVE : "save",
      updatedAt: checkedAt,
      actualizadoEn: checkedAt
    });

    const localResult = storage.saveLocalConnection
      ? storage.saveLocalConnection(normalized)
      : null;

    const firebaseResult = firebase.saveFirebaseConnection && opts.skipFirebase !== true
      ? await firebase.saveFirebaseConnection(normalized, {
          action: config.action ? config.action.SAVE : "save",
          status: config.status ? config.status.PARTIAL : "partial"
        })
      : null;

    const firebaseOk = Boolean(firebaseResult && firebaseResult.ok);
    const localOk = Boolean(localResult && localResult.ok);
    const finalConnection = normalizeConnection({
      ...normalized,
      firebaseConnectionOk: firebaseOk,
      firebaseConexionOk: firebaseOk,
      fallbackUsed: !firebaseOk && localOk,
      source: firebaseOk ? "firebase" : "local"
    });
    const statusResult = connection.calculateConnectionStatus
      ? connection.calculateConnectionStatus(finalConnection, { action: "save", source: finalConnection.source })
      : null;

    return createResult({
      ok: firebaseOk || localOk,
      status: statusResult ? statusResult.status : (firebaseOk || localOk ? "partial" : "error"),
      action: config.action ? config.action.SAVE : "save",
      source: firebaseOk ? "firebase" : "local",
      file,
      message: firebaseOk
        ? "Conexión Google Calendar guardada en Firebase y local sin guardar secretos."
        : localOk
          ? "Firebase falló, pero la conexión quedó guardada localmente sin guardar secretos."
          : "No se pudo guardar la conexión Google Calendar.",
      error: firebaseOk || localOk ? null : { message: "Falló Firebase y respaldo local.", file },
      data: { connection: finalConnection, validation: { ...validation, data: safeValidationData }, localResult, firebaseResult, statusResult },
      checkedAt
    });
  }

  connection.removeSensitiveFields = removeSensitiveFields;
  connection.saveConnection = saveConnection;
})(window);
