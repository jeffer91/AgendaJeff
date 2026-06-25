/*
  Nombre completo: tl-dom-result.js
  Ruta: modulos/telegram/ui/dom/tl-dom-result.js

  Función:
    - Centralizar cajas de resultado, JSON, errores y diagnóstico.
    - Escribir texto o JSON sin que eventos y render consulten elementos directamente.
    - Limpiar resultados técnicos del módulo Telegram.
    - Ocultar datos sensibles como botToken y chatId antes de pintar JSON técnico.

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

  const SENSITIVE_KEYS = Object.freeze([
    "botToken",
    "token",
    "accessToken",
    "refreshToken",
    "clientSecret",
    "secret",
    "password"
  ]);

  const PRIVATE_KEYS = Object.freeze([
    "chatId"
  ]);

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

  function maskText(value, visibleEnd) {
    const text = value === null || value === undefined ? "" : String(value);

    if (!text) {
      return "";
    }

    if (telegram.Utils && telegram.Utils.Mask && typeof telegram.Utils.Mask.maskText === "function") {
      return telegram.Utils.Mask.maskText(text, {
        visibleStart: 0,
        visibleEnd: visibleEnd || 4,
        maskChar: "*"
      });
    }

    if (text.length <= (visibleEnd || 4)) {
      return "*".repeat(text.length);
    }

    return "*".repeat(Math.max(4, text.length - (visibleEnd || 4))) + text.slice(-(visibleEnd || 4));
  }

  function shouldMaskKey(key) {
    return SENSITIVE_KEYS.includes(key);
  }

  function shouldPrivateMaskKey(key) {
    return PRIVATE_KEYS.includes(key);
  }

  function sanitizeForDisplay(value, seen) {
    const visited = seen || new WeakSet();

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== "object") {
      return value;
    }

    if (visited.has(value)) {
      return "[circular]";
    }

    visited.add(value);

    if (Array.isArray(value)) {
      return value.map(function mapItem(item) {
        return sanitizeForDisplay(item, visited);
      });
    }

    const clean = {};

    Object.keys(value).forEach(function eachKey(key) {
      const item = value[key];

      if (shouldMaskKey(key)) {
        clean[key] = item ? maskText(item, 4) : "";
        return;
      }

      if (shouldPrivateMaskKey(key)) {
        clean[key] = item ? maskText(item, 4) : "";
        return;
      }

      clean[key] = sanitizeForDisplay(item, visited);
    });

    return clean;
  }

  function stringify(value) {
    try {
      return JSON.stringify(sanitizeForDisplay(value), null, 2);
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
    stringify,
    sanitizeForDisplay
  });
})(window);
