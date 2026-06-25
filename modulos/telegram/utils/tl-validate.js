/*
  Nombre completo: tl-validate.js
  Ruta: modulos/telegram/utils/tl-validate.js

  Función:
    - Validar datos del módulo Telegram antes de guardar o probar conexión.
    - Validar botToken, chatId y conexión completa.
    - Entregar errores claros indicando el archivo probable a revisar.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-normalize.js
    - modulos/telegram/connection/*
    - modulos/telegram/api/*
    - modulos/telegram/diagnostic/*
    - modulos/telegram/ui/events/*
*/

(function initTelegramValidateUtils(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const utils = telegram.Utils = telegram.Utils || {};

  function getConfig() {
    return telegram.CONFIG || {};
  }

  function asText(value) {
    if (utils.Normalize && typeof utils.Normalize.asText === "function") {
      return utils.Normalize.asText(value);
    }

    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function validateBotToken(botToken) {
    const config = getConfig();
    const file = config.fileHints ? config.fileHints.API_GETME : "modulos/telegram/api/tl-api-getme.js";
    const value = asText(botToken).replace(/\s+/g, "");
    const tokenPattern = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;

    if (!value) {
      return {
        ok: false,
        field: "botToken",
        value,
        message: "Falta el Bot Token de Telegram.",
        file
      };
    }

    if (!tokenPattern.test(value)) {
      return {
        ok: false,
        field: "botToken",
        value,
        message: "El Bot Token no tiene el formato esperado de Telegram.",
        file
      };
    }

    return {
      ok: true,
      field: "botToken",
      value,
      message: "Bot Token válido por formato.",
      file
    };
  }

  function validateChatId(chatId) {
    const config = getConfig();
    const file = config.fileHints ? config.fileHints.API_SEND : "modulos/telegram/api/tl-api-send.js";
    const value = asText(chatId).replace(/\s+/g, "");
    const numericChatPattern = /^-?\d{5,}$/;
    const usernamePattern = /^@[A-Za-z0-9_]{5,32}$/;

    if (!value) {
      return {
        ok: false,
        field: "chatId",
        value,
        message: "Falta el Chat ID de Telegram.",
        file
      };
    }

    if (!numericChatPattern.test(value) && !usernamePattern.test(value)) {
      return {
        ok: false,
        field: "chatId",
        value,
        message: "El Chat ID debe ser numérico o un username tipo @usuario.",
        file
      };
    }

    return {
      ok: true,
      field: "chatId",
      value,
      message: "Chat ID válido por formato.",
      file
    };
  }

  function validateConnection(connection) {
    const config = getConfig();
    const normalize = utils.Normalize || {};
    const data = typeof normalize.normalizeConnection === "function"
      ? normalize.normalizeConnection(connection)
      : (connection || {});

    const tokenCheck = validateBotToken(data.botToken);
    const chatCheck = validateChatId(data.chatId);
    const errors = [];

    if (!tokenCheck.ok) {
      errors.push(tokenCheck);
    }

    if (!chatCheck.ok) {
      errors.push(chatCheck);
    }

    return {
      ok: errors.length === 0,
      status: errors.length === 0
        ? (config.status ? config.status.READY : "ready")
        : (config.status ? config.status.PARTIAL : "partial"),
      data,
      checks: {
        botToken: tokenCheck,
        chatId: chatCheck
      },
      errors,
      message: errors.length === 0
        ? "La conexión Telegram tiene los datos mínimos completos."
        : "La conexión Telegram está incompleta o tiene datos inválidos.",
      checkedAt: new Date().toISOString()
    };
  }

  function validateRequiredElement(element, name, file) {
    if (element) {
      return {
        ok: true,
        name,
        file: file || "modulos/telegram/ui/dom/",
        message: "Elemento encontrado."
      };
    }

    return {
      ok: false,
      name,
      file: file || "modulos/telegram/ui/dom/",
      message: "No se encontró el elemento requerido en el HTML."
    };
  }

  utils.Validate = Object.freeze({
    validateBotToken,
    validateChatId,
    validateConnection,
    validateRequiredElement
  });
})(window);
