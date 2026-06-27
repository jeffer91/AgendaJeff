/*
  Nombre completo: gc-auth-refresh.js
  Ruta: modulos/googlecalendar/auth/gc-auth-refresh.js

  Función:
    - Leer autorización local de Google Calendar.
    - Detectar si el acceso está vencido o próximo a vencer.
    - Renovar el acceso usando refreshToken cuando exista.

  Se conecta con:
    - modulos/googlecalendar/auth/gc-auth-token.js
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/config/gc-google-config.js
*/

(function initGoogleCalendarAuthRefresh(global) {
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
            action: data.action || "refreshAccess",
            source: data.source || "google-calendar-auth",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/auth/gc-auth-refresh.js",
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

  function getAuthKey() {
    const config = getConfig();
    return config.storage ? config.storage.authKey : "agendaJeff.googleCalendar.auth.v1";
  }

  function readAuthData() {
    const key = getAuthKey();

    try {
      if (!global.localStorage) {
        return { ok: false, key, authData: null, error: { message: "localStorage no está disponible." } };
      }

      const rawValue = global.localStorage.getItem(key);

      if (!rawValue) {
        return { ok: false, key, authData: null, error: null, message: "No hay autorización local." };
      }

      return { ok: true, key, authData: JSON.parse(rawValue), error: null };
    } catch (error) {
      return {
        ok: false,
        key,
        authData: null,
        error: { message: error && error.message ? error.message : "No se pudo leer autorización local." }
      };
    }
  }

  function saveAuthData(authData) {
    const key = getAuthKey();

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
        error: { message: error && error.message ? error.message : "No se pudo guardar autorización renovada." }
      };
    }
  }

  function isAccessExpired(authData, marginSeconds) {
    const data = authData && typeof authData === "object" ? authData : {};
    const expiresAt = asText(data.expiresAt);
    const margin = Number.isFinite(Number(marginSeconds)) ? Number(marginSeconds) : 120;

    if (!expiresAt) {
      return true;
    }

    const expiresMs = new Date(expiresAt).getTime();

    if (Number.isNaN(expiresMs)) {
      return true;
    }

    return Date.now() + margin * 1000 >= expiresMs;
  }

  function buildRefreshPayload(input) {
    const data = input && typeof input === "object" ? input : {};
    const refreshToken = asText(data.refreshToken);
    const clientId = asText(data.clientId || data.clientIdDesktop || data.clientIdWeb);
    const clientSecret = asText(data.clientSecret || data.clientSecretDesktop || data.clientSecretWeb);
    const errors = [];

    if (!refreshToken) {
      errors.push({ field: "refreshToken", message: "Falta refreshToken." });
    }

    if (!clientId) {
      errors.push({ field: "clientId", message: "Falta Client ID." });
    }

    const payload = new URLSearchParams();
    payload.set("refresh_token", refreshToken);
    payload.set("client_id", clientId);
    payload.set("grant_type", "refresh_token");

    if (clientSecret) {
      payload.set("client_secret", clientSecret);
    }

    return {
      ok: errors.length === 0,
      payload,
      errors,
      meta: {
        hasRefreshToken: Boolean(refreshToken),
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret)
      }
    };
  }

  function mergeRefreshResponse(previousAuth, json) {
    const oldData = previousAuth && typeof previousAuth === "object" ? previousAuth : {};
    const data = json && typeof json === "object" ? json : {};
    const issuedAt = new Date().toISOString();
    const expiresIn = Number(data.expires_in || oldData.expiresIn || 0);
    const expiresAt = expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : "";

    return {
      ...oldData,
      accessToken: data.access_token || oldData.accessToken || "",
      refreshToken: data.refresh_token || oldData.refreshToken || "",
      tokenType: data.token_type || oldData.tokenType || "Bearer",
      scope: data.scope || oldData.scope || "",
      expiresIn,
      issuedAt,
      expiresAt,
      status: "authorized",
      updatedAt: issuedAt,
      actualizadoEn: issuedAt
    };
  }

  async function refreshAccess(input, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const runtime = getRuntimeConfig();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/auth/gc-auth-refresh.js";
    const localRead = readAuthData();
    const previousAuth = {
      ...(localRead.authData && typeof localRead.authData === "object" ? localRead.authData : {}),
      ...(input && typeof input === "object" ? input : {})
    };
    const refresh = buildRefreshPayload(previousAuth);

    if (!refresh.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.AUTH_REQUIRED : "authRequired",
        action: config.action ? config.action.REFRESH_ACCESS : "refreshAccess",
        source: config.source ? config.source.AUTH : "google-calendar-auth",
        file,
        message: "No se puede renovar Google Calendar porque faltan datos.",
        error: {
          message: refresh.errors.map(function mapError(item) { return item.message; }).join(" "),
          file
        },
        data: { localRead, errors: refresh.errors, meta: refresh.meta }
      });
    }

    try {
      const response = await global.fetch(runtime.exchangeUrl || "https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: refresh.payload.toString()
      });
      const json = await response.json();

      if (!response.ok || json.error) {
        return createResult({
          ok: false,
          status: config.status ? config.status.AUTH_REQUIRED : "authRequired",
          action: config.action ? config.action.REFRESH_ACCESS : "refreshAccess",
          source: config.source ? config.source.AUTH : "google-calendar-auth",
          file,
          message: "Google no renovó la autorización Calendar.",
          error: {
            message: json.error_description || json.error || `HTTP ${response.status}`,
            file
          },
          data: { httpStatus: response.status, response: json, meta: refresh.meta }
        });
      }

      const authData = mergeRefreshResponse(previousAuth, json);
      const saveResult = opts.skipSave === true ? { ok: true, skipped: true } : saveAuthData(authData);

      return createResult({
        ok: true,
        status: config.status ? config.status.AUTHORIZED : "authorized",
        action: config.action ? config.action.REFRESH_ACCESS : "refreshAccess",
        source: config.source ? config.source.AUTH : "google-calendar-auth",
        file,
        message: "Autorización Google Calendar renovada correctamente.",
        data: {
          authData: {
            ...authData,
            accessToken: authData.accessToken ? "***" : "",
            refreshToken: authData.refreshToken ? "***" : ""
          },
          saveResult
        }
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.REFRESH_ACCESS : "refreshAccess",
        source: config.source ? config.source.AUTH : "google-calendar-auth",
        file,
        message: "Error renovando autorización Google Calendar.",
        error: { message: error && error.message ? error.message : "Error desconocido.", file },
        data: { meta: refresh.meta }
      });
    }
  }

  async function ensureAccess(input, options) {
    const localRead = readAuthData();
    const authData = {
      ...(localRead.authData && typeof localRead.authData === "object" ? localRead.authData : {}),
      ...(input && typeof input === "object" ? input : {})
    };

    if (authData.accessToken && !isAccessExpired(authData, options && options.marginSeconds)) {
      return getCreateResult()({
        ok: true,
        status: getConfig().status ? getConfig().status.AUTHORIZED : "authorized",
        action: "ensureAccess",
        source: "google-calendar-auth",
        file: "modulos/googlecalendar/auth/gc-auth-refresh.js",
        message: "Autorización Google Calendar vigente.",
        data: {
          authData: {
            ...authData,
            accessToken: authData.accessToken ? "***" : "",
            refreshToken: authData.refreshToken ? "***" : ""
          },
          needsRefresh: false
        }
      });
    }

    return refreshAccess(authData, options);
  }

  auth.readAuthData = readAuthData;
  auth.saveAuthData = saveAuthData;
  auth.isAccessExpired = isAccessExpired;
  auth.buildRefreshPayload = buildRefreshPayload;
  auth.mergeRefreshResponse = mergeRefreshResponse;
  auth.refreshAccess = refreshAccess;
  auth.ensureAccess = ensureAccess;
})(window);
