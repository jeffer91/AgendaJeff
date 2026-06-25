/*
  Nombre completo: tl-connection-read.js
  Ruta: modulos/telegram/connection/tl-connection-read.js

  Función:
    - Leer la conexión Telegram usando primero Firebase.
    - Usar respaldo local automáticamente si Firebase falla o no existe documento.
    - Normalizar y calcular el estado de la conexión leída.
    - Guardar respaldo local cuando la lectura Firebase sea correcta.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/firebase/tl-firebase-read.js
    - modulos/telegram/storage/tl-local-read.js
    - modulos/telegram/storage/tl-local-save.js
    - modulos/telegram/connection/tl-connection-status.js
    - modulos/telegram/diagnostic/tl-diagnostic-state.js
*/

(function initTelegramConnectionRead(global) {
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
        action: data.action || "read",
        source: data.source || "system",
        message: data.message || "",
        file: data.file || "modulos/telegram/connection/tl-connection-read.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function normalizeConnection(input, source) {
    const config = getConfig();
    const utils = getUtils();
    const normalize = utils.Normalize || {};
    const data = input && typeof input === "object" ? input : {};

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(data, {
        source: source || data.source || (config.source ? config.source.MEMORY : "memory")
      });
    }

    return data;
  }

  function getConnectionFromResult(result) {
    if (!result || !result.data) {
      return null;
    }

    if (result.data.connection) {
      return result.data.connection;
    }

    if (result.data.backupResult && result.data.backupResult.data && result.data.backupResult.data.connection) {
      return result.data.backupResult.data.connection;
    }

    return null;
  }

  function calculateStatus(data, source) {
    if (connection.calculateConnectionStatus && typeof connection.calculateConnectionStatus === "function") {
      return connection.calculateConnectionStatus(data, {
        action: getConfig().action ? getConfig().action.READ : "read",
        source
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

  async function readConnection(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = config.fileHints ? config.fileHints.CONNECTION_READ : "modulos/telegram/connection/tl-connection-read.js";
    const action = config.action ? config.action.READ : "read";
    const checkedAt = new Date().toISOString();
    const firebaseLayer = telegram.Firebase || {};
    const storage = telegram.Storage || {};

    let firebaseResult = null;
    let localResult = null;
    let selectedConnection = null;
    let selectedSource = config.source ? config.source.NONE : "none";
    let usedFallback = false;

    if (opts.preferLocal !== true && firebaseLayer.readFirebaseConnection && typeof firebaseLayer.readFirebaseConnection === "function") {
      firebaseResult = await firebaseLayer.readFirebaseConnection();

      if (firebaseResult && firebaseResult.ok) {
        selectedSource = config.source ? config.source.FIREBASE : "firebase";
        selectedConnection = getConnectionFromResult(firebaseResult);

        if (selectedConnection && storage.saveLocalConnection && typeof storage.saveLocalConnection === "function") {
          storage.saveLocalConnection(selectedConnection, {
            source: selectedSource
          });
        }
      }
    }

    if (!selectedConnection && storage.readLocalConnectionWithFallback && typeof storage.readLocalConnectionWithFallback === "function") {
      localResult = storage.readLocalConnectionWithFallback();

      if (localResult && localResult.ok) {
        selectedSource = config.source ? config.source.LOCAL : "local";
        selectedConnection = getConnectionFromResult(localResult);
        usedFallback = Boolean(firebaseResult);
      }
    }

    if (!selectedConnection) {
      const emptyConnection = typeof telegram.getDefaultConnection === "function"
        ? telegram.getDefaultConnection()
        : {};

      return createResult({
        ok: false,
        status: config.status ? config.status.IDLE : "idle",
        action,
        source: config.source ? config.source.NONE : "none",
        file,
        message: "No se encontró conexión Telegram en Firebase ni en respaldo local.",
        error: null,
        data: {
          connection: emptyConnection,
          firebaseResult,
          localResult,
          usedFallback: false
        },
        checkedAt
      });
    }

    const normalized = normalizeConnection(selectedConnection, selectedSource);
    const statusResult = calculateStatus(normalized, selectedSource);
    const finalConnection = statusResult && statusResult.data && statusResult.data.connection
      ? statusResult.data.connection
      : normalized;

    return createResult({
      ok: Boolean(statusResult.ok),
      status: statusResult.status || (statusResult.ok ? "ready" : "partial"),
      action,
      source: selectedSource,
      file,
      message: usedFallback
        ? "Conexión Telegram cargada desde respaldo local porque Firebase no estuvo disponible."
        : "Conexión Telegram cargada correctamente.",
      error: statusResult.ok ? null : statusResult.error,
      data: {
        connection: finalConnection,
        statusResult,
        firebaseResult,
        localResult,
        usedFallback
      },
      checkedAt
    });
  }

  async function readConnectionLocalOnly() {
    return readConnection({ preferLocal: true });
  }

  connection.readConnection = readConnection;
  connection.readConnectionLocalOnly = readConnectionLocalOnly;
})(window);
