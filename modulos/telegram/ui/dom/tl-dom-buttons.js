/*
  Nombre completo: tl-dom-buttons.js
  Ruta: modulos/telegram/ui/dom/tl-dom-buttons.js

  Función:
    - Centralizar los botones del módulo Telegram.
    - Definir IDs esperados para guardar, cargar, limpiar, probar y diagnosticar.
    - Activar, desactivar o marcar botones como cargando sin repetir lógica.

  Se conecta con:
    - modulos/telegram/ui/events/*
    - modulos/telegram/ui/render/*
    - modulos/telegram/startup/tl-start.js
*/

(function initTelegramDomButtons(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const ui = telegram.UI = telegram.UI || {};
  const dom = ui.Dom = ui.Dom || {};

  const IDS = Object.freeze({
    save: "tlBtnSave",
    load: "tlBtnLoad",
    clear: "tlBtnClear",
    testFirebase: "tlBtnTestFirebase",
    testTelegram: "tlBtnTestTelegram",
    sendTest: "tlBtnSendTest",
    diagnostic: "tlBtnDiagnostic",
    ping: "tlBtnPing"
  });

  function byId(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function getButtonElements() {
    return {
      save: byId(IDS.save),
      load: byId(IDS.load),
      clear: byId(IDS.clear),
      testFirebase: byId(IDS.testFirebase),
      testTelegram: byId(IDS.testTelegram),
      sendTest: byId(IDS.sendTest),
      diagnostic: byId(IDS.diagnostic),
      ping: byId(IDS.ping)
    };
  }

  function getMissingButtonElements() {
    const buttons = getButtonElements();

    return Object.keys(buttons).filter(function filterMissing(key) {
      return !buttons[key];
    });
  }

  function forEachButton(callback) {
    const buttons = getButtonElements();

    Object.keys(buttons).forEach(function eachButton(key) {
      if (buttons[key]) {
        callback(buttons[key], key);
      }
    });
  }

  function setButtonsDisabled(disabled, exceptKeys) {
    const exceptions = Array.isArray(exceptKeys) ? exceptKeys : [];

    forEachButton(function setDisabled(button, key) {
      if (!exceptions.includes(key)) {
        button.disabled = Boolean(disabled);
      }
    });
  }

  function setButtonLoading(buttonKey, loading, textWhenLoading) {
    const buttons = getButtonElements();
    const button = buttons[buttonKey];

    if (!button) {
      return false;
    }

    if (loading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }

      button.textContent = textWhenLoading || "Procesando...";
      button.disabled = true;
      button.classList.add("is-loading");
      return true;
    }

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }

    button.disabled = false;
    button.classList.remove("is-loading");
    return true;
  }

  function resetButtonsLoading() {
    forEachButton(function reset(button) {
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }

      button.classList.remove("is-loading");
      button.disabled = false;
    });
  }

  dom.Buttons = Object.freeze({
    IDS,
    getButtonElements,
    getMissingButtonElements,
    forEachButton,
    setButtonsDisabled,
    setButtonLoading,
    resetButtonsLoading
  });
})(window);
