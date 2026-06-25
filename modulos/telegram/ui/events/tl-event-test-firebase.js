/*
  Nombre completo: tl-event-test-firebase.js
  Ruta: modulos/telegram/ui/events/tl-event-test-firebase.js

  Función:
    - Conectar el botón Probar Firebase con la capa Firebase del módulo Telegram.
    - Ejecutar prueba de SDK, configuración, inicialización, lectura y escritura de marca.
    - Pintar resultado o error sin mezclar lógica de Firebase con UI.

  Se conecta con:
    - modulos/telegram/ui/dom/tl-dom-buttons.js
    - modulos/telegram/ui/render/tl-render-status.js
    - modulos/telegram/ui/render/tl-render-result.js
    - modulos/telegram/ui/render/tl-render-error.js
    - modulos/telegram/firebase/tl-firebase-test.js
*/

(function initTelegramEventTestFirebase(global) {
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

  function getButton() {
    const dom = getDom();
    const buttons = dom.Buttons && typeof dom.Buttons.getButtonElements === "function"
      ? dom.Buttons.getButtonElements()
      : {};

    return buttons.testFirebase || null;
  }

  function setLoading(loading) {
    const dom = getDom();

    if (dom.Buttons && typeof dom.Buttons.setButtonLoading === "function") {
      dom.Buttons.setButtonLoading("testFirebase", loading, "Probando Firebase...");
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
      render.renderConnectionStatus({
        ok: Boolean(result && result.ok),
        status: result && result.ok ? "ready" : "error",
        source: "firebase",
        message: result && result.message ? result.message : "Prueba Firebase ejecutada.",
        checkedAt: result && result.checkedAt ? result.checkedAt : new Date().toISOString(),
        data: {
          connection: {
            status: result && result.ok ? "ready" : "error",
            source: "firebase",
            firebaseConnectionOk: Boolean(result && result.ok)
          }
        }
      });
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

  async function handleTestFirebase(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    const config = getConfig();
    const firebaseLayer = telegram.Firebase || {};
    const render = getRender();

    if (!firebaseLayer.testFirebaseConnection || typeof firebaseLayer.testFirebaseConnection !== "function") {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.TEST_FIREBASE : "testFirebase",
        source: "ui",
        file: config.fileHints ? config.fileHints.FIREBASE_TEST : "modulos/telegram/firebase/tl-firebase-test.js",
        message: "No está disponible testFirebaseConnection. Revisa tl-firebase-test.js.",
        error: {
          message: "Falta función testFirebaseConnection.",
          file: config.fileHints ? config.fileHints.FIREBASE_TEST : "modulos/telegram/firebase/tl-firebase-test.js"
        }
      });

      renderResult(result);
      return result;
    }

    try {
      setLoading(true);

      if (render.renderLoadingStatus) {
        render.renderLoadingStatus("Probando Firebase Telegram...");
      }

      const result = await firebaseLayer.testFirebaseConnection();
      renderResult(result);
      return result;
    } catch (error) {
      const result = telegram.createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.TEST_FIREBASE : "testFirebase",
        source: "ui",
        file: "modulos/telegram/ui/events/tl-event-test-firebase.js",
        message: "Error inesperado probando Firebase.",
        error: {
          message: error && error.message ? error.message : "Error desconocido.",
          file: "modulos/telegram/ui/events/tl-event-test-firebase.js"
        }
      });

      renderResult(result);
      return result;
    } finally {
      setLoading(false);
    }
  }

  function attachTestFirebaseEvent() {
    const button = getButton();

    if (!button) {
      return false;
    }

    if (button.dataset.tlTestFirebaseAttached === "true") {
      return true;
    }

    button.addEventListener("click", handleTestFirebase);
    button.dataset.tlTestFirebaseAttached = "true";
    return true;
  }

  events.handleTestFirebase = handleTestFirebase;
  events.attachTestFirebaseEvent = attachTestFirebaseEvent;
})(window);
