/*
  Nombre completo: gc-api-client.js
  Ruta: modulos/googlecalendar/api/gc-api-client.js

  Función:
    - Crear un cliente HTTP reutilizable para Google Calendar API.
    - Resolver autorización vigente usando la capa auth del módulo.
    - Enviar solicitudes autenticadas sin mostrar credenciales completas en resultados.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/config/gc-google-config.js
    - modulos/googlecalendar/auth/gc-auth-refresh.js
    - modulos/googlecalendar/api/*
*/

(function initGoogleCalendarApiClient(global) {
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
            action: data.action || "apiRequest",
            source: data.source || "google-calendar-api",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/api/gc-api-client.js",
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

    return {
      apiBaseUrl: "https://www.googleapis.com/calendar/v3",
      defaultCalendarId: "primary"
    };
  }

  function joinPath(baseUrl, path) {
    const base = asText(baseUrl).replace(/\/+$/g, "");
    const cleanPath = asText(path).replace(/^\/+/, "");

    return base + "/" + cleanPath;
  }

  function appendQuery(url, query) {
    const result = new URL(url);
    const data = query && typeof query === "object" ? query : {};

    Object.keys(data).forEach(function appendKey(key) {
      const value = data[key];

      if (value !== undefined && value !== null && String(value).length > 0) {
        result.searchParams.set(key, value);
      }
    });

    return result.toString();
  }

  function maskAuthData(authData) {
    const data = authData && typeof authData === "object" ? authData : {};

    return {
      ...data,
      accessToken: data.accessToken ? "***" : "",
      refreshToken: data.refreshToken ? "***" : ""
    };
  }

  async function resolveAuth(options) {
    const auth = googleCalendar.Auth || {};
    const opts = options && typeof options === "object" ? options : {};

    if (opts.authData && opts.authData.accessToken) {
      return { ok: true, authData: opts.authData, authResult: null, source: "direct" };
    }

    if (opts.accessToken) {
      return {
        ok: true,
        authData: {
          accessToken: opts.accessToken,
          tokenType: "Bearer",
          calendarId: opts.calendarId || "primary"
        },
        authResult: null,
        source: "direct-token"
      };
    }

    if (auth.ensureAccess && typeof auth.ensureAccess === "function") {
      const authResult = await auth.ensureAccess(opts.authInput || {}, opts.authOptions || {});
      const rawAuth = auth.readAuthData && typeof auth.readAuthData === "function" ? auth.readAuthData() : null;
      const authData = rawAuth && rawAuth.authData ? rawAuth.authData : null;

      return {
        ok: Boolean(authResult && authResult.ok && authData && authData.accessToken),
        authData,
        authResult,
        source: "auth-layer"
      };
    }

    return {
      ok: false,
      authData: null,
      authResult: null,
      source: "none",
      error: { message: "No está disponible auth.ensureAccess." }
    };
  }

  function buildHeaders(authData, extraHeaders) {
    const data = authData && typeof authData === "object" ? authData : {};
    const headers = {
      Accept: "application/json",
      ...(extraHeaders && typeof extraHeaders === "object" ? extraHeaders : {})
    };
    const token = asText(data.accessToken);
    const type = asText(data.tokenType) || "Bearer";

    if (token) {
      headers.Authorization = type + " " + token;
    }

    return headers;
  }

  async function requestJson(input) {
    const config = getConfig();
    const createResult = getCreateResult();
    const runtime = getRuntimeConfig();
    const data = input && typeof input === "object" ? input : {};
    const file = "modulos/googlecalendar/api/gc-api-client.js";
    const method = asText(data.method || "GET").toUpperCase();
    const path = asText(data.path);
    const action = data.action || "apiRequest";
    const checkedAt = new Date().toISOString();

    if (!path) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "No se puede llamar Google Calendar API sin ruta.",
        error: { message: "Falta path.", file },
        checkedAt
      });
    }

    const authResolved = await resolveAuth(data.auth || {});

    if (!authResolved.ok || !authResolved.authData || !authResolved.authData.accessToken) {
      return createResult({
        ok: false,
        status: config.status ? config.status.AUTH_REQUIRED : "authRequired",
        action,
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "Google Calendar necesita autorización vigente.",
        error: authResolved.error || { message: "No hay credencial de acceso disponible.", file },
        data: { authResolved },
        checkedAt
      });
    }

    const baseUrl = data.absoluteUrl || joinPath(runtime.apiBaseUrl, path);
    const url = appendQuery(baseUrl, data.query || {});
    const headers = buildHeaders(authResolved.authData, data.headers);

    if (data.body !== undefined && data.body !== null) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    try {
      const response = await global.fetch(url, {
        method,
        headers,
        body: data.body !== undefined && data.body !== null
          ? (typeof data.body === "string" ? data.body : JSON.stringify(data.body))
          : undefined
      });
      const text = await response.text();
      let json = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch (parseError) {
        json = { rawText: text, parseError: parseError && parseError.message ? parseError.message : "JSON inválido." };
      }

      if (!response.ok) {
        return createResult({
          ok: false,
          status: config.status ? config.status.ERROR : "error",
          action,
          source: config.source ? config.source.GOOGLE : "google-calendar-api",
          file,
          message: "Google Calendar API respondió con error.",
          error: {
            message: json && json.error && json.error.message ? json.error.message : "HTTP " + response.status,
            file
          },
          data: {
            httpStatus: response.status,
            response: json,
            auth: maskAuthData(authResolved.authData)
          },
          checkedAt
        });
      }

      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action,
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "Google Calendar API respondió correctamente.",
        data: {
          httpStatus: response.status,
          response: json,
          auth: maskAuthData(authResolved.authData)
        },
        checkedAt
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: config.source ? config.source.GOOGLE : "google-calendar-api",
        file,
        message: "No se pudo conectar con Google Calendar API.",
        error: { message: error && error.message ? error.message : "Error desconocido.", file },
        data: { auth: maskAuthData(authResolved.authData) },
        checkedAt
      });
    }
  }

  api.Client = Object.freeze({
    getRuntimeConfig,
    joinPath,
    appendQuery,
    resolveAuth,
    buildHeaders,
    requestJson,
    maskAuthData
  });
})(window);
