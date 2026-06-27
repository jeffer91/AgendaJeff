/*
  Nombre completo: gc-diagnostic-firebase.js
  Ruta: modulos/googlecalendar/diagnostic/gc-diagnostic-firebase.js

  Función:
    - Diagnosticar Firebase para el módulo Google Calendar.
    - Ejecutar prueba Firebase cuando la capa esté disponible.

  Se conecta con:
    - modulos/googlecalendar/firebase/gc-firebase-test.js
*/

(function initGoogleCalendarDiagnosticFirebase(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const diagnostic = googleCalendar.Diagnostic = googleCalendar.Diagnostic || {};

  function createResult(payload) {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  async function diagnoseFirebase() {
    const firebase = googleCalendar.Firebase || {};

    if (!firebase.testFirebaseConnection) {
      return createResult({
        ok: false,
        status: "error",
        action: "diagnosticFirebase",
        source: "diagnostic",
        file: "modulos/googlecalendar/diagnostic/gc-diagnostic-firebase.js",
        message: "No está disponible testFirebaseConnection.",
        error: { message: "Falta gc-firebase-test.js", file: "modulos/googlecalendar/firebase/gc-firebase-test.js" }
      });
    }

    const result = await firebase.testFirebaseConnection();

    return createResult({
      ok: Boolean(result && result.ok),
      status: result && result.status ? result.status : "partial",
      action: "diagnosticFirebase",
      source: "diagnostic",
      file: "modulos/googlecalendar/diagnostic/gc-diagnostic-firebase.js",
      message: result && result.message ? result.message : "Diagnóstico Firebase ejecutado.",
      error: result && result.error ? result.error : null,
      data: { result }
    });
  }

  diagnostic.diagnoseFirebase = diagnoseFirebase;
})(window);
