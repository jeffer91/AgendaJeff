/*
  Nombre completo: tl-event-clear.js
  Ruta: modulos/telegram/ui/events/tl-event-clear.js

  Función:
    - Conectar el botón Limpiar con la limpieza de conexión Telegram.
    - Limpiar formulario, estado local y marca remota cuando corresponda.
    - Pedir confirmación antes de borrar datos de conexión.
    - Pintar resultado o error.

  Se conecta con:
    - modulos/telegram/ui/dom/tl-dom-form.js
    - modulos/telegram/ui/dom/tl-dom-buttons.js
    - modulos/telegram/ui/render/tl-render-status.js
    - modulos/telegram/ui/render/tl-render-result.js
    - modulos/telegram/ui/render/tl-render-error.js
    - modulos/telegram/connection/tl-connection-clear.js
*/

(function initTelegramEventClear(global) {
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

    return buttons.clear || null;
  }

  function setLoading(loading) {
    const dom = getDom();

    if (dom.Buttons && typeof dom.Buttons.setButtonLoading === "function") {
      dom.Buttons.setButtonLoading("clear", loading, "Limpiando...");
      return;
    }

    const button = getButton();

    if (button) {
      button.disabled = Boolean(loading);
    }
  }

  function clearForm() {
    const dom = getDom();

    if (dom.Form && typeof dom.Form.clearForm === "function") {
      dom.Form.clearForm({ clearMessage: false });
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

  function shouldProceed(options) {
    const opts = options && typeof options === "object" ? options : {};

    if (opts.skipConfirm === true) {
      return true;
    }

    if (typeof global.confirm !== "function") {
      return true;
    }

    return global.confirm("¿Seguro que deseas limpiar la conexión Telegram?");
  }

  async function handleClearConnection(event, options) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    const config = getConfig();
    const connection = getConnection();
    const render = getRender();

    if (!shouldProceed(options)) {
      return telegram.createResult({
        ok: false,
        status: config.status ? config.status.IDLE : "idle",
        action: config.action ? config.action.CLEAR : "clear",
        source: "ui",
        file: "modulos/telegram/ui/events/tl-event-clear.js",
        message: "Limpieza cancelada por el usuario."
      });
    }

    if (!connection.clearConnection || typeof connection.clearConnection !== "function") {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.CLEAR : "clear",
        source: "ui",
        file: config.fileHints ? config.fileHints.CONNECTION_CLEAR : "modulos/telegram/connection/tl-connection-clear.js",
        message: "No está disponible clearConnection. Revisa tl-connection-clear.js.",
        error: {
          message: "Falta función clearConnection.",
          file: config.fileHints ? config.fileHints.CONNECTION_CLEAR : "modulos/telegram/connection/tl-connection-clear.js"
        }
      });

      renderResult(result);
      return result;
    }

    try {
      setLoading(true);

      if (render.renderLoadingStatus) {
        render.renderLoadingStatus("Limpiando conexión Telegram...");
      }

      const result = await connection.clearConnection({
        includeBackup: true,
        includeDiagnostic: false,
        includeLastResult: false
      });

      if (result && result.ok) {
        clearForm();
      }

      renderResult(result);
      return result;
    } catch (error) {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.CLEAR : "clear",
        source: "ui",
        file: "modulos/telegram/ui/events/tl-event-clear.js",
        message: "Error inesperado limpiando Telegram.",
        error: {
          message: error && error.message ? error.message : "Error desconocido.",
          file: "modulos/telegram/ui/events/tl-event-clear.js"
        }
      });

      renderResult(result);
      return result;
    } finally {
      setLoading(false);
    }
  }

  function attachClearEvent() {
    const button = getButton();

    if (!button) {
      return false;
    }

    if (button.dataset.tlClearAttached === "true") {
      return true;
    }

    button.addEventListener("click", handleClearConnection);
    button.dataset.tlClearAttached = "true";
    return true;
  }

  events.handleClearConnection = handleClearConnection;
  events.attachClearEvent = attachClearEvent;
})(window);
