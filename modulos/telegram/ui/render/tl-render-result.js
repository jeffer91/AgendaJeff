/*
  Nombre completo: tl-render-result.js
  Ruta: modulos/telegram/ui/render/tl-render-result.js

  Función:
    - Pintar resultados simples y JSON técnico del módulo Telegram.
    - Mostrar mensajes de éxito, información o resultados completos.
    - No ejecutar acciones; solo representa datos recibidos.

  Se conecta con:
    - modulos/telegram/ui/dom/tl-dom-result.js
    - modulos/telegram/ui/render/tl-render-error.js
    - modulos/telegram/ui/events/*
*/

(function initTelegramRenderResult(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const ui = telegram.UI = telegram.UI || {};
  const render = ui.Render = ui.Render || {};

  function getDomResult() {
    return ui.Dom && ui.Dom.Result ? ui.Dom.Result : null;
  }

  function getMessage(result, fallback) {
    if (result && result.message) {
      return result.message;
    }

    return fallback || "Resultado disponible.";
  }

  function renderResult(result, options) {
    const domResult = getDomResult();
    const opts = options && typeof options === "object" ? options : {};

    if (!domResult) {
      return false;
    }

    const statusLabel = result && result.ok ? "OK" : "REVISAR";
    const message = getMessage(result, opts.fallbackMessage);
    const checkedAt = result && result.checkedAt ? result.checkedAt : new Date().toISOString();

    domResult.writeText("resultBox", `[${statusLabel}] ${message}\nFecha: ${checkedAt}`);

    if (opts.skipJson !== true) {
      domResult.writeJson("jsonBox", result || null);
    }

    if (result && result.ok) {
      domResult.showError("");
    }

    return true;
  }

  function renderInfo(message, data) {
    const domResult = getDomResult();

    if (!domResult) {
      return false;
    }

    domResult.writeText("resultBox", message || "Información disponible.");
    domResult.writeJson("jsonBox", data || { message });
    domResult.showError("");
    return true;
  }

  function renderSuccess(message, data) {
    return renderInfo(message || "Operación realizada correctamente.", {
      ok: true,
      message,
      data: data || null,
      checkedAt: new Date().toISOString()
    });
  }

  function clearResults() {
    const domResult = getDomResult();

    if (!domResult) {
      return false;
    }

    domResult.clearResults();
    return true;
  }

  render.renderResult = renderResult;
  render.renderInfo = renderInfo;
  render.renderSuccess = renderSuccess;
  render.clearResults = clearResults;
})(window);
