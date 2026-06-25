/*
  Nombre completo: tl-connector-status.js
  Ruta: modulos/telegram/connector/tl-connector-status.js

  Función:
    - Exponer el estado de Telegram para otros módulos de AgendaJeff.
    - Permitir que otros módulos consulten si Telegram está listo sin tocar Firebase, localStorage ni API.
    - Ocultar datos sensibles en las respuestas públicas del conector.
    - Crear la puerta pública window.AgendaJeffTelegram de forma progresiva.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/connection/tl-connection-read.js
    - modulos/telegram/connection/tl-connection-status.js
    - modulos/telegram/utils/tl-mask.js
    - modulos/telegram/connector/tl-connector-send.js
    - modulos/telegram/connector/tl-connector-test.js
*/

(function initTelegramConnectorStatus(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const connector = telegram.Connector = telegram.Connector || {};
  const publicConnector = global.AgendaJeffTelegram = global.AgendaJeffTelegram || {};

  let lastStatusResult = null;

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
        action: data.action || "status",
        source: data.source || "connector",
        message: data.message || "",
        file: data.file || "modulos/telegram/connector/tl-connector-status.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function maskValue(value, visibleEnd) {
    const utils = getUtils();

    if (utils.Mask && typeof utils.Mask.maskText === "function") {
      return utils.Mask.maskText(value, {
        visibleStart: 0,
        visibleEnd: visibleEnd || 4,
        maskChar: "*"
      });
    }

    const text = value === null || value === undefined ? "" : String(value).trim();

    if (!text) {
      return "";
    }

    return "*".repeat(Math.max(4, text.length - 4)) + text.slice(-4);
  }

  function toPublicConnection(connection) {
    const data = connection && typeof connection === "object" ? connection : {};

    return {
      enabled: data.enabled !== false,
      provider: data.provider || "telegram",
      appName: data.appName || data.aplicacion || "AgendaJeff",
      source: data.source || "none",
      status: data.status || data.estado || "idle",
      estado: data.estado || data.status || "idle",
      botConfigured: Boolean(data.botConfigured || data.botToken),
      chatConfigured: Boolean(data.chatConfigured || data.chatId),
      botTokenMasked: data.botTokenMasked || maskValue(data.botToken, 4),
      chatIdMasked: data.chatIdMasked || maskValue(data.chatId, 4),
      firebaseConnectionOk: Boolean(data.firebaseConnectionOk || data.firebaseConexionOk),
      telegramConnectionOk: Boolean(data.telegramConnectionOk),
      lastAction: data.lastAction || data.ultimaAccion || "",
      lastError: data.lastError || data.lastErrorMessage || "",
      lastErrorFile: data.lastErrorFile || "",
      lastCheckedAt: data.lastCheckedAt || data.firebaseLastCheck || data.telegramLastCheck || "",
      updatedAt: data.updatedAt || data.actualizadoEn || ""
    };
  }

  function getConnectionFromResult(result) {
    if (!result || !result.data) {
      return null;
    }

    return result.data.connection || null;
  }

  async function readConnectionSafely(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const connectionLayer = telegram.Connection || {};
    const file = config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/";
    const opts = options && typeof options === "object" ? options : {};

    if (opts.connection && typeof opts.connection === "object") {
      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: "status",
        source: "connector",
        file,
        message: "Conexión recibida directamente por el conector.",
        data: {
          connection: opts.connection,
          readResult: null
        }
      });
    }

    if (!connectionLayer.readConnection || typeof connectionLayer.readConnection !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: "status",
        source: "connector",
        file,
        message: "No está disponible readConnection. Revisa tl-connection-read.js.",
        error: {
          message: "Falta función readConnection.",
          file: config.fileHints ? config.fileHints.CONNECTION_READ : "modulos/telegram/connection/tl-connection-read.js"
        }
      });
    }

    const readResult = await connectionLayer.readConnection({
      preferLocal: opts.preferLocal === true
    });

    return createResult({
      ok: Boolean(readResult && readResult.data && readResult.data.connection),
      status: readResult ? readResult.status : (config.status ? config.status.ERROR : "error"),
      action: "status",
      source: "connector",
      file,
      message: readResult && readResult.data && readResult.data.connection
        ? "Conexión Telegram obtenida para el conector."
        : "No se pudo obtener conexión Telegram para el conector.",
      error: readResult && readResult.ok ? null : readResult ? readResult.error : null,
      data: {
        connection: getConnectionFromResult(readResult),
        readResult
      }
    });
  }

  function calculateStatus(connectionData) {
    const connectionLayer = telegram.Connection || {};

    if (connectionLayer.calculateConnectionStatus && typeof connectionLayer.calculateConnectionStatus === "function") {
      return connectionLayer.calculateConnectionStatus(connectionData, {
        action: "status",
        source: "connector"
      });
    }

    const isReady = Boolean(connectionData && connectionData.botToken && connectionData.chatId);

    return getCreateResult()({
      ok: isReady,
      status: isReady ? "ready" : "partial",
      action: "status",
      source: "connector",
      file: "modulos/telegram/connector/tl-connector-status.js",
      message: isReady ? "Telegram listo." : "Telegram incompleto.",
      data: {
        connection: connectionData || {}
      }
    });
  }

  async function getStatus(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/";
    const readResult = await readConnectionSafely(options);

    if (!readResult.ok || !readResult.data || !readResult.data.connection) {
      lastStatusResult = createResult({
        ok: false,
        status: readResult.status || (config.status ? config.status.IDLE : "idle"),
        action: "status",
        source: "connector",
        file,
        message: readResult.message || "Telegram no tiene conexión disponible.",
        error: readResult.error,
        data: {
          publicConnection: null,
          readResult
        }
      });

      return lastStatusResult;
    }

    const statusResult = calculateStatus(readResult.data.connection);
    const publicConnection = toPublicConnection(
      statusResult && statusResult.data && statusResult.data.connection
        ? statusResult.data.connection
        : readResult.data.connection
    );

    lastStatusResult = createResult({
      ok: Boolean(statusResult && statusResult.ok),
      status: statusResult ? statusResult.status : (config.status ? config.status.ERROR : "error"),
      action: "status",
      source: "connector",
      file,
      message: statusResult ? statusResult.message : "Estado Telegram no disponible.",
      error: statusResult && statusResult.ok ? null : statusResult ? statusResult.error : null,
      data: {
        publicConnection,
        readResult,
        statusResult
      }
    });

    return lastStatusResult;
  }

  async function isReady(options) {
    const result = await getStatus(options);
    return Boolean(result && result.ok && result.status === (getConfig().status ? getConfig().status.READY : "ready"));
  }

  function getLastStatus() {
    return lastStatusResult;
  }

  connector.readConnectionSafely = readConnectionSafely;
  connector.getStatus = getStatus;
  connector.isReady = isReady;
  connector.getLastStatus = getLastStatus;
  connector.toPublicConnection = toPublicConnection;

  publicConnector.getStatus = getStatus;
  publicConnector.isReady = isReady;
  publicConnector.getLastStatus = getLastStatus;
})(window);
