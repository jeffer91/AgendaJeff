/*
  Nombre completo: tl-event-test-telegram.js
  Ruta: modulos/telegram/ui/events/tl-event-test-telegram.js

  Función:
    - Conectar el botón Probar Telegram con la prueba completa de conexión.
    - Usar datos del formulario si existen; si no, leer la conexión guardada.
    - Probar getMe y envío de mensaje de prueba.
    - Pintar resultado, estado o error.

  Se conecta con:
    - modulos/telegram/ui/dom/tl-dom-form.js
    - modulos/telegram/ui/dom/tl-dom-buttons.js
    - modulos/telegram/ui/render/tl-render-status.js
    - modulos/telegram/ui/render/tl-render-result.js
    - modulos/telegram/ui/render/tl-render-error.js
    - modulos/telegram/connection/tl-connection-test.js
*/

(function initTelegramEventTestTelegram(global) {
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

  function getButton(key) {
    const dom = getDom();
    const buttons = dom.Buttons && typeof dom.Buttons.getButtonElements === "function"
      ? dom.Buttons.getButtonElements()
      : {};

    return buttons[key] || null;
  }

  function setLoading(buttonKey, loading, text) {
    const dom = getDom();

    if (dom.Buttons && typeof dom.Buttons.setButtonLoading === "function") {
      dom.Buttons.setButtonLoading(buttonKey, loading, text);
      return;
    }

    const button = getButton(buttonKey);

    if (button) {
      button.disabled = Boolean(loading);
    }
  }

  function getFormConnection() {
    const dom = getDom();

    if (!dom.Form || typeof dom.Form.getFormValues !== "function") {
      return null;
    }

    const values = dom.Form.getFormValues();

    if (!values.botToken && !values.chatId) {
      return null;
    }

    return {
      botToken: values.botToken,
      chatId: values.chatId,
      enabled: values.enabled
    };
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

  async function runTelegramTest(buttonKey) {
    const config = getConfig();
    const connection = telegram.Connection || {};
    const render = getRender();
    const formConnection = getFormConnection();

    if (!connection.testConnection || typeof connection.testConnection !== "function") {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.TEST_TELEGRAM : "testTelegram",
        source: "ui",
        file: config.fileHints ? config.fileHints.CONNECTION_TEST : "modulos/telegram/connection/tl-connection-test.js",
        message: "No está disponible testConnection. Revisa tl-connection-test.js.",
        error: {
          message: "Falta función testConnection.",
          file: config.fileHints ? config.fileHints.CONNECTION_TEST : "modulos/telegram/connection/tl-connection-test.js"
        }
      });

      renderResult(result);
      return result;
    }

    try {
      setLoading(buttonKey, true, buttonKey === "sendTest" ? "Enviando..." : "Probando...");

      if (render.renderLoadingStatus) {
        render.renderLoadingStatus("Probando Telegram API...");
      }

      const result = await connection.testConnection({
        connection: formConnection || undefined,
        skipPersist: false
      });

      renderResult(result);
      return result;
    } catch (error) {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.TEST_TELEGRAM : "testTelegram",
        source: "ui",
        file: "modulos/telegram/ui/events/tl-event-test-telegram.js",
        message: "Error inesperado probando Telegram.",
        error: {
          message: error && error.message ? error.message : "Error desconocido.",
          file: "modulos/telegram/ui/events/tl-event-test-telegram.js"
        }
      });

      renderResult(result);
      return result;
    } finally {
      setLoading(buttonKey, false);
    }
  }

  async function handleTestTelegram(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    return runTelegramTest("testTelegram");
  }

  async function handleSendTestMessage(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    return runTelegramTest("sendTest");
  }

  function attachTestTelegramEvent() {
    const button = getButton("testTelegram");

    if (!button) {
      return false;
    }

    if (button.dataset.tlTestTelegramAttached === "true") {
      return true;
    }

    button.addEventListener("click", handleTestTelegram);
    button.dataset.tlTestTelegramAttached = "true";
    return true;
  }

  function attachSendTestEvent() {
    const button = getButton("sendTest");

    if (!button) {
      return false;
    }

    if (button.dataset.tlSendTestAttached === "true") {
      return true;
    }

    button.addEventListener("click", handleSendTestMessage);
    button.dataset.tlSendTestAttached = "true";
    return true;
  }

  events.handleTestTelegram = handleTestTelegram;
  events.handleSendTestMessage = handleSendTestMessage;
  events.attachTestTelegramEvent = attachTestTelegramEvent;
  events.attachSendTestEvent = attachSendTestEvent;
})(window);
