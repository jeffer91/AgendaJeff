/*
  Nombre completo: gc-diagnostic-google.js
  Ruta: modulos/googlecalendar/diagnostic/gc-diagnostic-google.js

  Función:
    - Diagnosticar autorización y API de Google Calendar.
    - Leer conexión Firebase/local para entregar Client ID, secretos y redirect a Auth/API.
    - Ejecutar prueba de API sin crear eventos salvo que se indique explícitamente.

  Se conecta con:
    - modulos/googlecalendar/connection/gc-connection-read.js
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

  async function readConnectionForAuth(options) {
    const connection = googleCalendar.Connection || {};
    const opts = options && typeof options === "object" ? options : {};

    if (!connection.readConnection || opts.skipConnectionRead === true) {
      return { readResult: null, connectionData: {} };
    }

    const readResult = await connection.readConnection({ preferLocal: opts.preferLocal === true });
    const connectionData = readResult && readResult.data && readResult.data.connection
      ? readResult.data.connection
      : {};

    return { readResult, connectionData };
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

    const connectionAuth = await readConnectionForAuth(opts);
    const auth = {
      ...(opts.auth && typeof opts.auth === "object" ? opts.auth : {}),
      authInput: {
        ...connectionAuth.connectionData,
        ...(opts.authInput && typeof opts.authInput === "object" ? opts.authInput : {})
      },
      authOptions: opts.authOptions || {}
    };

    const result = await api.testGoogleCalendarApi({
      calendarId: opts.calendarId || connectionAuth.connectionData.calendarId || "primary",
      auth,
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
      data: { connectionReadResult: connectionAuth.readResult, result }
    });
  }

  diagnostic.readConnectionForAuth = readConnectionForAuth;
  diagnostic.diagnoseGoogle = diagnoseGoogle;
})(window);
