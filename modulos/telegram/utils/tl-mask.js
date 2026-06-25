/*
  Nombre completo: tl-mask.js
  Ruta: modulos/telegram/utils/tl-mask.js

  Función:
    - Enmascarar datos sensibles del módulo Telegram para diagnósticos y pantalla.
    - Evitar duplicar lógica de ocultamiento de botToken y chatId.
    - Mantener visible solo lo necesario para reconocer la conexión.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-normalize.js
    - modulos/telegram/connection/*
    - modulos/telegram/diagnostic/*
    - modulos/telegram/ui/render/*
*/

(function initTelegramMaskUtils(global) {
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

  function maskText(value, options) {
    const text = asText(value);
    const config = options && typeof options === "object" ? options : {};
    const visibleStart = Number.isInteger(config.visibleStart) ? config.visibleStart : 0;
    const visibleEnd = Number.isInteger(config.visibleEnd) ? config.visibleEnd : 4;
    const maskChar = typeof config.maskChar === "string" && config.maskChar.length > 0
      ? config.maskChar.charAt(0)
      : "*";

    if (!text) {
      return "";
    }

    if (text.length <= visibleStart + visibleEnd) {
      return maskChar.repeat(text.length);
    }

    const start = visibleStart > 0 ? text.slice(0, visibleStart) : "";
    const end = visibleEnd > 0 ? text.slice(-visibleEnd) : "";
    const maskLength = Math.max(4, text.length - start.length - end.length);

    return start + maskChar.repeat(maskLength) + end;
  }

  function maskBotToken(botToken) {
    return maskText(botToken, {
      visibleStart: 0,
      visibleEnd: 4,
      maskChar: "*"
    });
  }

  function maskChatId(chatId) {
    return maskText(chatId, {
      visibleStart: 0,
      visibleEnd: 4,
      maskChar: "*"
    });
  }

  function maskConnection(connection) {
    const data = connection && typeof connection === "object" ? connection : {};

    return {
      ...data,
      botTokenMasked: maskBotToken(data.botToken),
      chatIdMasked: maskChatId(data.chatId),
      botToken: data.botToken || "",
      chatId: data.chatId || ""
    };
  }

  utils.Mask = Object.freeze({
    maskText,
    maskBotToken,
    maskChatId,
    maskConnection
  });
})(window);
