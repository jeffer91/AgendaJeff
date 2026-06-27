/*
  Nombre completo: gc-connection-status.js
  Ruta: modulos/googlecalendar/connection/gc-connection-status.js

  Función:
    - Calcular el estado funcional de la conexión Google Calendar.
    - Evaluar credenciales, Firebase, autorización y API sin ejecutar acciones externas.
    - Entregar un resultado estándar para UI, diagnóstico y conector.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/utils/gc-normalize.js
    - modulos/googlecalendar/auth/gc-auth-refresh.js
*/

(function initGoogleCalendarConnectionStatus(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const connection = googleCalendar.Connection = googleCalendar.Connection || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function createResult(payload) {
    if (typeof googleCalendar.createResult === "function") {
      return googleCalendar.createResult(payload);
    }

    const data = payload && typeof payload === "object" ? payload : {};
    return {
      ok: Boolean(data.ok),
      status: data.status || (data.ok ? "ready" : "error"),
      action: data.action || "status",
      source: data.source || "connection",
      message: data.message || "",
      file: data.file || "modulos/googlecalendar/connection/gc-connection-status.js",
      data: data.data || null,
      error: data.error || null,
      checkedAt: data.checkedAt || new Date().toISOString()
    };
  }

  function normalizeConnection(data) {
    const normalize = googleCalendar.Utils && googleCalendar.Utils.Normalize ? googleCalendar.Utils.Normalize : {};

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(data || {}, { source: "connection" });
    }

    return data && typeof data === "object" ? data : {};
  }

  function hasAuthData() {
    const auth = googleCalendar.Auth || {};

    if (auth.readAuthData && typeof auth.readAuthData === "function") {
      const result = auth.readAuthData();
      return Boolean(result && result.ok && result.authData && result.authData.accessToken);
    }

    return false;
  }

  function calculateConnectionStatus(input, options) {
    const config = getConfig();
    const opts = options && typeof options === "object" ? options : {};
    const data = normalizeConnection(input);
    const hasCalendarId = Boolean(data.calendarId || data.calendarIdMasked);
    const hasClientId = Boolean(data.clientIdDesktop || data.clientIdWeb || data.clientIdDesktopMasked || data.clientIdWebMasked);
    const firebaseOk = Boolean(data.firebaseConnectionOk || data.firebaseConexionOk);
    const authOk = Boolean(opts.authOk || data.authOk || hasAuthData());
    const apiOk = Boolean(opts.apiOk || data.googleConnectionOk || data.calendarConnectionOk);
    const configured = Boolean(data.configured || data.configurado || (hasCalendarId && hasClientId));
    const ready = Boolean(configured && authOk && apiOk);
    const partial = Boolean(configured || firebaseOk || authOk || apiOk);
    const status = ready
      ? (config.status ? config.status.READY : "ready")
      : partial
        ? (config.status ? config.status.PARTIAL : "partial")
        : (config.status ? config.status.IDLE : "idle");

    return createResult({
      ok: ready,
      status,
      action: opts.action || "status",
      source: opts.source || "connection",
      file: "modulos/googlecalendar/connection/gc-connection-status.js",
      message: ready
        ? "Google Calendar está listo para crear eventos."
        : partial
          ? "Google Calendar está parcialmente configurado."
          : "Google Calendar todavía no está configurado.",
      data: {
        connection: {
          ...data,
          configured,
          configurado: configured,
          status,
          estado: status,
          authOk,
          googleConnectionOk: apiOk,
          calendarConnectionOk: apiOk
        },
        checks: {
          hasCalendarId,
          hasClientId,
          firebaseOk,
          authOk,
          apiOk,
          configured,
          ready
        }
      }
    });
  }

  connection.calculateConnectionStatus = calculateConnectionStatus;
})(window);
