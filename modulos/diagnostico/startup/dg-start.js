/* dg-start.js · Inicio Diagnóstico */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const diagnostico = root.Diagnostico = root.Diagnostico || {};

  const state = diagnostico.state = diagnostico.state || { started: false, startedAt: "", lastReport: null };

  async function runDiagnostic() {
    diagnostico.dom.status("Revisando", "Ejecutando diagnostico general.", "Proceso", "is-warning");
    const report = await diagnostico.collector.collect();
    state.lastReport = report;
    diagnostico.render.renderReport(report);
    return report;
  }

  async function createBackup() {
    const bridge = diagnostico.dom.bridge();
    if (!bridge || typeof bridge.createLocalBackup !== "function") {
      diagnostico.dom.status("Sin respaldo", "El puente Electron no esta disponible.", "Revisar", "is-warning");
      return null;
    }
    const result = await bridge.createLocalBackup();
    diagnostico.dom.el("dgOutput").textContent = JSON.stringify(result, null, 2);
    diagnostico.dom.status(result && result.ok ? "Respaldo creado" : "Error de respaldo", result && result.message ? result.message : "Proceso finalizado.", result && result.ok ? "OK" : "Revisar", result && result.ok ? "is-ok" : "is-warning");
    return result;
  }

  async function copyJson() {
    const output = diagnostico.dom.el("dgOutput");
    const text = output ? output.textContent : "";
    try {
      if (navigator.clipboard && text) await navigator.clipboard.writeText(text);
      diagnostico.dom.status("JSON copiado", "El reporte fue copiado al portapapeles.", "OK", "is-ok");
    } catch (error) {
      diagnostico.dom.status("No copiado", "No se pudo copiar automaticamente.", "Revisar", "is-warning");
    }
  }

  function attach() {
    const run = diagnostico.dom.el("dgBtnRun");
    const copy = diagnostico.dom.el("dgBtnCopy");
    const backup = diagnostico.dom.el("dgBtnBackup");
    if (run) run.addEventListener("click", runDiagnostic);
    if (copy) copy.addEventListener("click", copyJson);
    if (backup) backup.addEventListener("click", createBackup);
  }

  function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();
    attach();
    runDiagnostic();
  }

  if (!global.document || global.document.readyState !== "loading") start();
  else global.document.addEventListener("DOMContentLoaded", start, { once: true });

  diagnostico.start = start;
  diagnostico.runDiagnostic = runDiagnostic;
  diagnostico.createBackup = createBackup;
})(window);
