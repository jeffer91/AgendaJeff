/*
  Nombre completo: gc-api-test.js
  Ruta: modulos/googlecalendar/api/gc-api-test.js

  Función:
    - Ejecutar prueba funcional de Google Calendar API.
    - Verificar autorización, lectura del calendario principal y lectura opcional de eventos.
    - Crear evento de prueba solo cuando se solicite explícitamente.

  Se conecta con:
    - modulos/googlecalendar/api/gc-api-client.js
    - modulos/googlecalendar/api/gc-api-calendars.js
    - modulos/googlecalendar/api/gc-api-events-read.js
    - modulos/googlecalendar/api/gc-api-events-create.js
*/

(function initGoogleCalendarApiTest(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const api = googleCalendar.Api = googleCalendar.Api || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getCreateResult() {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult
      : function fallbackCreateResult(payload) {
          const data = payload && typeof payload === "object" ? payload : {};
          return {
            ok: Boolean(data.ok),
            status: data.status || (data.ok ? "ready" : "error"),
            action: data.action || "testGoogle",
            source: data.source || "google-calendar-api",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/api/gc-api-test.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  async function testGoogleCalendarApi(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/api/gc-api-test.js";
    const calendarId = opts.calendarId || (config.google ? config.google.defaultCalendarId : "primary");
    const checks = {
      clientReady: Boolean(api.Client && api.Client.requestJson),
      authReady: false,
      calendarReadOk: false,
      eventsReadOk: false,
      testEventCreated: false
    };

    if (!checks.clientReady) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.TEST_GOOGLE : "testGoogle",
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "No está disponible el cliente API de Google Calendar.",
        error: { message: "Falta Api.Client.requestJson.", file: "modulos/googlecalendar/api/gc-api-client.js" },
        data: { checks }
      });
    }

    const authResult = await api.Client.resolveAuth(opts.auth || {});
    checks.authReady = Boolean(authResult && authResult.ok);

    if (!checks.authReady) {
      return createResult({
        ok: false,
        status: config.status ? config.status.AUTH_REQUIRED : "authRequired",
        action: config.action ? config.action.TEST_GOOGLE : "testGoogle",
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "Google Calendar necesita autorización antes de probar la API.",
        error: authResult && authResult.error ? authResult.error : { message: "Autorización no disponible.", file },
        data: { checks, authResult }
      });
    }

    let calendarResult = null;
    let eventsResult = null;
    let createResultApi = null;

    if (api.getCalendar && typeof api.getCalendar === "function") {
      calendarResult = await api.getCalendar(calendarId, { auth: opts.auth || {} });
      checks.calendarReadOk = Boolean(calendarResult && calendarResult.ok);
    }

    if (opts.readEvents !== false && api.listEvents && typeof api.listEvents === "function") {
      const now = new Date();
      const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      eventsResult = await api.listEvents({
        calendarId,
        timeMin: opts.timeMin || now.toISOString(),
        timeMax: opts.timeMax || later.toISOString(),
        maxResults: opts.maxResults || 10,
        auth: opts.auth || {}
      });
      checks.eventsReadOk = Boolean(eventsResult && eventsResult.ok);
    }

    if (opts.createTestEvent === true && api.createTestEvent && typeof api.createTestEvent === "function") {
      createResultApi = await api.createTestEvent({
        calendarId,
        auth: opts.auth || {},
        title: opts.testTitle || "Prueba AgendaJeff · Google Calendar"
      });
      checks.testEventCreated = Boolean(createResultApi && createResultApi.ok);
    }

    const ok = checks.authReady && checks.calendarReadOk && (opts.readEvents === false || checks.eventsReadOk) && (opts.createTestEvent !== true || checks.testEventCreated);

    return createResult({
      ok,
      status: ok ? (config.status ? config.status.READY : "ready") : (config.status ? config.status.PARTIAL : "partial"),
      action: config.action ? config.action.TEST_GOOGLE : "testGoogle",
      source: config.source ? config.source.GOOGLE : "google-calendar-api",
      file,
      message: ok
        ? "Google Calendar API funciona correctamente."
        : "Google Calendar API respondió parcialmente; revisa JSON técnico.",
      error: ok ? null : { message: "Una o más pruebas de Google Calendar API no pasaron.", file },
      data: {
        checks,
        authResult,
        calendarResult,
        eventsResult,
        createResult: createResultApi
      }
    });
  }

  api.testGoogleCalendarApi = testGoogleCalendarApi;
})(window);
