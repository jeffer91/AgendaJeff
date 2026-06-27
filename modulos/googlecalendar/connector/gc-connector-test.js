/*
  Nombre completo: gc-connector-test.js
  Ruta: modulos/googlecalendar/connector/gc-connector-test.js

  Función:
    - Exponer prueba pública de Google Calendar para otros módulos.
    - Delegar el diagnóstico/prueba a la capa Connection sin mezclar lógica.

  Se conecta con:
    - modulos/googlecalendar/connection/gc-connection-test.js
    - modulos/googlecalendar/diagnostic/gc-diagnostic-report.js
*/

(function initGoogleCalendarConnectorTest(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const connector = googleCalendar.Connector = googleCalendar.Connector || {};
  const publicConnector = global.AgendaJeffGoogleCalendar = global.AgendaJeffGoogleCalendar || {};

  let lastTestResult = null;

  function createResult(payload) {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  async function test(options) {
    const connection = googleCalendar.Connection || {};

    if (!connection.testConnection) {
      lastTestResult = createResult({
        ok: false,
        status: "error",
        action: "testGoogleCalendar",
        source: "connector",
        file: "modulos/googlecalendar/connector/gc-connector-test.js",
        message: "No está disponible connection.testConnection.",
        error: { message: "Falta gc-connection-test.js", file: "modulos/googlecalendar/connection/gc-connection-test.js" }
      });
      return lastTestResult;
    }

    lastTestResult = await connection.testConnection(options || {});
    return lastTestResult;
  }

  async function diagnostic(options) {
    const diagnosticLayer = googleCalendar.Diagnostic || {};

    if (!diagnosticLayer.runDiagnosticReport) {
      return test(options);
    }

    lastTestResult = await diagnosticLayer.runDiagnosticReport(options || {});
    return lastTestResult;
  }

  function getLastTestResult() {
    return lastTestResult;
  }

  connector.test = test;
  connector.diagnostic = diagnostic;
  connector.getLastTestResult = getLastTestResult;

  publicConnector.test = test;
  publicConnector.diagnostic = diagnostic;
  publicConnector.getLastTestResult = getLastTestResult;
})(window);
