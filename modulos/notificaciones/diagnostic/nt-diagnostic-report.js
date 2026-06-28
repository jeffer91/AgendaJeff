/*
  Nombre completo: nt-diagnostic-report.js
  Ruta: modulos/notificaciones/diagnostic/nt-diagnostic-report.js

  Función:
    - Ejecutar diagnóstico completo del módulo Notificaciones.
*/

(function initNotificacionesDiagnosticReport(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const diagnostic = nt.Diagnostic = nt.Diagnostic || {};

  function createResult(payload) {
    return typeof nt.createResult === "function"
      ? nt.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  async function runDiagnosticReport() {
    const config = nt.CONFIG || {};
    const layers = diagnostic.checkLayers ? diagnostic.checkLayers() : { ok: false, message: "checkLayers no disponible." };
    const bridgeStatus = nt.Desktop && nt.Desktop.getBridgeStatus ? nt.Desktop.getBridgeStatus() : { ok: false, message: "getBridgeStatus no disponible." };
    const desktopStatus = diagnostic.checkDesktop ? await diagnostic.checkDesktop() : { ok: false, message: "checkDesktop no disponible." };
    const ok = Boolean(layers.ok && bridgeStatus.ok && desktopStatus.ok);

    return createResult({
      ok,
      status: ok ? (config.status ? config.status.READY : "ready") : (config.status ? config.status.PARTIAL : "partial"),
      action: config.action ? config.action.DIAGNOSTIC : "diagnostic",
      source: "diagnostic",
      file: "modulos/notificaciones/diagnostic/nt-diagnostic-report.js",
      message: ok
        ? "Módulo Notificaciones listo para pruebas."
        : "Módulo Notificaciones tiene elementos pendientes; revisa JSON técnico.",
      data: { layers, bridgeStatus, desktopStatus }
    });
  }

  diagnostic.runDiagnosticReport = runDiagnosticReport;
})(window);