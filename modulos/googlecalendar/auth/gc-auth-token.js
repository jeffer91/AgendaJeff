/*
  Nombre completo: gc-auth-token.js
  Ruta: modulos/googlecalendar/auth/gc-auth-token.js

  Función:
    - Procesar el código de autorización recibido desde Google.
    - Intercambiar el código por credenciales de acceso usando datos entregados en tiempo de ejecución.
    - Guardar únicamente el resultado normalizado en localStorage cuando corresponda.

  Se conecta con:
    - modulos/googlecalendar/auth/gc-auth-desktop.js
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/storage/gc-local-save.js
*/

(function initGoogleCalendarAuthToken(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const auth = googleCalendar.Auth = googleCalendar.Auth || {};

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
            status: data.status || (data.ok ? "authorized" : "error"),
            action: data.action || "exchangeCode",
            source: data.source || "google-calendar-auth",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/auth/gc-auth-token.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  function asText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function getRuntimeConfig() {
    const googleConfig = googleCalendar.GoogleConfig || {};

    if (typeof googleConfig.getGoogleRuntimeConfig === "function") {
      return googleConfig.getGoogleRuntimeConfig();
    }

    return { exchangeUrl: "https://oauth2.googleapis.com/token" };
  }

  function buildExchangePayload(input) {
    const data = input && typeof input === "object" ? input : {};
    const code = asText(data.code || data.authorizationCode);
    const clientId = asText(data.clientId || data.clientIdDesktop || data.clientIdWeb);
    const clientSecret = asText(data.clientSecret || data.clientSecretDesktop || data.clientSecretWeb);
    const redirectUri = asText(data.redirectUri || data.redirectUriDesktop || data.redirectUriWeb);
    const errors = [];

    if (!code) {
      errors.push({ field: "code", message: "Falta el código de autorización." });
    }

    if (!clientId) {
      errors.push({ field: "clientId", message: "Falta Client ID." });
    }

    if (!redirectUri) {
      errors.push({ field: "redirectUri", message: "Falta Redirect URI." });
    }

    const payload = new URLSearchParams();
    payload.set("code", code);
    payload.set("client_id", clientId);
    payload.set("redirect_uri", redirectUri);
    payload.set("grant_type", "authorization_code");

    if (clientSecret) {
      payload.set("client_secret", clientSecret);
    }

    return {
      ok: errors.length === 0,
      payload,
      errors,
      meta: {
        hasCode: Boolean(code),
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret),
        hasRedirectUri: Boolean(redirectUri)
      }
    };
  }

  function normalizeTokenResponse(json, input) {
    const data = json && typeof json === "object" ? json : {};
    const source = input && typeof input === "object" ? input : {};
    const issuedAt = new Date().toISOString();
    const expiresIn = Number(data.expires_in || 0);
    const expiresAt = expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : "";

    return {
      provider: "googleCalendar",
      status: "authorized",
      activeCredentialType: source.activeCredentialType || "desktop",
      calendarId: source.calendarId || "primary",
      accessToken: data.access_token || "",
      refreshToken: data.refresh_token || source.refreshToken || "",
      tokenType: data.token_type || "Bearer",
      scope: data.scope || "",
      expiresIn,
      issuedAt,
      expiresAt,
      updatedAt: issuedAt,
      actualizadoEn: issuedAt
    };
  }

  function saveAuthData(authData) {
    const config = getConfig();
    const key = config.storage ? config.storage.authKey : "agendaJeff.googleCalendar.auth.v1";

    try {
      if (!global.localStorage) {
        return { ok: false, key, error: { message: "localStorage no está disponible." } };
      }

      global.localStorage.setItem(key, JSON.stringify(authData));
      return { ok: true, key, error: null };
    } catch (error) {
      return {
        ok: false,
        key,
        error: { message: error && error.message ? error.message : "No se pudo guardar autorización." }
      };
    }
  }

  async function exchangeAuthorizationCode(input, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const runtime = getRuntimeConfig();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/auth/gc-auth-token.js";
    const exchange = buildExchangePayload(input);

    if (!exchange.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.EXCHANGE_CODE : "exchangeCode",
        source: config.source ? config.source.AUTH : "google-calendar-auth",
        file,
        message: "No se puede intercambiar el código porque faltan datos.",
        error: {
          message: exchange.errors.map(function mapError(item) { return item.message; }).join(" "),
          file
        },
        data: { errors: exchange.errors, meta: exchange.meta }
      });
    }

    try {
      const response = await global.fetch(runtime.exchangeUrl || "https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: exchange.payload.toString()
      });
      const json = await response.json();

      if (!response.ok || json.error) {
        return createResult({
          ok: false,
          status: config.status ? config.status.ERROR : "error",
          action: config.action ? config.action.EXCHANGE_CODE : "exchangeCode",
          source: config.source ? config.source.AUTH : "google-calendar-auth",
          file,
          message: "Google no aceptó el código de autorización.",
          error: {
            message: json.error_description || json.error || `HTTP ${response.status}`,
            file
          },
          data: { httpStatus: response.status, response: json, meta: exchange.meta }
        });
      }

      const authData = normalizeTokenResponse(json, input);
      const localResult = opts.skipSave === true ? { ok: true, skipped: true } : saveAuthData(authData);

      return createResult({
        ok: true,
        status: config.status ? config.status.AUTHORIZED : "authorized",
        action: config.action ? config.action.EXCHANGE_CODE : "exchangeCode",
        source: config.source ? config.source.AUTH : "google-calendar-auth",
        file,
        message: "Autorización Google Calendar guardada correctamente.",
        data: {
          authData: {
            ...authData,
            accessToken: authData.accessToken ? "***" : "",
            refreshToken: authData.refreshToken ? "***" : ""
          },
          localResult
        }
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.EXCHANGE_CODE : "exchangeCode",
        source: config.source ? config.source.AUTH : "google-calendar-auth",
        file,
        message: "No se pudo completar la autorización Google Calendar.",
        error: { message: error && error.message ? error.message : "Error desconocido.", file },
        data: { meta: exchange.meta }
      });
    }
  }

  auth.buildExchangePayload = buildExchangePayload;
  auth.normalizeTokenResponse = normalizeTokenResponse;
  auth.saveAuthData = saveAuthData;
  auth.exchangeAuthorizationCode = exchangeAuthorizationCode;
})(window);
