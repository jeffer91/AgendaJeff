/*
  Nombre completo: tl-event-diagnostic.js
  Ruta: modulos/telegram/ui/events/tl-event-diagnostic.js

  Función:
    - Conectar el botón Diagnóstico con el diagnóstico completo del módulo Telegram.
    - Ejecutar diagnóstico de estado, localStorage, Firebase y Telegram API.
    - Pintar resumen, JSON técnico y archivo probable de error.
    - Activar todos los eventos UI del módulo desde una sola función.

  Se conecta con:
    - modulos/telegram/ui/dom/tl-dom-buttons.js
    - modulos/telegram/ui/render/tl-render-diagnostic.js
    - modulos/telegram/ui/render/tl-render-result.js
    - modulos/telegram/ui/render/tl-render-error.js
    - modulos/telegram/diagnostic/tl-diagnostic-report.js
    - modulos/telegram/ui/events/tl-event-save.js
    - modulos/telegram/ui/events/tl-event-load.js
    - modulos/telegram/ui/events/tl-event-clear.js
    - modulos/telegram/ui/events/tl-event-test-firebase.js
    - modulos/telegram/ui/events/tl-event-test-telegram.js
*/

(function initTelegramEventDiagnostic(global) {
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

  function renderDiagnosticResult(result) {
    const render = getRender();

    if (render.renderDiagnostic) {
      render.renderDiagnostic(result);
      return;
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

  async function handleDiagnostic(event, options) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    const config = getConfig();
    const diagnostic = telegram.Diagnostic || {};
    const render = getRender();
    const opts = options && typeof options === "object" ? options : {};

    if (!diagnostic.runDiagnosticReport || typeof diagnostic.runDiagnosticReport !== "function") {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.DIAGNOSTIC : "diagnostic",
        source: "ui",
        file: "modulos/telegram/diagnostic/tl-diagnostic-report.js",
        message: "No está disponible runDiagnosticReport. Revisa tl-diagnostic-report.js.",
        error: {
          message: "Falta función runDiagnosticReport.",
          file: "modulos/telegram/diagnostic/tl-diagnostic-report.js"
        }
      });

      renderDiagnosticResult(result);
      return result;
    }

    try {
      setLoading("diagnostic", true, "Diagnosticando...");

      if (render.renderLoadingStatus) {
        render.renderLoadingStatus("Ejecutando diagnóstico Telegram...");
      }

      const result = await diagnostic.runDiagnosticReport({
        connection: getFormConnection() || undefined,
        skipFirebase: opts.skipFirebase === true,
        skipTelegram: opts.skipTelegram === true,
        sendTestMessage: opts.sendTestMessage === true,
        skipSave: opts.skipSave === true
      });

      renderDiagnosticResult(result);
      return result;
    } catch (error) {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.DIAGNOSTIC : "diagnostic",
        source: "ui",
        file: "modulos/telegram/ui/events/tl-event-diagnostic.js",
        message: "Error inesperado ejecutando diagnóstico Telegram.",
        error: {
          message: error && error.message ? error.message : "Error desconocido.",
          file: "modulos/telegram/ui/events/tl-event-diagnostic.js"
        }
      });

      renderDiagnosticResult(result);
      return result;
    } finally {
      setLoading("diagnostic", false);
    }
  }

  async function handlePing(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    const config = getConfig();
    const render = getRender();
    const connector = telegram.Connector || {};

    try {
      setLoading("ping", true, "Verificando...");

      const result = connector.ping && typeof connector.ping === "function"
        ? await connector.ping()
        : telegram.createResult({
            ok: false,
            status: config.status ? config.status.ERROR : "error",
            action: "ping",
            source: "ui",
            file: config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/",
            message: "No está disponible el ping del conector Telegram.",
            error: {
              message: "Falta connector.ping.",
              file: config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/"
            }
          });

      if (render.renderResult) {
        render.renderResult(result);
      }

      if (render.renderConnectionStatus) {
        render.renderConnectionStatus(result);
      }

      return result;
    } finally {
      setLoading("ping", false);
    }
  }

  function attachDiagnosticEvent() {
    const button = getButton("diagnostic");

    if (!button) {
      return false;
    }

    if (button.dataset.tlDiagnosticAttached === "true") {
      return true;
    }

    button.addEventListener("click", handleDiagnostic);
    button.dataset.tlDiagnosticAttached = "true";
    return true;
  }

  function attachPingEvent() {
    const button = getButton("ping");

    if (!button) {
      return false;
    }

    if (button.dataset.tlPingAttached === "true") {
      return true;
    }

    button.addEventListener("click", handlePing);
    button.dataset.tlPingAttached = "true";
    return true;
  }

  function attachAllEvents() {
    const results = {
      save: events.attachSaveEvent ? events.attachSaveEvent() : false,
      load: events.attachLoadEvent ? events.attachLoadEvent() : false,
      clear: events.attachClearEvent ? events.attachClearEvent() : false,
      testFirebase: events.attachTestFirebaseEvent ? events.attachTestFirebaseEvent() : false,
      testTelegram: events.attachTestTelegramEvent ? events.attachTestTelegramEvent() : false,
      sendTest: events.attachSendTestEvent ? events.attachSendTestEvent() : false,
      diagnostic: attachDiagnosticEvent(),
      ping: attachPingEvent()
    };

    return {
      ok: Object.keys(results).some(function hasAttached(key) {
        return results[key];
      }),
      results
    };
  }

  events.handleDiagnostic = handleDiagnostic;
  events.handlePing = handlePing;
  events.attachDiagnosticEvent = attachDiagnosticEvent;
  events.attachPingEvent = attachPingEvent;
  events.attachAllEvents = attachAllEvents;
})(window);
