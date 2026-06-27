/*
  Nombre completo: gc-firebase-save.js
  Ruta: modulos/googlecalendar/firebase/gc-firebase-save.js

  Función:
    - Guardar en Firestore el documento conexiones/googleCalendar.
    - Normalizar los datos antes de enviarlos a Firebase.
    - Usar merge para no destruir campos futuros del documento.
    - Respetar estados especiales como ready, partial, error y cleared.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/utils/gc-normalize.js
    - modulos/googlecalendar/firebase/gc-firebase-init.js
*/

(function initGoogleCalendarFirebaseSave(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const firebaseLayer = googleCalendar.Firebase = googleCalendar.Firebase || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getCreateResult() {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult
      : function fallbackCreateResult(payload) {
          const data = payload && typeof payload === "object" ? payload : {};
          return {
            ok: Boolean(data.ok),
            status: data.status || (data.ok ? "ready" : "error"),
            action: data.action || "save",
            source: data.source || "firebase",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/firebase/gc-firebase-save.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  function normalizeConnection(data, source) {
    const normalize = googleCalendar.Utils && googleCalendar.Utils.Normalize ? googleCalendar.Utils.Normalize : {};

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(data, { source });
    }

    return data && typeof data === "object" ? data : {};
  }

  function pickStatus(connection, options) {
    const config = getConfig();
    const data = connection && typeof connection === "object" ? connection : {};
    const opts = options && typeof options === "object" ? options : {};

    return opts.status || data.status || data.estado || (config.status ? config.status.READY : "ready");
  }

  function pickAction(connection, options) {
    const config = getConfig();
    const data = connection && typeof connection === "object" ? connection : {};
    const opts = options && typeof options === "object" ? options : {};

    return opts.action || data.lastAction || data.ultimaAccion || (config.action ? config.action.SAVE : "save");
  }

  function prepareFirebasePayload(connection, options) {
    const config = getConfig();
    const data = connection && typeof connection === "object" ? connection : {};
    const opts = options && typeof options === "object" ? options : {};
    const now = new Date().toISOString();
    const status = pickStatus(data, opts);
    const action = pickAction(data, opts);
    const source = opts.source || data.source || (config.source ? config.source.FIREBASE : "firebase");
    const errorStatus = config.status ? config.status.ERROR : "error";
    const clearError = opts.clearError !== false && status !== errorStatus;
    const lastError = clearError ? "" : (data.lastError || data.ultimoError || "");

    const base = {
      ...data,
      enabled: typeof data.enabled === "boolean" ? data.enabled : true,
      provider: config.firebase ? config.firebase.provider : "googleCalendar",
      proveedor: config.firebase ? config.firebase.provider : "googleCalendar",
      appName: config.firebase ? config.firebase.appName : "AgendaJeff",
      firestoreCollection: config.firebase ? config.firebase.collection : "conexiones",
      firestoreDocument: config.firebase ? config.firebase.document : "googleCalendar",
      source,
      status,
      estado: status,
      configured: Boolean(data.configured || data.configurado),
      configurado: Boolean(data.configurado || data.configured),
      firebaseConnectionOk: status !== errorStatus,
      firebaseConexionOk: status !== errorStatus,
      lastAction: action,
      ultimaAccion: action,
      lastError,
      ultimoError: lastError,
      lastErrorFile: clearError ? "" : (data.lastErrorFile || "modulos/googlecalendar/firebase/gc-firebase-save.js"),
      firebaseLastCheckAt: now,
      firebaseUltimaRevisionEn: now,
      updatedAt: now,
      actualizadoEn: now,
      savedAt: data.savedAt || now
    };

    if (status === (config.status ? config.status.CLEARED : "cleared")) {
      base.clearedAt = data.clearedAt || now;
    }

    if (status === errorStatus) {
      base.lastErrorAt = data.lastErrorAt || now;
      base.ultimoErrorEn = data.ultimoErrorEn || now;
    }

    return normalizeConnection(base, source);
  }

  function getSuccessMessage(status) {
    const config = getConfig();

    if (status === (config.status ? config.status.CLEARED : "cleared")) {
      return "Conexión Google Calendar marcada como limpiada en Firebase.";
    }

    if (status === (config.status ? config.status.ERROR : "error")) {
      return "Error Google Calendar registrado correctamente en Firebase.";
    }

    if (status === (config.status ? config.status.PARTIAL : "partial")) {
      return "Conexión Google Calendar parcial guardada correctamente en Firebase.";
    }

    return "Conexión Google Calendar guardada correctamente en Firebase.";
  }

  async function saveFirebaseConnection(connection, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/firebase/gc-firebase-save.js";
    const action = pickAction(connection, opts);
    const source = opts.source || (config.source ? config.source.FIREBASE : "firebase");
    const checkedAt = new Date().toISOString();

    if (!firebaseLayer.getGoogleCalendarDocRef || typeof firebaseLayer.getGoogleCalendarDocRef !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No está disponible getGoogleCalendarDocRef. Revisa gc-firebase-init.js.",
        error: {
          message: "Falta inicializador Firebase.",
          file: "modulos/googlecalendar/firebase/gc-firebase-init.js"
        },
        checkedAt
      });
    }

    const refResult = firebaseLayer.getGoogleCalendarDocRef();

    if (!refResult.ok || !refResult.ref) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No se pudo obtener la referencia del documento Google Calendar para guardar en Firebase.",
        error: refResult.initResult ? refResult.initResult.error : null,
        data: {
          collection: refResult.collection,
          document: refResult.document,
          initResult: refResult.initResult
        },
        checkedAt
      });
    }

    const payload = prepareFirebasePayload(connection, { ...opts, action, source });

    try {
      await refResult.ref.set(payload, { merge: true });

      return createResult({
        ok: true,
        status: payload.status || (config.status ? config.status.READY : "ready"),
        action,
        source,
        file,
        message: getSuccessMessage(payload.status),
        data: {
          collection: refResult.collection,
          document: refResult.document,
          connection: payload
        },
        checkedAt
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No se pudo guardar Google Calendar en Firebase.",
        error: {
          message: error && error.message ? error.message : "Error desconocido guardando Firebase.",
          file
        },
        data: {
          collection: refResult.collection,
          document: refResult.document,
          attemptedPayload: payload
        },
        checkedAt
      });
    }
  }

  async function saveFirebaseLastError(errorInfo) {
    const config = getConfig();
    const now = new Date().toISOString();
    const message = errorInfo && errorInfo.message ? errorInfo.message : "Error desconocido.";

    return saveFirebaseConnection({
      enabled: true,
      status: config.status ? config.status.ERROR : "error",
      estado: config.status ? config.status.ERROR : "error",
      firebaseConnectionOk: false,
      firebaseConexionOk: false,
      lastError: message,
      ultimoError: message,
      lastErrorFile: errorInfo && errorInfo.file ? errorInfo.file : "modulos/googlecalendar/firebase/gc-firebase-save.js",
      lastErrorAt: now,
      ultimoErrorEn: now,
      updatedAt: now,
      actualizadoEn: now
    }, {
      action: config.action ? config.action.SAVE : "save",
      source: config.source ? config.source.FIREBASE : "firebase",
      status: config.status ? config.status.ERROR : "error",
      clearError: false
    });
  }

  firebaseLayer.prepareFirebasePayload = prepareFirebasePayload;
  firebaseLayer.saveFirebaseConnection = saveFirebaseConnection;
  firebaseLayer.saveFirebaseLastError = saveFirebaseLastError;
})(window);
