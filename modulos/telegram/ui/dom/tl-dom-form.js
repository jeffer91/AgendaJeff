/*
  Nombre completo: tl-dom-form.js
  Ruta: modulos/telegram/ui/dom/tl-dom-form.js

  Función:
    - Centralizar la lectura y escritura de campos del formulario Telegram.
    - Evitar que eventos, render o conexión consulten inputs directamente.
    - Definir IDs esperados para el HTML final del módulo Telegram.
    - Entregar datos limpios para guardar, probar o enviar mensajes.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-normalize.js
    - modulos/telegram/ui/events/*
    - modulos/telegram/ui/render/*
    - modulos/telegram/startup/tl-start.js
*/

(function initTelegramDomForm(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const ui = telegram.UI = telegram.UI || {};
  const dom = ui.Dom = ui.Dom || {};

  const IDS = Object.freeze({
    form: "tlConnectionForm",
    botToken: "tlBotToken",
    chatId: "tlChatId",
    enabled: "tlEnabled",
    messageText: "tlMessageText"
  });

  function byId(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function asText(value) {
    if (telegram.Utils && telegram.Utils.Normalize && typeof telegram.Utils.Normalize.asText === "function") {
      return telegram.Utils.Normalize.asText(value);
    }

    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function getFormElements() {
    return {
      form: byId(IDS.form),
      botToken: byId(IDS.botToken),
      chatId: byId(IDS.chatId),
      enabled: byId(IDS.enabled),
      messageText: byId(IDS.messageText)
    };
  }

  function getMissingFormElements() {
    const elements = getFormElements();

    return Object.keys(elements).filter(function filterMissing(key) {
      return !elements[key];
    });
  }

  function getFormValues() {
    const elements = getFormElements();

    return {
      botToken: elements.botToken ? asText(elements.botToken.value) : "",
      chatId: elements.chatId ? asText(elements.chatId.value) : "",
      enabled: elements.enabled ? Boolean(elements.enabled.checked) : true,
      messageText: elements.messageText ? asText(elements.messageText.value) : ""
    };
  }

  function setInputValue(element, value) {
    if (!element) {
      return;
    }

    element.value = value === null || value === undefined ? "" : String(value);
  }

  function setFormValues(connection) {
    const data = connection && typeof connection === "object" ? connection : {};
    const elements = getFormElements();

    setInputValue(elements.botToken, data.botToken || "");
    setInputValue(elements.chatId, data.chatId || "");

    if (elements.enabled) {
      elements.enabled.checked = data.enabled !== false;
    }
  }

  function clearForm(options) {
    const opts = options && typeof options === "object" ? options : {};
    const elements = getFormElements();

    setInputValue(elements.botToken, "");
    setInputValue(elements.chatId, "");

    if (opts.clearMessage === true) {
      setInputValue(elements.messageText, "");
    }

    if (elements.enabled) {
      elements.enabled.checked = true;
    }
  }

  function focusFirstEmptyField() {
    const elements = getFormElements();

    if (elements.botToken && !asText(elements.botToken.value)) {
      elements.botToken.focus();
      return "botToken";
    }

    if (elements.chatId && !asText(elements.chatId.value)) {
      elements.chatId.focus();
      return "chatId";
    }

    return "";
  }

  dom.Form = Object.freeze({
    IDS,
    getFormElements,
    getMissingFormElements,
    getFormValues,
    setFormValues,
    clearForm,
    focusFirstEmptyField
  });
})(window);
