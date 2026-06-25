/*
  Nombre completo: tl-firebase-save.js
  Ruta: modulos/telegram/firebase/tl-firebase-save.js

  Función:
    - Guardar en Firestore la conexión del módulo Telegram.
    - Normalizar los datos antes de enviarlos a Firebase.
    - Usar merge para no destruir campos futuros del documento.
    - No usar localStorage ni Telegram API; este archivo solo guarda Firebase.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-normalize.js
    - modulos/telegram/utils/tl-time.js
    - modulos/telegram/firebase/tl-firebase-init.js
    - modulos/telegram/connection/tl-connection-save.js
    - modulos/telegram/diagnostic/tl-diagnostic-firebase.js
*/

(function initTelegramFirebaseSave(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const firebaseLayer = telegram.Firebase = telegram.Firebase || {};

  function getConfig() {
    return telegram.CONFIG || {};
  }

  function getUtils() {
    return telegram.Utils || {};
  }

  function getCreateResult() {
    if (typeof telegram.createResult === "function") {
      return telegram.createResult;
    }

    return function fallbackCreateResult(payload) {
      const data = payload && typeof payload === "object" ? payload : {};

      return {
        ok: Boolean(data.ok),
        status: data.status || (data.ok ? "ready" : "error"),
        action: data.action || "save",
        source: data.source || "firebase",
        message: data.message || "",
        file: data.file || "modulos/telegram/firebase/tl-firebase-save.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function prepareFirebasePayload(connection, options) {
    const config = getConfig();
    const utils = getUtils();
    const normalize = utils.Normalize || {};
    const time = utils.Time || {};
    const opts = options && typeof options === "object" ? options : {};
    const now = typeof time.nowIso === "function" ? time.nowIso() : new Date().toISOString();
    const source = config.source ? config.source.FIREBASE : "firebase";
    const status = opts.status || (config.status ? config.status.READY : "ready");
    const action = opts.action || (config.action ? config.action.SAVE : "save");

    const base = {
      ...(connection && typeof connection === "object" ? connection : {}),
      enabled: connection && typeof connection.enabled === "boolean" ? connection.enabled : true,
      provider: config.firebase ? config.firebase.provider : "telegram",
      appName: config.firebase ? config.firebase.appName : "AgendaJeff",
      aplicacion: config.firebase ? config.firebase.appName : "AgendaJeff",
      collection: config.firebase ? config.firebase.collection : "conexiones",
      coleccion: config.firebase ? config.firebase.collection : "conexiones",
      document: config.firebase ? config.firebase.document : "telegram",
      documento: config.firebase ? config.firebase.document : "telegram",
      source: opts.source || source,
      status,
      estado: status,
      firebaseConnectionOk: true,
      firebaseConexionOk: true,
      lastAction: action,
      ultimaAccion: action,
      lastError: "",
      lastErrorMessage: "",
      lastErrorFile: "",
      lastCheckedAt: now,
      firebaseLastCheck: now,
      updatedAt: now,
      actualizadoEn: now,
      savedAt: now
    };

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(base, {
        source: base.source
      });
    }

    return base;
  }

  async function saveFirebaseConnection(connection, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.FIREBASE_SAVE : "modulos/telegram/firebase/tl-firebase-save.js";
    const action = config.action ? config.action.SAVE : "save";
    const source = config.source ? config.source.FIREBASE : "firebase";
    const checkedAt = new Date().toISOString();

    if (!firebaseLayer.getTelegramDocRef || typeof firebaseLayer.getTelegramDocRef !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No está disponible getTelegramDocRef. Revisa tl-firebase-init.js.",
        error: {
          message: "Falta inicializador Firebase.",
          file: config.fileHints ? config.fileHints.FIREBASE_INIT : "modulos/telegram/firebase/tl-firebase-init.js"
        },
        checkedAt
      });
    }

    const refResult = firebaseLayer.getTelegramDocRef();

    if (!refResult.ok || !refResult.ref) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No se pudo obtener la referencia del documento Telegram para guardar en Firebase.",
        error: refResult.initResult ? refResult.initResult.error : null,
        data: {
          collection: refResult.collection,
          document: refResult.document,
          initResult: refResult.initResult
        },
        checkedAt
      });
    }

    const payload = prepareFirebasePayload(connection, {
      action,
      source
    });

    try {
      await refResult.ref.set(payload, { merge: true });

      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action,
        source,
        file,
        message: "Conexión Telegram guardada correctamente en Firebase.",
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
        message: "No se pudo guardar la conexión Telegram en Firebase.",
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
    const file = config.fileHints ? config.fileHints.FIREBASE_SAVE : "modulos/telegram/firebase/tl-firebase-save.js";
    const time = getUtils().Time || {};
    const now = typeof time.nowIso === "function" ? time.nowIso() : new Date().toISOString();
    const payload = {
      status: config.status ? config.status.ERROR : "error",
      estado: config.status ? config.status.ERROR : "error",
      lastError: errorInfo && errorInfo.message ? errorInfo.message : "Error desconocido.",
      lastErrorMessage: errorInfo && errorInfo.message ? errorInfo.message : "Error desconocido.",
      lastErrorFile: errorInfo && errorInfo.file ? errorInfo.file : file,
      lastErrorAt: now,
      updatedAt: now,
      actualizadoEn: now
    };

    return saveFirebaseConnection(payload, {
      action: config.action ? config.action.SAVE : "save",
      source: config.source ? config.source.FIREBASE : "firebase",
      status: config.status ? config.status.ERROR : "error"
    });
  }

  firebaseLayer.prepareFirebasePayload = prepareFirebasePayload;
  firebaseLayer.saveFirebaseConnection = saveFirebaseConnection;
  firebaseLayer.saveFirebaseLastError = saveFirebaseLastError;
})(window);
