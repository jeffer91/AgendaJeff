/*
  Nombre completo: gc-diagnostic-report.js
  Ruta: modulos/googlecalendar/diagnostic/gc-diagnostic-report.js

  Función:
    - Ejecutar diagnóstico completo de Google Calendar.
    - Unir estado, localStorage, Firebase y Google API en un solo resultado.
    - Servir de base para UI, soporte técnico y conector.

  Se conecta con:
    - modulos/googlecalendar/diagnostic/gc-diagnostic-state.js
    - modulos/googlecalendar/diagnostic/gc-diagnostic-local.js
    - modulos/googlecalendar/diagnostic/gc-diagnostic-firebase.js
    - modulos/googlecalendar/diagnostic/gc-diagnostic-google.js
*/

(function initGoogleCalendarDiagnosticReport(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const diagnostic = googleCalendar.Diagnostic = googleCalendar.Diagnostic || {};

  function createResult(payload) {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  async function runDiagnosticReport(options) {
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/diagnostic/gc-diagnostic-report.js";
    const stateResult = diagnostic.diagnoseModuleState ? diagnostic.diagnoseModuleState() : null;
    const localResult = diagnostic.diagnoseLocalStorage ? diagnostic.diagnoseLocalStorage() : null;
    const firebaseResult = opts.skipFirebase === true
      ? null
      : diagnostic.diagnoseFirebase ? await diagnostic.diagnoseFirebase() : null;
    const googleResult = opts.skipGoogle === true
      ? null
      : diagnostic.diagnoseGoogle ? await diagnostic.diagnoseGoogle(opts) : null;
    const checks = {
      stateOk: Boolean(stateResult && stateResult.ok),
      localOk: Boolean(localResult && localResult.ok),
      firebaseOk: opts.skipFirebase === true || Boolean(firebaseResult && firebaseResult.ok),
      googleOk: opts.skipGoogle === true || Boolean(googleResult && googleResult.ok)
    };
    const ok = checks.stateOk && (checks.localOk || checks.firebaseOk) && checks.firebaseOk && checks.googleOk;

    return createResult({
      ok,
      status: ok ? "ready" : "partial",
      action: "diagnostic",
      source: "diagnostic",
      file,
      message: ok
        ? "Diagnóstico Google Calendar completo sin errores críticos."
        : "Diagnóstico Google Calendar con pendientes o errores parciales.",
      error: ok ? null : { message: "Revisa los resultados por capa.", file },
      data: { checks, stateResult, localResult, firebaseResult, googleResult }
    });
  }

  diagnostic.runDiagnosticReport = runDiagnosticReport;
})(window);
