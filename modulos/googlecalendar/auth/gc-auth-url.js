/*
  Nombre completo: gc-auth-url.js
  Ruta: modulos/googlecalendar/auth/gc-auth-url.js

  Función:
    - Construir URLs de autorización Google Calendar sin usar popup.
    - Centralizar scopes, redirectUri, estado de seguridad y parámetros OAuth.
    - No abrir ventanas ni guardar datos: solo prepara URL y metadatos.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/config/gc-google-config.js
    - modulos/googlecalendar/utils/gc-normalize.js
*/

(function initGoogleCalendarAuthUrl(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const auth = googleCalendar.Auth = googleCalendar.Auth || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getGoogleRuntimeConfig() {
    const googleConfig = googleCalendar.GoogleConfig || {};

    if (typeof googleConfig.getGoogleRuntimeConfig === "function") {
      return googleConfig.getGoogleRuntimeConfig();
    }

    return {
      oauthBaseUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      defaultCalendarId: "primary",
      defaultCredentialType: "desktop",
      scopes: ["https://www.googleapis.com/auth/calendar.events"]
    };
  }

  function asText(value) {
    const normalize = googleCalendar.Utils && googleCalendar.Utils.Normalize ? googleCalendar.Utils.Normalize : {};

    if (typeof normalize.asText === "function") {
      return normalize.asText(value);
    }

    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function generateState(prefix) {
    const safePrefix = asText(prefix) || "gc";
    const randomPart = Math.random().toString(36).slice(2, 12);
    const timePart = Date.now().toString(36);

    return `${safePrefix}-${timePart}-${randomPart}`;
  }

  function normalizeScopes(scopes) {
    const runtime = getGoogleRuntimeConfig();
    const list = Array.isArray(scopes) && scopes.length ? scopes : runtime.scopes;

    return list
      .map(function mapScope(scope) { return asText(scope); })
      .filter(Boolean)
      .filter(function uniqueScope(scope, index, array) { return array.indexOf(scope) === index; });
  }

  function buildAuthorizationParams(input) {
    const runtime = getGoogleRuntimeConfig();
    const data = input && typeof input === "object" ? input : {};
    const clientId = asText(data.clientId || data.clientIdDesktop || data.clientIdWeb);
    const redirectUri = asText(data.redirectUri || data.redirectUriDesktop || data.redirectUriWeb);
    const scopes = normalizeScopes(data.scopes);
    const state = asText(data.state) || generateState("gc-auth");

    return {
      ok: Boolean(clientId && redirectUri && scopes.length),
      params: {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: data.prompt || "consent",
        include_granted_scopes: "true",
        state
      },
      meta: {
        state,
        scopes,
        oauthBaseUrl: runtime.oauthBaseUrl,
        credentialType: data.activeCredentialType || runtime.defaultCredentialType,
        calendarId: data.calendarId || runtime.defaultCalendarId
      },
      missing: {
        clientId: !clientId,
        redirectUri: !redirectUri,
        scopes: scopes.length === 0
      }
    };
  }

  function buildAuthorizationUrl(input) {
    const runtime = getGoogleRuntimeConfig();
    const authParams = buildAuthorizationParams(input);
    const url = new URL(runtime.oauthBaseUrl || "https://accounts.google.com/o/oauth2/v2/auth");

    Object.keys(authParams.params).forEach(function appendParam(key) {
      const value = authParams.params[key];

      if (value !== undefined && value !== null && String(value).length > 0) {
        url.searchParams.set(key, value);
      }
    });

    return {
      ok: authParams.ok,
      url: authParams.ok ? url.toString() : "",
      params: authParams.params,
      meta: authParams.meta,
      missing: authParams.missing,
      checkedAt: new Date().toISOString()
    };
  }

  function createAuthResult(payload) {
    const config = getConfig();
    const createResult = typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult
      : function fallbackCreateResult(data) {
          return {
            ok: Boolean(data.ok),
            status: data.status || (data.ok ? "ready" : "error"),
            action: data.action || "startAuth",
            source: data.source || "google-calendar-auth",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/auth/gc-auth-url.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
    const data = payload && typeof payload === "object" ? payload : {};

    return createResult({
      ok: Boolean(data.ok),
      status: data.status || (data.ok ? (config.status ? config.status.AUTH_REQUIRED : "authRequired") : (config.status ? config.status.ERROR : "error")),
      action: config.action ? config.action.START_AUTH : "startAuth",
      source: config.source ? config.source.AUTH : "google-calendar-auth",
      file: "modulos/googlecalendar/auth/gc-auth-url.js",
      message: data.message || "URL de autorización Google Calendar preparada.",
      error: data.error || null,
      data: data.data || null,
      checkedAt: data.checkedAt || new Date().toISOString()
    });
  }

  auth.generateState = generateState;
  auth.normalizeScopes = normalizeScopes;
  auth.buildAuthorizationParams = buildAuthorizationParams;
  auth.buildAuthorizationUrl = buildAuthorizationUrl;
  auth.createAuthResult = createAuthResult;
})(window);
