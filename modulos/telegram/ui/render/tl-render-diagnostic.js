/*
  Nombre completo: tl-render-diagnostic.js
  Ruta: modulos/telegram/ui/render/tl-render-diagnostic.js

  Función:
    - Pintar el diagnóstico completo del módulo Telegram.
    - Mostrar resumen por estado, localStorage, Firebase y Telegram API.
    - Mostrar archivo probable del error cuando exista.
    - No ejecutar diagnóstico; solo representa el resultado recibido.

  Se conecta con:
    - modulos/telegram/ui/dom/tl-dom-result.js
    - modulos/telegram/ui/dom/tl-dom-status.js
    - modulos/telegram/ui/render/tl-render-status.js
    - modulos/telegram/ui/render/tl-render-error.js
    - modulos/telegram/diagnostic/tl-diagnostic-report.js
*/

(function initTelegramRenderDiagnostic(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const ui = telegram.UI = telegram.UI || {};
  const render = ui.Render = ui.Render || {};

  function getDomResult() {
    return ui.Dom && ui.Dom.Result ? ui.Dom.Result : null;
  }

  function getReport(result) {
    if (!result || !result.data) {
      return null;
    }

    if (result.data.report) {
      return result.data.report;
    }

    if (result.data.diagnosticResult && result.data.diagnosticResult.data && result.data.diagnosticResult.data.report) {
      return result.data.diagnosticResult.data.report;
    }

    return null;
  }

  function buildSummaryLines(result) {
    const report = getReport(result);
    const lines = [];

    lines.push(result && result.ok ? "Diagnóstico Telegram: OK" : "Diagnóstico Telegram: REVISAR");
    lines.push(result && result.message ? result.message : "Sin mensaje principal.");

    if (!report) {
      return lines;
    }

    if (report.probableErrorFile) {
      lines.push(`Archivo probable: ${report.probableErrorFile}`);
    }

    if (Array.isArray(report.summaries)) {
      lines.push("");
      lines.push("Resumen por capa:");

      report.summaries.forEach(function eachSummary(item) {
        const icon = item.ok ? "OK" : "ERROR";
        lines.push(`- ${item.name}: ${icon} · ${item.message}`);
      });
    }

    return lines;
  }

  function renderDiagnostic(result) {
    const domResult = getDomResult();

    if (!domResult) {
      return false;
    }

    const lines = buildSummaryLines(result);
    const report = getReport(result);

    domResult.writeText("diagnosticBox", lines.join("\n"));
    domResult.writeText("resultBox", lines.join("\n"));
    domResult.writeJson("jsonBox", result || null);

    if (result && result.ok) {
      domResult.showError("");
    } else if (render.renderError) {
      render.renderError(result);
    } else if (report && report.probableErrorFile) {
      domResult.showError(`Revisar: ${report.probableErrorFile}`);
    }

    if (render.renderConnectionStatus) {
      render.renderConnectionStatus({
        ok: Boolean(result && result.ok),
        status: result && result.ok ? "ready" : "error",
        message: result && result.message ? result.message : "Diagnóstico ejecutado.",
        source: "diagnostic",
        checkedAt: result && result.checkedAt ? result.checkedAt : new Date().toISOString()
      });
    }

    return true;
  }

  render.renderDiagnostic = renderDiagnostic;
})(window);
