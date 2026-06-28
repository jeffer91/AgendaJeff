/*
  Nombre completo: gc-auth-desktop.js
  Ruta: modulos/googlecalendar/auth/gc-auth-desktop.js

  Función:
    - Iniciar autorización Google Calendar en modo escritorio sin usar popup.
    - Preparar URL de autorización y guardarla como sesión pendiente.
    - Abrir Google en navegador externo desde Electron, incluso cuando el módulo vive dentro de un iframe.
    - Si no existe puente Electron, devolver URL para apertura manual.

  Se conecta con:
    - modulos/googlecalendar/auth/gc-auth-url.js
    - modulos/googlecalendar/storage/gc-local-save.js
    - modulos/googlecalendar/config/gc-config.js
    - electron/preload.js
*/

(function initGoogleCalendarAuthDesktop(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const auth = googleCalendar.Auth = googleCalendar.Auth || {};

  let pendingAuth = null;

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
            status: data.status || (data.ok ? "authRequired" : "error"),
            action: data.action || "startAuth",
            source: data.source || "google-calendar-auth",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/auth/gc-auth-desktop.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  function getLocalStorage() {
    try {
      return global.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function savePendingAuth(authSession) {
    const config = getConfig();
    const key = config.storage ? config.storage.authKey : "agendaJeff.googleCalendar.auth.v1";
    const local = getLocalStorage();

    pendingAuth = authSession;

    if (!local) {
      return { ok: false, key, error: { message: "localStorage no está disponible." } };
    }

    try {
      local.setItem(key, JSON.stringify(authSession));
      return { ok: true, key, error: null };
    } catch (error) {
      return {
        ok: false,
        key,
        error: { message: error && error.message ? error.message : "No se pudo guardar la sesión de autorización." }
      };
    }
  }

  function readPendingAuth() {
    const config = getConfig();
    const key = config.storage ? config.storage.authKey : "agendaJeff.googleCalendar.auth.v1";
    const local = getLocalStorage();

    if (!local) {
      return pendingAuth;
    }

    try {
      const rawValue = local.getItem(key);

      if (!rawValue) {
        return pendingAuth;
      }

      return JSON.parse(rawValue);
    } catch (error) {
      return pendingAuth;
    }
  }

  function getFrameBridge(candidateWindow) {
    try {
      if (candidateWindow && candidateWindow.AgendaJeffElectron && typeof candidateWindow.AgendaJeffElectron.openExternal === "function") {
        return candidateWindow.AgendaJeffElectron;
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function findElectronBridge() {
    const candidates = [];

    candidates.push(global);

    try {
      if (global.parent && global.parent !== global) {
        candidates.push(global.parent);
      }
    } catch (error) {
      // Ignorar acceso bloqueado entre frames.
    }

    try {
      if (global.top && global.top !== global && global.top !== global.parent) {
        candidates.push(global.top);
      }
    } catch (error) {
      // Ignorar acceso bloqueado entre frames.
    }

    for (let index = 0; index < candidates.length; index += 1) {
      const bridge = getFrameBridge(candidates[index]);

      if (bridge) {
        return {
          ok: true,
          bridge,
          source: index === 0 ? "module-frame" : index === 1 ? "parent-frame" : "top-frame"
        };
      }
    }

    return {
      ok: false,
      bridge: null,
      source: "none"
    };
  }

  async function openAuthUrlWithoutPopup(url) {
    const bridgeResult = findElectronBridge();

    if (bridgeResult.ok && bridgeResult.bridge) {
      const result = await bridgeResult.bridge.openExternal(url);
      return {
        ok: Boolean(result && result.ok !== false),
        mode: "electron-open-external",
        bridgeSource: bridgeResult.source,
        result: result || null
      };
    }

    return {
      ok: false,
      mode: "manual-url",
      bridgeSource: bridgeResult.source,
      result: null,
      message: "No existe puente Electron openExternal en el iframe ni en la ventana principal; se devuelve URL para apertura manual."
    };
  }

  async function startDesktopAuth(connection, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/auth/gc-auth-desktop.js";

    if (!auth.buildAuthorizationUrl || typeof auth.buildAuthorizationUrl !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.START_AUTH : "startAuth",
        source: config.source ? config.source.AUTH : "google-calendar-auth",
        file,
        message: "No está disponible buildAuthorizationUrl. Revisa gc-auth-url.js.",
        error: { message: "Falta constructor de URL OAuth.", file: "modulos/googlecalendar/auth/gc-auth-url.js" }
      });
    }

    const urlResult = auth.buildAuthorizationUrl({
      ...(connection && typeof connection === "object" ? connection : {}),
      ...(opts.authInput && typeof opts.authInput === "object" ? opts.authInput : {})
    });

    if (!urlResult.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.START_AUTH : "startAuth",
        source: config.source ? config.source.AUTH : "google-calendar-auth",
        file,
        message: "No se pudo construir la URL de autorización Google Calendar.",
        error: { message: urlResult.message || "Faltan datos para iniciar autorización.", file },
        data: urlResult
      });
    }

    const authSession = {
      provider: "googleCalendar",
      status: config.status ? config.status.AUTH_REQUIRED : "authRequired",
      action: config.action ? config.action.START_AUTH : "startAuth",
      source: config.source ? config.source.AUTH : "google-calendar-auth",
      url: urlResult.url,
      state: urlResult.meta.state,
      scopes: urlResult.meta.scopes,
      credentialType: urlResult.meta.credentialType,
      calendarId: urlResult.meta.calendarId,
      createdAt: new Date().toISOString()
    };

    const localResult = savePendingAuth(authSession);
    const openResult = opts.openExternal === false
      ? { ok: false, mode: "manual-url", skipped: true }
      : await openAuthUrlWithoutPopup(urlResult.url);

    return createResult({
      ok: true,
      status: config.status ? config.status.AUTH_REQUIRED : "authRequired",
      action: config.action ? config.action.START_AUTH : "startAuth",
      source: config.source ? config.source.AUTH : "google-calendar-auth",
      file,
      message: openResult.ok
        ? "Autorización Google Calendar abierta en navegador externo."
        : "URL de autorización Google Calendar preparada para apertura manual.",
      data: {
        authSession,
        localResult,
        openResult,
        authorizationUrl: urlResult.url
      }
    });
  }

  function clearPendingAuth() {
    const config = getConfig();
    const key = config.storage ? config.storage.authKey : "agendaJeff.googleCalendar.auth.v1";
    const local = getLocalStorage();

    pendingAuth = null;

    if (local) {
      try {
        local.removeItem(key);
      } catch (error) {
        return { ok: false, key, error: { message: error && error.message ? error.message : "No se pudo limpiar autorización pendiente." } };
      }
    }

    return { ok: true, key, error: null };
  }

  auth.savePendingAuth = savePendingAuth;
  auth.readPendingAuth = readPendingAuth;
  auth.getFrameBridge = getFrameBridge;
  auth.findElectronBridge = findElectronBridge;
  auth.openAuthUrlWithoutPopup = openAuthUrlWithoutPopup;
  auth.startDesktopAuth = startDesktopAuth;
  auth.clearPendingAuth = clearPendingAuth;
})(window);
