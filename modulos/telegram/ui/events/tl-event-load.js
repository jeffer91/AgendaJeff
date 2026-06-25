/*
  Nombre completo: tl-event-load.js
  Ruta: modulos/telegram/ui/events/tl-event-load.js

  Función:
    - Conectar el botón Cargar con la lectura de conexión Telegram.
    - Leer desde Firebase y usar respaldo local si Firebase falla.
    - Rellenar el formulario con los datos encontrados.
    - Pintar estado, resultado o error.

  Se conecta con:
    - modulos/telegram/ui/dom/tl-dom-form.js
    - modulos/telegram/ui/dom/tl-dom-buttons.js
    - modulos/telegram/ui/render/tl-render-status.js
    - modulos/telegram/ui/render/tl-render-result.js
    - modulos/telegram/ui/render/tl-render-error.js
    - modulos/telegram/connection/tl-connection-read.js
*/

(function initTelegramEventLoad(global) {
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

    return buttons.load || null;
  }

  function setLoading(loading) {
    const dom = getDom();

    if (dom.Buttons && typeof dom.Buttons.setButtonLoading === "function") {
      dom.Buttons.setButtonLoading("load", loading, "Cargando...");
      return;
    }

    const button = getButton();

    if (button) {
      button.disabled = Boolean(loading);
    }
  }

  function getConnectionFromResult(result) {
    if (!result || !result.data) {
      return null;
    }

    return result.data.connection || null;
  }

  function setFormConnection(connectionData) {
    const dom = getDom();

    if (connectionData && dom.Form && typeof dom.Form.setFormValues === "function") {
      dom.Form.setFormValues(connectionData);
      return true;
    }

    return false;
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

  async function handleLoadConnection(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    const config = getConfig();
    const connection = getConnection();
    const render = getRender();

    if (!connection.readConnection || typeof connection.readConnection !== "function") {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.READ : "read",
        source: "ui",
        file: config.fileHints ? config.fileHints.CONNECTION_READ : "modulos/telegram/connection/tl-connection-read.js",
        message: "No está disponible readConnection. Revisa tl-connection-read.js.",
        error: {
          message: "Falta función readConnection.",
          file: config.fileHints ? config.fileHints.CONNECTION_READ : "modulos/telegram/connection/tl-connection-read.js"
        }
      });

      renderResult(result);
      return result;
    }

    try {
      setLoading(true);

      if (render.renderLoadingStatus) {
        render.renderLoadingStatus("Cargando conexión Telegram...");
      }

      const result = await connection.readConnection();
      const connectionData = getConnectionFromResult(result);

      if (connectionData) {
        setFormConnection(connectionData);
      }

      renderResult(result);
      return result;
    } catch (error) {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.READ : "read",
        source: "ui",
        file: "modulos/telegram/ui/events/tl-event-load.js",
        message: "Error inesperado cargando Telegram.",
        error: {
          message: error && error.message ? error.message : "Error desconocido.",
          file: "modulos/telegram/ui/events/tl-event-load.js"
        }
      });

      renderResult(result);
      return result;
    } finally {
      setLoading(false);
    }
  }

  function attachLoadEvent() {
    const button = getButton();

    if (!button) {
      return false;
    }

    if (button.dataset.tlLoadAttached === "true") {
      return true;
    }

    button.addEventListener("click", handleLoadConnection);
    button.dataset.tlLoadAttached = "true";
    return true;
  }

  events.handleLoadConnection = handleLoadConnection;
  events.attachLoadEvent = attachLoadEvent;
})(window);
