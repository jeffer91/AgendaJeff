/*
  Nombre completo: gc-auth-url.js
  Ruta: modulos/googlecalendar/auth/gc-auth-url.js

  Función:
    - Construir URLs de autorización Google Calendar sin usar popup.
    - Centralizar scopes, redirectUri, estado de seguridad y parámetros OAuth.
    - Usar la misma ruta local que sí responde en Electron.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/config/gc-google-config.js
    - modulos/googlecalendar/utils/gc-normalize.js
    - electron/oauth/gc-local-callback.js
*/

(function initGoogleCalendarAuthUrl(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const auth = googleCalendar.Auth = googleCalendar.Auth || {};
  const DEFAULT_DESKTOP_REDIRECT_URI = "http://127.0.0.1:53682/oauth/google/callback";

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getGoogleRuntimeConfig() {
    const googleConfig = googleCalendar.GoogleConfig || {};

    if (typeof googleConfig.getGoogleRuntimeConfig === "function") {
      const runtime = googleConfig.getGoogleRuntimeConfig();
      return {
        ...runtime,
        defaultDesktopRedirectUri: runtime.defaultDesktopRedirectUri || DEFAULT_DESKTOP_REDIRECT_URI
      };
    }

    return {
      oauthBaseUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      defaultCalendarId: "primary",
      defaultCredentialType: "desktop",
      defaultDesktopRedirectUri: DEFAULT_DESKTOP_REDIRECT_URI,
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

  function normalizeCredentialType(input) {
    const runtime = getGoogleRuntimeConfig();
    const data = input && typeof input === "object" ? input : {};
    const rawType = asText(data.activeCredentialType || data.credentialType || data.runtimeMode || runtime.defaultCredentialType);

    return rawType === "web" ? "web" : "desktop";
  }

  function pickClientId(input) {
    const data = input && typeof input === "object" ? input : {};
    const credentialType = normalizeCredentialType(data);

    if (credentialType === "web") {
      return asText(data.clientIdWeb || data.clientId || data.clientIdDesktop);
    }

    return asText(data.clientIdDesktop || data.clientId || data.clientIdWeb);
  }

  function pickRedirectUri(input) {
    const runtime = getGoogleRuntimeConfig();
    const data = input && typeof input === "object" ? input : {};
    const credentialType = normalizeCredentialType(data);

    if (credentialType === "web") {
      return asText(data.redirectUriWeb || data.redirectUri || data.redirectUriDesktop);
    }

    return asText(
      data.redirectUriDesktop ||
      data.redirectUri ||
      data.redirectUriWeb ||
      runtime.defaultDesktopRedirectUri ||
      DEFAULT_DESKTOP_REDIRECT_URI
    );
  }

  function buildMissingMap(clientId, redirectUri, scopes) {
    return {
      clientId: !clientId,
      redirectUri: !redirectUri,
      scopes: scopes.length === 0
    };
  }

  function buildMissingMessage(missing) {
    const parts = [];

    if (missing.clientId) parts.push("Client ID");
    if (missing.redirectUri) parts.push("Redirect URI");
    if (missing.scopes) parts.push("scopes");

    return parts.length ? `Faltan datos para OAuth: ${parts.join(", ")}.` : "Datos OAuth completos.";
  }

  function buildAuthorizationParams(input) {
    const runtime = getGoogleRuntimeConfig();
    const data = input && typeof input === "object" ? input : {};
    const credentialType = normalizeCredentialType(data);
    const clientId = pickClientId(data);
    const redirectUri = pickRedirectUri(data);
    const scopes = normalizeScopes(data.scopes);
    const state = asText(data.state) || generateState("gc-auth");
    const missing = buildMissingMap(clientId, redirectUri, scopes);
    const ok = Boolean(clientId && redirectUri && scopes.length);

    return {
      ok,
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
        credentialType,
        calendarId: data.calendarId || runtime.defaultCalendarId,
        defaultDesktopRedirectUri: runtime.defaultDesktopRedirectUri || DEFAULT_DESKTOP_REDIRECT_URI,
        missingMessage: buildMissingMessage(missing)
      },
      missing
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
      message: authParams.meta.missingMessage,
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

  auth.DEFAULT_DESKTOP_REDIRECT_URI = DEFAULT_DESKTOP_REDIRECT_URI;
  auth.generateState = generateState;
  auth.normalizeScopes = normalizeScopes;
  auth.normalizeCredentialType = normalizeCredentialType;
  auth.pickClientId = pickClientId;
  auth.pickRedirectUri = pickRedirectUri;
  auth.buildAuthorizationParams = buildAuthorizationParams;
  auth.buildAuthorizationUrl = buildAuthorizationUrl;
  auth.createAuthResult = createAuthResult;
})(window);
