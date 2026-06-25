/*
  Nombre completo: tl-connection-save.js
  Ruta: modulos/telegram/connection/tl-connection-save.js

  Función:
    - Guardar la conexión Telegram en Firebase y respaldo local.
    - Validar botToken y chatId antes de guardar.
    - Continuar con respaldo local aunque Firebase falle.
    - Entregar un resultado único con detalle de guardado remoto y local.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-normalize.js
    - modulos/telegram/utils/tl-validate.js
    - modulos/telegram/firebase/tl-firebase-save.js
    - modulos/telegram/storage/tl-local-save.js
    - modulos/telegram/connection/tl-connection-status.js
    - modulos/telegram/diagnostic/tl-diagnostic-state.js
*/

(function initTelegramConnectionSave(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const connection = telegram.Connection = telegram.Connection || {};

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
        source: data.source || "system",
        message: data.message || "",
        file: data.file || "modulos/telegram/connection/tl-connection-save.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function normalizeConnection(input) {
    const config = getConfig();
    const utils = getUtils();
    const normalize = utils.Normalize || {};
    const data = input && typeof input === "object" ? input : {};

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(data, {
        source: config.source ? config.source.USER : "user"
      });
    }

    return data;
  }

  function validateConnection(data) {
    const utils = getUtils();

    if (utils.Validate && typeof utils.Validate.validateConnection === "function") {
      return utils.Validate.validateConnection(data);
    }

    const errors = [];

    if (!data.botToken) {
      errors.push({ field: "botToken", message: "Falta el Bot Token de Telegram." });
    }

    if (!data.chatId) {
      errors.push({ field: "chatId", message: "Falta el Chat ID de Telegram." });
    }

    return {
      ok: errors.length === 0,
      data,
      errors,
      message: errors.length === 0
        ? "Conexión válida."
        : "Conexión incompleta."
    };
  }

  function calculateStatus(data) {
    if (connection.calculateConnectionStatus && typeof connection.calculateConnectionStatus === "function") {
      return connection.calculateConnectionStatus(data, {
        action: getConfig().action ? getConfig().action.SAVE : "save",
        source: getConfig().source ? getConfig().source.USER : "user"
      });
    }

    return {
      ok: Boolean(data && data.botToken && data.chatId),
      status: data && data.botToken && data.chatId ? "ready" : "partial",
      data: {
        connection: data
      }
    };
  }

  async function saveConnection(input, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = config.fileHints ? config.fileHints.CONNECTION_SAVE : "modulos/telegram/connection/tl-connection-save.js";
    const action = config.action ? config.action.SAVE : "save";
    const source = config.source ? config.source.USER : "user";
    const checkedAt = new Date().toISOString();
    const firebaseLayer = telegram.Firebase || {};
    const storage = telegram.Storage || {};

    const normalized = normalizeConnection({
      ...(input && typeof input === "object" ? input : {}),
      lastAction: action,
      updatedAt: checkedAt,
      actualizadoEn: checkedAt
    });

    const validation = validateConnection(normalized);
    const statusResult = calculateStatus(normalized);
    const connectionToSave = statusResult && statusResult.data && statusResult.data.connection
      ? statusResult.data.connection
      : normalized;

    if (!validation.ok && opts.allowPartial !== true) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No se guardó la conexión porque los datos de Telegram no son válidos.",
        error: {
          message: validation.errors && validation.errors.length
            ? validation.errors.map(function mapError(item) { return item.message; }).join(" ")
            : validation.message,
          file
        },
        data: {
          validation,
          statusResult,
          connection: connectionToSave
        },
        checkedAt
      });
    }

    let localResult = null;
    let firebaseResult = null;

    if (storage.saveLocalConnection && typeof storage.saveLocalConnection === "function") {
      localResult = storage.saveLocalConnection(connectionToSave, {
        source,
        status: validation.ok
          ? (config.status ? config.status.READY : "ready")
          : (config.status ? config.status.PARTIAL : "partial")
      });
    } else {
      localResult = createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "No está disponible saveLocalConnection. Revisa tl-local-save.js.",
        error: {
          message: "Falta función saveLocalConnection.",
          file: config.fileHints ? config.fileHints.LOCAL_SAVE : "modulos/telegram/storage/tl-local-save.js"
        }
      });
    }

    if (opts.skipFirebase !== true && firebaseLayer.saveFirebaseConnection && typeof firebaseLayer.saveFirebaseConnection === "function") {
      firebaseResult = await firebaseLayer.saveFirebaseConnection(connectionToSave);
    } else if (opts.skipFirebase === true) {
      firebaseResult = createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action,
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "Guardado Firebase omitido por configuración.",
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
    const status = ok
      ? (config.status ? config.status.READY : "ready")
      : partialOk
        ? (config.status ? config.status.PARTIAL : "partial")
        : (config.status ? config.status.ERROR : "error");

    return createResult({
      ok,
      status,
      action,
      source,
      file,
      message: ok
        ? "Conexión Telegram guardada en Firebase y respaldo local."
        : partialOk
          ? "Conexión guardada localmente, pero Firebase falló."
          : "No se pudo guardar la conexión Telegram.",
      error: ok ? null : {
        message: partialOk
          ? "Firebase falló, pero existe respaldo local."
          : "Falló el guardado local o remoto.",
        file: partialOk
          ? (config.fileHints ? config.fileHints.FIREBASE_SAVE : "modulos/telegram/firebase/tl-firebase-save.js")
          : file
      },
      data: {
        validation,
        statusResult,
        localResult,
        firebaseResult,
        localOk,
        firebaseOk,
        connection: {
          ...connectionToSave,
          status,
          estado: status,
          firebaseConnectionOk: firebaseOk,
          telegramConnectionOk: Boolean(connectionToSave.telegramConnectionOk)
        }
      },
      checkedAt
    });
  }

  async function saveConnectionLocalOnly(input) {
    return saveConnection(input, {
      skipFirebase: true,
      allowPartial: true
    });
  }

  connection.saveConnection = saveConnection;
  connection.saveConnectionLocalOnly = saveConnectionLocalOnly;
})(window);
