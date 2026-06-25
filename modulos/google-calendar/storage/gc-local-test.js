/*
  Nombre completo: gc-local-test.js
  Ruta: modulos/google-calendar/storage/gc-local-test.js

  Función:
    - Probar que localStorage funcione para Google Calendar.
    - Verificar escritura, lectura, parseo JSON y limpieza de clave temporal.
    - Generar resumen local sin tocar Firebase ni Google API.
    - Ayudar al diagnóstico del módulo Google Calendar.

  Se conecta con:
    - modulos/google-calendar/config/gc-config.js
    - modulos/google-calendar/storage/gc-local-read.js
    - modulos/google-calendar/storage/gc-local-save.js
    - modulos/google-calendar/storage/gc-local-clear.js
    - modulos/google-calendar/diagnostic/gc-diagnostic-local.js
*/

(function initGoogleCalendarLocalTest(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const storage = googleCalendar.Storage = googleCalendar.Storage || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getCreateResult() {
    if (typeof googleCalendar.createResult === "function") {
      return googleCalendar.createResult;
    }

    return function fallbackCreateResult(payload) {
      const data = payload && typeof payload === "object" ? payload : {};
      return {
        ok: Boolean(data.ok),
        status: data.status || (data.ok ? "ready" : "error"),
        action: data.action || "testLocal",
        source: data.source || "local",
        message: data.message || "",
        file: data.file || "modulos/google-calendar/storage/gc-local-test.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function hasLocalStorage() {
    try {
      return Boolean(global.localStorage);
    } catch (error) {
      return false;
    }
  }

  function testLocalStorage() {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.LOCAL_TEST : "modulos/google-calendar/storage/gc-local-test.js";
    const key = "agendaJeff.googleCalendar.localStorage.test";
    const payload = {
      module: "google-calendar",
      ok: true,
      checkedAt: new Date().toISOString()
    };

    if (!hasLocalStorage()) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.TEST_LOCAL : "testLocal",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "localStorage no está disponible para Google Calendar.",
        error: {
          message: "localStorage no disponible.",
          file
        },
        data: { key }
      });
    }

    try {
      global.localStorage.setItem(key, JSON.stringify(payload));
      const raw = global.localStorage.getItem(key);
      const parsed = JSON.parse(raw);
      global.localStorage.removeItem(key);

      const ok = Boolean(parsed && parsed.module === payload.module && parsed.ok === true);

      return createResult({
        ok,
        status: ok
          ? (config.status ? config.status.READY : "ready")
          : (config.status ? config.status.ERROR : "error"),
        action: config.action ? config.action.TEST_LOCAL : "testLocal",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: ok
          ? "localStorage funciona correctamente para Google Calendar."
          : "localStorage respondió, pero los datos no coinciden.",
        error: ok ? null : {
          message: "La prueba local no devolvió los mismos datos.",
          file
        },
        data: {
          key,
          payload,
          parsed
        }
      });
    } catch (error) {
      try {
        global.localStorage.removeItem(key);
      } catch (cleanupError) {
        // No bloquea el resultado principal.
      }

      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.TEST_LOCAL : "testLocal",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "Falló la prueba local de Google Calendar.",
        error: {
          message: error && error.message ? error.message : "Error desconocido probando localStorage.",
          file
        },
        data: { key }
      });
    }
  }

  function getLocalStorageSummary() {
    const config = getConfig();
    const keys = config.storage || {};

    if (!hasLocalStorage()) {
      return {
        ok: false,
        available: false,
        message: "localStorage no disponible."
      };
    }

    return {
      ok: true,
      available: true,
      keys: {
        main: keys.mainKey || "agendaJeff.googleCalendar.connection.v1",
        backup: keys.backupKey || "agendaJeff.googleCalendar.backup.v1",
        token: keys.tokenKey || "agendaJeff.googleCalendar.token.v1",
        diagnostic: keys.diagnosticKey || "agendaJeff.googleCalendar.diagnostic.v1",
        lastResult: keys.lastResultKey || "agendaJeff.googleCalendar.lastResult.v1"
      },
      exists: {
        main: Boolean(global.localStorage.getItem(keys.mainKey || "agendaJeff.googleCalendar.connection.v1")),
        backup: Boolean(global.localStorage.getItem(keys.backupKey || "agendaJeff.googleCalendar.backup.v1")),
        token: Boolean(global.localStorage.getItem(keys.tokenKey || "agendaJeff.googleCalendar.token.v1")),
        diagnostic: Boolean(global.localStorage.getItem(keys.diagnosticKey || "agendaJeff.googleCalendar.diagnostic.v1")),
        lastResult: Boolean(global.localStorage.getItem(keys.lastResultKey || "agendaJeff.googleCalendar.lastResult.v1"))
      },
      checkedAt: new Date().toISOString()
    };
  }

  storage.testLocalStorage = testLocalStorage;
  storage.getLocalStorageSummary = getLocalStorageSummary;
})(window);
