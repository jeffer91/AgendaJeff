/*
  Nombre completo: tl-normalize.js
  Ruta: modulos/telegram/utils/tl-normalize.js

  Función:
    - Normalizar datos de conexión Telegram antes de guardar, leer o diagnosticar.
    - Convertir valores vacíos, booleanos, fechas, estado y origen a un formato consistente.
    - Calcular banderas como botConfigured y chatConfigured.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-mask.js
    - modulos/telegram/utils/tl-time.js
    - modulos/telegram/storage/*
    - modulos/telegram/firebase/*
    - modulos/telegram/connection/*
    - modulos/telegram/diagnostic/*
*/

(function initTelegramNormalizeUtils(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const utils = telegram.Utils = telegram.Utils || {};

  function asText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function asBoolean(value, defaultValue) {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return Boolean(defaultValue);
  }

  function pickStatus(value) {
    const config = telegram.CONFIG || {};
    const status = config.status || {};
    const allowed = Object.keys(status).map(function mapStatus(key) {
      return status[key];
    });

    const text = asText(value);

    if (allowed.includes(text)) {
      return text;
    }

    return status.IDLE || "idle";
  }

  function pickSource(value) {
    const config = telegram.CONFIG || {};
    const source = config.source || {};
    const allowed = Object.keys(source).map(function mapSource(key) {
      return source[key];
    });

    const text = asText(value);

    if (allowed.includes(text)) {
      return text;
    }

    return source.NONE || "none";
  }

  function normalizeBotToken(botToken) {
    return asText(botToken).replace(/\s+/g, "");
  }

  function normalizeChatId(chatId) {
    return asText(chatId).replace(/\s+/g, "");
  }

  function normalizeConnection(input, options) {
    const data = input && typeof input === "object" ? input : {};
    const config = telegram.CONFIG || {};
    const defaults = typeof telegram.getDefaultConnection === "function"
      ? telegram.getDefaultConnection()
      : {};
    const opts = options && typeof options === "object" ? options : {};
    const time = utils.Time || {};
    const mask = utils.Mask || {};

    const botToken = normalizeBotToken(data.botToken);
    const chatId = normalizeChatId(data.chatId);
    const now = typeof time.nowIso === "function" ? time.nowIso() : new Date().toISOString();
    const updatedAt = asText(data.updatedAt || data.actualizadoEn || data.savedAt) || now;

    const normalized = {
      ...defaults,
      ...data,
      enabled: asBoolean(data.enabled, defaults.enabled !== false),
      provider: asText(data.provider) || (config.firebase && config.firebase.provider) || "telegram",
      appName: asText(data.appName || data.aplicacion) || (config.firebase && config.firebase.appName) || "AgendaJeff",
      source: pickSource(data.source || opts.source),
      status: pickStatus(data.status || data.estado),
      botToken,
      chatId,
      botTokenMasked: "",
      chatIdMasked: "",
      botConfigured: botToken.length > 0,
      chatConfigured: chatId.length > 0,
      lastAction: asText(data.lastAction || data.ultimaAccion),
      lastError: asText(data.lastError || data.lastErrorMessage || data.errorMessage),
      lastErrorFile: asText(data.lastErrorFile || data.file),
      lastCheckedAt: asText(data.lastCheckedAt || data.firebaseLastCheck || data.checkedAt),
      updatedAt,
      actualizadoEn: updatedAt
    };

    if (typeof mask.maskBotToken === "function") {
      normalized.botTokenMasked = mask.maskBotToken(botToken);
    }

    if (typeof mask.maskChatId === "function") {
      normalized.chatIdMasked = mask.maskChatId(chatId);
    }

    return normalized;
  }

  function normalizeError(error, fallbackFile) {
    if (!error) {
      return {
        message: "",
        file: fallbackFile || "",
        stack: ""
      };
    }

    if (typeof error === "string") {
      return {
        message: error,
        file: fallbackFile || "",
        stack: ""
      };
    }

    return {
      message: error.message || "Error desconocido.",
      file: error.file || fallbackFile || "",
      stack: error.stack || ""
    };
  }

  utils.Normalize = Object.freeze({
    asText,
    asBoolean,
    pickStatus,
    pickSource,
    normalizeBotToken,
    normalizeChatId,
    normalizeConnection,
    normalizeError
  });
})(window);
