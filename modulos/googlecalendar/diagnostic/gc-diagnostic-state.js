/*
  Nombre completo: gc-diagnostic-state.js
  Ruta: modulos/googlecalendar/diagnostic/gc-diagnostic-state.js

  Función:
    - Diagnosticar si las capas base del módulo Google Calendar están cargadas.
    - Verificar configuración, utils, storage, Firebase, auth, API y connection.
    - Entregar un mapa técnico simple para reporte completo.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - todas las capas del módulo Google Calendar
*/

(function initGoogleCalendarDiagnosticState(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const diagnostic = googleCalendar.Diagnostic = googleCalendar.Diagnostic || {};

  function createResult(payload) {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  function exists(path, value) {
    return { path, ok: Boolean(value) };
  }

  function diagnoseModuleState() {
    const checks = {
      root: exists("AgendaJeffModules.GoogleCalendar", googleCalendar),
      config: exists("GoogleCalendar.CONFIG", googleCalendar.CONFIG),
      utils: exists("GoogleCalendar.Utils", googleCalendar.Utils),
      storage: exists("GoogleCalendar.Storage", googleCalendar.Storage),
      firebase: exists("GoogleCalendar.Firebase", googleCalendar.Firebase),
      auth: exists("GoogleCalendar.Auth", googleCalendar.Auth),
      api: exists("GoogleCalendar.Api", googleCalendar.Api),
      connection: exists("GoogleCalendar.Connection", googleCalendar.Connection),
      diagnostic: exists("GoogleCalendar.Diagnostic", googleCalendar.Diagnostic),
      createResult: exists("GoogleCalendar.createResult", googleCalendar.createResult)
    };
    const ok = Object.keys(checks).every(function everyCheck(key) { return checks[key].ok; });

    return createResult({
      ok,
      status: ok ? "ready" : "partial",
      action: "diagnosticState",
      source: "diagnostic",
      file: "modulos/googlecalendar/diagnostic/gc-diagnostic-state.js",
      message: ok ? "Capas Google Calendar cargadas." : "Algunas capas Google Calendar faltan.",
      data: { checks }
    });
  }

  diagnostic.diagnoseModuleState = diagnoseModuleState;
})(window);
