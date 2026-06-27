/*
  Nombre completo: gc-diagnostic-google.js
  Ruta: modulos/googlecalendar/diagnostic/gc-diagnostic-google.js

  Función:
    - Diagnosticar autorización y API de Google Calendar.
    - Ejecutar prueba de API sin crear eventos salvo que se indique explícitamente.

  Se conecta con:
    - modulos/googlecalendar/api/gc-api-test.js
*/

(function initGoogleCalendarDiagnosticGoogle(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const diagnostic = googleCalendar.Diagnostic = googleCalendar.Diagnostic || {};

  function createResult(payload) {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  async function diagnoseGoogle(options) {
    const api = googleCalendar.Api || {};
    const opts = options && typeof options === "object" ? options : {};

    if (!api.testGoogleCalendarApi) {
      return createResult({
        ok: false,
        status: "error",
        action: "diagnosticGoogle",
        source: "diagnostic",
        file: "modulos/googlecalendar/diagnostic/gc-diagnostic-google.js",
        message: "No está disponible testGoogleCalendarApi.",
        error: { message: "Falta gc-api-test.js", file: "modulos/googlecalendar/api/gc-api-test.js" }
      });
    }

    const result = await api.testGoogleCalendarApi({
      calendarId: opts.calendarId || "primary",
      auth: opts.auth || {},
      readEvents: opts.readEvents !== false,
      createTestEvent: opts.createTestEvent === true
    });

    return createResult({
      ok: Boolean(result && result.ok),
      status: result && result.status ? result.status : "partial",
      action: "diagnosticGoogle",
      source: "diagnostic",
      file: "modulos/googlecalendar/diagnostic/gc-diagnostic-google.js",
      message: result && result.message ? result.message : "Diagnóstico Google Calendar ejecutado.",
      error: result && result.error ? result.error : null,
      data: { result }
    });
  }

  diagnostic.diagnoseGoogle = diagnoseGoogle;
})(window);
