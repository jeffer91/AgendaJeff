/*
  Nombre completo: tl-dom-result.js
  Ruta: modulos/telegram/ui/dom/tl-dom-result.js

  Función:
    - Centralizar cajas de resultado, JSON, errores y diagnóstico.
    - Escribir texto o JSON sin que eventos y render consulten elementos directamente.
    - Limpiar resultados técnicos del módulo Telegram.

  Se conecta con:
    - modulos/telegram/ui/render/tl-render-result.js
    - modulos/telegram/ui/render/tl-render-error.js
    - modulos/telegram/ui/render/tl-render-diagnostic.js
    - modulos/telegram/ui/events/*
*/

(function initTelegramDomResult(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const ui = telegram.UI = telegram.UI || {};
  const dom = ui.Dom = ui.Dom || {};

  const IDS = Object.freeze({
    resultBox: "tlResultBox",
    jsonBox: "tlJsonBox",
    errorBox: "tlErrorBox",
    diagnosticBox: "tlDiagnosticBox"
  });

  function byId(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function getResultElements() {
    return {
      resultBox: byId(IDS.resultBox),
      jsonBox: byId(IDS.jsonBox),
      errorBox: byId(IDS.errorBox),
      diagnosticBox: byId(IDS.diagnosticBox)
    };
  }

  function stringify(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  function writeText(key, text) {
    const elements = getResultElements();
    const element = elements[key];

    if (!element) {
      return false;
    }

    element.textContent = text === null || text === undefined ? "" : String(text);
    return true;
  }

  function writeJson(key, value) {
    return writeText(key, stringify(value));
  }

  function showError(message) {
    const elements = getResultElements();

    if (!elements.errorBox) {
      return false;
    }

    elements.errorBox.textContent = message || "";
    elements.errorBox.hidden = !message;
    return true;
  }

  function clearResults() {
    writeText("resultBox", "");
    writeText("jsonBox", "");
    writeText("diagnosticBox", "");
    showError("");
  }

  function appendLog(text) {
    const elements = getResultElements();

    if (!elements.resultBox) {
      return false;
    }

    const current = elements.resultBox.textContent || "";
    const line = text === null || text === undefined ? "" : String(text);
    elements.resultBox.textContent = current ? `${current}\n${line}` : line;
    return true;
  }

  dom.Result = Object.freeze({
    IDS,
    getResultElements,
    writeText,
    writeJson,
    showError,
    clearResults,
    appendLog,
    stringify
  });
})(window);
