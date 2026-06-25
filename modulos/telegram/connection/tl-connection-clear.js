/*
  Nombre completo: tl-connection-clear.js
  Ruta: modulos/telegram/connection/tl-connection-clear.js

  Función:
    - Limpiar la conexión Telegram localmente.
    - Marcar la conexión como limpiada en Firebase sin borrar el documento completo.
    - Evitar que la limpieza dependa de UI o botones.
    - Entregar un resultado único para diagnóstico y flujo de conexión.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/storage/tl-local-clear.js
    - modulos/telegram/firebase/tl-firebase-save.js
    - modulos/telegram/connection/tl-connection-status.js
    - modulos/telegram/diagnostic/tl-diagnostic-state.js
*/

(function initTelegramConnectionClear(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const connection = telegram.Connection = telegram.Connection || {};

  function getConfig() {
    return telegram.CONFIG || {};
  }

  function getCreateResult() {
    if (typeof telegram.createResult === "function") {
      return telegram.createResult;
    }

    return function fallbackCreateResult(payload) {
      const data = payload && typeof payload === "object" ? payload : {};

      return {
        ok: Boolean(data.ok),
        status: data.status || (data.ok ? "cleared" : "error"),
        action: data.action || "clear",
        source: data.source || "system",
        message: data.message || "",
        file: data.file || "modulos/telegram/connection/tl-connection-clear.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function buildClearedPayload(checkedAt) {
    const config = getConfig();
    const status = config.status ? config.status.CLEARED : "cleared";
    const action = config.action ? config.action.CLEAR : "clear";

    return {
      enabled: false,
      provider: config.firebase ? config.firebase.provider : "telegram",
      appName: config.firebase ? config.firebase.appName : "AgendaJeff",
      aplicacion: config.firebase ? config.firebase.appName : "AgendaJeff",
      collection: config.firebase ? config.firebase.collection : "conexiones",
      coleccion: config.firebase ? config.firebase.collection : "conexiones",
      document: config.firebase ? config.firebase.document : "telegram",
      documento: config.firebase ? config.firebase.document : "telegram",
      source: config.source ? config.source.SYSTEM : "system",
      status,
      estado: status,
      botToken: "",
      chatId: "",
      botTokenMasked: "",
      chatIdMasked: "",
      botConfigured: false,
      chatConfigured: false,
      firebaseConnectionOk: false,
      firebaseConexionOk: false,
      telegramConnectionOk: false,
      lastAction: action,
      ultimaAccion: action,
      lastError: "",
      lastErrorMessage: "",
      lastErrorFile: "",
      updatedAt: checkedAt,
      actualizadoEn: checkedAt,
      clearedAt: checkedAt
    };
  }

  async function clearConnection(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = config.fileHints ? config.fileHints.CONNECTION_CLEAR : "modulos/telegram/connection/tl-connection-clear.js";
    const action = config.action ? config.action.CLEAR : "clear";
    const source = config.source ? config.source.SYSTEM : "system";
    const checkedAt = new Date().toISOString();
    const storage = telegram.Storage || {};
    const firebaseLayer = telegram.Firebase || {};

    let localResult = null;
    let firebaseResult = null;
    const clearedPayload = buildClearedPayload(checkedAt);

    if (storage.clearLocalConnection && typeof storage.clearLocalConnection === "function") {
      localResult = storage.clearLocalConnection({
        includeBackup: opts.includeBackup === true,
        includeDiagnostic: opts.includeDiagnostic === true,
        includeLastResult: opts.includeLastResult === true,
        all: opts.all === true
      });
    } else {
      localResult = createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "No está disponible clearLocalConnection. Revisa tl-local-clear.js.",
        error: {
          message: "Falta función clearLocalConnection.",
          file: config.fileHints ? config.fileHints.LOCAL_CLEAR : "modulos/telegram/storage/tl-local-clear.js"
        }
      });
    }

    if (opts.skipFirebase !== true && firebaseLayer.saveFirebaseConnection && typeof firebaseLayer.saveFirebaseConnection === "function") {
      firebaseResult = await firebaseLayer.saveFirebaseConnection(clearedPayload, {
        status: config.status ? config.status.CLEARED : "cleared",
        action,
        source
      });
    } else if (opts.skipFirebase === true) {
      firebaseResult = createResult({
        ok: true,
        status: config.status ? config.status.CLEARED : "cleared",
        action,
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "Limpieza Firebase omitida por configuración.",
        data: {
          skipped: true
        }
      });
    } else {
      firebaseResult = createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "No está disponible saveFirebaseConnection. Revisa tl-firebase-save.js.",
        error: {
          message: "Falta función saveFirebaseConnection.",
          file: config.fileHints ? config.fileHints.FIREBASE_SAVE : "modulos/telegram/firebase/tl-firebase-save.js"
        }
      });
    }

    const localOk = Boolean(localResult && localResult.ok);
    const firebaseOk = Boolean(firebaseResult && firebaseResult.ok);
    const ok = localOk && firebaseOk;
    const partialOk = localOk && !firebaseOk;
    const status = ok || partialOk
      ? (config.status ? config.status.CLEARED : "cleared")
      : (config.status ? config.status.ERROR : "error");

    return createResult({
      ok,
      status,
      action,
      source,
      file,
      message: ok
        ? "Conexión Telegram limpiada localmente y marcada como limpiada en Firebase."
        : partialOk
          ? "Conexión Telegram limpiada localmente, pero Firebase no pudo actualizarse."
          : "No se pudo limpiar la conexión Telegram.",
      error: ok ? null : {
        message: partialOk
          ? "Firebase falló durante la limpieza, pero localStorage sí se limpió."
          : "Falló la limpieza local o remota.",
        file: partialOk
          ? (config.fileHints ? config.fileHints.FIREBASE_SAVE : "modulos/telegram/firebase/tl-firebase-save.js")
          : file
      },
      data: {
        localResult,
        firebaseResult,
        localOk,
        firebaseOk,
        connection: clearedPayload
      },
      checkedAt
    });
  }

  async function clearConnectionLocalOnly(options) {
    return clearConnection({
      ...(options && typeof options === "object" ? options : {}),
      skipFirebase: true
    });
  }

  connection.clearConnection = clearConnection;
  connection.clearConnectionLocalOnly = clearConnectionLocalOnly;
})(window);
