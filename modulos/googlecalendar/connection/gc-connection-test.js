/*
  Nombre completo: gc-connection-test.js
  Ruta: modulos/googlecalendar/connection/gc-connection-test.js

  Función:
    - Probar la conexión Google Calendar completa.
    - Leer conexión, probar Firebase, autorización y API Calendar.
    - Crear evento de prueba solo si se solicita explícitamente.

  Se conecta con:
    - modulos/googlecalendar/connection/gc-connection-read.js
    - modulos/googlecalendar/firebase/gc-firebase-test.js
    - modulos/googlecalendar/api/gc-api-test.js
*/

(function initGoogleCalendarConnectionTest(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const connection = googleCalendar.Connection = googleCalendar.Connection || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function createResult(payload) {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  async function testConnection(options) {
    const config = getConfig();
    const opts = options && typeof options === "object" ? options : {};
    const firebase = googleCalendar.Firebase || {};
    const api = googleCalendar.Api || {};
    const file = "modulos/googlecalendar/connection/gc-connection-test.js";
    const checks = {
      readOk: false,
      firebaseOk: false,
      apiOk: false,
      testEventCreated: false
    };

    const readResult = connection.readConnection
      ? await connection.readConnection({ preferLocal: opts.preferLocal === true })
      : null;
    checks.readOk = Boolean(readResult && readResult.ok);

    const firebaseResult = firebase.testFirebaseConnection && opts.skipFirebase !== true
      ? await firebase.testFirebaseConnection()
      : null;
    checks.firebaseOk = Boolean(firebaseResult && firebaseResult.ok);

    const apiResult = api.testGoogleCalendarApi && opts.skipGoogle !== true
      ? await api.testGoogleCalendarApi({
          calendarId: opts.calendarId || (readResult && readResult.data && readResult.data.connection ? readResult.data.connection.calendarId : "primary"),
          auth: opts.auth || {},
          readEvents: opts.readEvents !== false,
          createTestEvent: opts.createTestEvent === true
        })
      : null;
    checks.apiOk = Boolean(apiResult && apiResult.ok);
    checks.testEventCreated = Boolean(apiResult && apiResult.data && apiResult.data.checks && apiResult.data.checks.testEventCreated);

    const ok = checks.readOk && (opts.skipFirebase === true || checks.firebaseOk) && (opts.skipGoogle === true || checks.apiOk);
    const statusResult = connection.calculateConnectionStatus && readResult && readResult.data
      ? connection.calculateConnectionStatus(readResult.data.connection, {
          action: "testGoogleCalendar",
          source: "connection",
          apiOk: checks.apiOk
        })
      : null;

    return createResult({
      ok,
      status: ok ? (config.status ? config.status.READY : "ready") : (config.status ? config.status.PARTIAL : "partial"),
      action: config.action ? config.action.TEST_GOOGLE : "testGoogleCalendar",
      source: "connection",
      file,
      message: ok
        ? "Conexión Google Calendar probada correctamente."
        : "Google Calendar respondió parcialmente; revisa diagnóstico técnico.",
      error: ok ? null : { message: "Una o más pruebas de conexión no pasaron.", file },
      data: { checks, readResult, firebaseResult, apiResult, statusResult }
    });
  }

  connection.testConnection = testConnection;
})(window);
