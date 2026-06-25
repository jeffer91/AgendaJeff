/*
  Nombre completo: tl-event-save.js
  Ruta: modulos/telegram/ui/events/tl-event-save.js

  Función:
    - Conectar el botón Guardar con la capa de conexión Telegram.
    - Leer datos del formulario usando tl-dom-form.js.
    - Guardar en localStorage y Firebase usando tl-connection-save.js.
    - Pintar estado, resultado o error sin mezclar lógica visual con conexión.

  Se conecta con:
    - modulos/telegram/ui/dom/tl-dom-form.js
    - modulos/telegram/ui/dom/tl-dom-buttons.js
    - modulos/telegram/ui/render/tl-render-status.js
    - modulos/telegram/ui/render/tl-render-result.js
    - modulos/telegram/ui/render/tl-render-error.js
    - modulos/telegram/connection/tl-connection-save.js
*/

(function initTelegramEventSave(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const ui = telegram.UI = telegram.UI || {};
  const events = ui.Events = ui.Events || {};

  function getDom() {
    return ui.Dom || {};
  }

  function getRender() {
    return ui.Render || {};
  }

  function getConfig() {
    return telegram.CONFIG || {};
  }

  function getConnection() {
    return telegram.Connection || {};
  }

  function getButton() {
    const dom = getDom();
    const buttons = dom.Buttons && typeof dom.Buttons.getButtonElements === "function"
      ? dom.Buttons.getButtonElements()
      : {};

    return buttons.save || null;
  }

  function getFormValues() {
    const dom = getDom();

    if (dom.Form && typeof dom.Form.getFormValues === "function") {
      return dom.Form.getFormValues();
    }

    return {
      botToken: "",
      chatId: "",
      enabled: true,
      messageText: ""
    };
  }

  function setLoading(loading) {
    const dom = getDom();

    if (dom.Buttons && typeof dom.Buttons.setButtonLoading === "function") {
      dom.Buttons.setButtonLoading("save", loading, "Guardando...");
      return;
    }

    const button = getButton();

    if (button) {
      button.disabled = Boolean(loading);
    }
  }

  function renderResult(result) {
    const render = getRender();

    if (render.renderConnectionStatus) {
      render.renderConnectionStatus(result);
    }

    if (result && result.ok && render.renderResult) {
      render.renderResult(result);
      return;
    }

    if (render.renderError) {
      render.renderError(result);
      return;
    }

    if (render.renderResult) {
      render.renderResult(result);
    }
  }

  async function handleSaveConnection(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    const config = getConfig();
    const connection = getConnection();
    const render = getRender();
    const values = getFormValues();

    if (!connection.saveConnection || typeof connection.saveConnection !== "function") {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.SAVE : "save",
        source: "ui",
        file: config.fileHints ? config.fileHints.CONNECTION_SAVE : "modulos/telegram/connection/tl-connection-save.js",
        message: "No está disponible saveConnection. Revisa tl-connection-save.js.",
        error: {
          message: "Falta función saveConnection.",
          file: config.fileHints ? config.fileHints.CONNECTION_SAVE : "modulos/telegram/connection/tl-connection-save.js"
        }
      });

      renderResult(result);
      return result;
    }

    try {
      setLoading(true);

      if (render.renderLoadingStatus) {
        render.renderLoadingStatus("Guardando conexión Telegram...");
      }

      const result = await connection.saveConnection({
        botToken: values.botToken,
        chatId: values.chatId,
        enabled: values.enabled
      });

      renderResult(result);
      return result;
    } catch (error) {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.SAVE : "save",
        source: "ui",
        file: "modulos/telegram/ui/events/tl-event-save.js",
        message: "Error inesperado guardando Telegram.",
        error: {
          message: error && error.message ? error.message : "Error desconocido.",
          file: "modulos/telegram/ui/events/tl-event-save.js"
        }
      });

      renderResult(result);
      return result;
    } finally {
      setLoading(false);
    }
  }

  function attachSaveEvent() {
    const button = getButton();

    if (!button) {
      return false;
    }

    if (button.dataset.tlSaveAttached === "true") {
      return true;
    }

    button.addEventListener("click", handleSaveConnection);
    button.dataset.tlSaveAttached = "true";
    return true;
  }

  events.handleSaveConnection = handleSaveConnection;
  events.attachSaveEvent = attachSaveEvent;
})(window);
