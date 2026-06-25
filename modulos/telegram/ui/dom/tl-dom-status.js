/*
  Nombre completo: tl-dom-status.js
  Ruta: modulos/telegram/ui/dom/tl-dom-status.js

  Función:
    - Centralizar los elementos visuales de estado del módulo Telegram.
    - Definir IDs esperados para estado general, Firebase, localStorage, Telegram API y Electron.
    - Permitir cambiar texto y clases sin mezclar lógica con render o eventos.

  Se conecta con:
    - modulos/telegram/ui/render/tl-render-status.js
    - modulos/telegram/ui/render/tl-render-diagnostic.js
    - modulos/telegram/startup/tl-start.js
*/

(function initTelegramDomStatus(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const ui = telegram.UI = telegram.UI || {};
  const dom = ui.Dom = ui.Dom || {};

  const IDS = Object.freeze({
    statusBadge: "tlStatusBadge",
    statusTitle: "tlStatusTitle",
    statusDescription: "tlStatusDescription",
    statusSource: "tlStatusSource",
    statusUpdatedAt: "tlStatusUpdatedAt",
    firebaseStatus: "tlFirebaseStatus",
    localStatus: "tlLocalStatus",
    telegramStatus: "tlTelegramStatus",
    electronStatus: "tlElectronStatus"
  });

  function byId(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function getStatusElements() {
    return {
      statusBadge: byId(IDS.statusBadge),
      statusTitle: byId(IDS.statusTitle),
      statusDescription: byId(IDS.statusDescription),
      statusSource: byId(IDS.statusSource),
      statusUpdatedAt: byId(IDS.statusUpdatedAt),
      firebaseStatus: byId(IDS.firebaseStatus),
      localStatus: byId(IDS.localStatus),
      telegramStatus: byId(IDS.telegramStatus),
      electronStatus: byId(IDS.electronStatus)
    };
  }

  function setText(element, value, fallback) {
    if (!element) {
      return false;
    }

    element.textContent = value === null || value === undefined || value === ""
      ? (fallback || "")
      : String(value);

    return true;
  }

  function setStatusClass(element, status) {
    if (!element) {
      return false;
    }

    const safeStatus = status || "idle";
    const classList = [
      "is-idle",
      "is-ready",
      "is-partial",
      "is-error",
      "is-testing",
      "is-saving",
      "is-loading",
      "is-cleared"
    ];

    element.classList.remove(...classList);
    element.classList.add(`is-${safeStatus}`);
    element.dataset.status = safeStatus;

    return true;
  }

  function setMiniStatus(key, status, text) {
    const elements = getStatusElements();
    const element = elements[key];

    if (!element) {
      return false;
    }

    setText(element, text || status || "Pendiente");
    setStatusClass(element, status || "idle");
    return true;
  }

  function getMissingStatusElements() {
    const elements = getStatusElements();

    return Object.keys(elements).filter(function filterMissing(key) {
      return !elements[key];
    });
  }

  dom.Status = Object.freeze({
    IDS,
    getStatusElements,
    getMissingStatusElements,
    setText,
    setStatusClass,
    setMiniStatus
  });
})(window);
