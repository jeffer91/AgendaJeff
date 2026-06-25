/*
  Nombre completo: tl-connection-status.js
  Ruta: modulos/telegram/connection/tl-connection-status.js

  Función:
    - Calcular el estado actual de la conexión Telegram.
    - Validar si existen botToken y chatId.
    - Determinar si la conexión está lista, parcial, vacía o con error.
    - No leer ni guardar datos; solo analiza una conexión recibida.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-normalize.js
    - modulos/telegram/utils/tl-validate.js
    - modulos/telegram/utils/tl-mask.js
    - modulos/telegram/connection/tl-connection-read.js
    - modulos/telegram/connection/tl-connection-save.js
    - modulos/telegram/diagnostic/tl-diagnostic-state.js
*/

(function initTelegramConnectionStatus(global) {
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
        action: data.action || "status",
        source: data.source || "system",
        message: data.message || "",
        file: data.file || "modulos/telegram/connection/tl-connection-status.js",
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
        ? "La conexión tiene datos mínimos."
        : "La conexión está incompleta."
    };
  }

  function hasAnyCredential(data) {
    return Boolean(data && (data.botToken || data.chatId));
  }

  function getReadableStatus(status) {
    const map = {
      idle: "Sin configurar",
      ready: "Lista",
      partial: "Incompleta",
      error: "Con error",
      testing: "Probando",
      saving: "Guardando",
      loading: "Cargando",
      cleared: "Limpiada"
    };

    return map[status] || status || "Desconocido";
  }

  function calculateConnectionStatus(input, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = config.fileHints ? config.fileHints.CONNECTION_STATUS : "modulos/telegram/connection/tl-connection-status.js";
    const source = opts.source || (config.source ? config.source.SYSTEM : "system");
    const action = opts.action || "status";
    const data = normalizeConnection(input, source);
    const validation = validateConnection(data);
    const hasCredentials = hasAnyCredential(data);

    let status = config.status ? config.status.IDLE : "idle";
    let ok = false;
    let message = "Telegram no tiene conexión configurada.";

    if (data.lastError) {
      status = config.status ? config.status.ERROR : "error";
      ok = false;
      message = data.lastError;
    } else if (validation.ok) {
      status = config.status ? config.status.READY : "ready";
      ok = true;
      message = "Telegram tiene los datos mínimos completos.";
    } else if (hasCredentials) {
      status = config.status ? config.status.PARTIAL : "partial";
      ok = false;
      message = "Telegram tiene datos parciales o inválidos.";
    }

    const resultConnection = {
      ...data,
      status,
      estado: status,
      botConfigured: Boolean(data.botToken),
      chatConfigured: Boolean(data.chatId)
    };

    return createResult({
      ok,
      status,
      action,
      source,
      file,
      message,
      error: ok ? null : {
        message,
        file
      },
      data: {
        readableStatus: getReadableStatus(status),
        hasCredentials,
        validation,
        connection: resultConnection
      }
    });
  }

  function isConnectionReady(input) {
    const result = calculateConnectionStatus(input);

    return Boolean(result && result.ok && result.status === (getConfig().status ? getConfig().status.READY : "ready"));
  }

  connection.calculateConnectionStatus = calculateConnectionStatus;
  connection.isConnectionReady = isConnectionReady;
})(window);
