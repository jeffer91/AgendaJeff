/* gc-auth-desktop.js */
(function initGoogleCalendarAuthDesktop(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const auth = googleCalendar.Auth = googleCalendar.Auth || {};
  let pendingAuth = null;

  function getConfig() { return googleCalendar.CONFIG || {}; }

  function getCreateResult() {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult
      : function fallbackCreateResult(payload) {
          const data = payload && typeof payload === "object" ? payload : {};
          return { ok: Boolean(data.ok), status: data.status || (data.ok ? "authRequired" : "error"), action: data.action || "startAuth", source: data.source || "google-calendar-auth", message: data.message || "", file: data.file || "modulos/googlecalendar/auth/gc-auth-desktop.js", data: data.data || null, error: data.error || null, checkedAt: data.checkedAt || new Date().toISOString() };
        };
  }

  function getLocalStorage() { try { return global.localStorage || null; } catch (error) { return null; } }

  function savePendingAuth(authSession) {
    const config = getConfig();
    const key = config.storage ? config.storage.authKey : "agendaJeff.googleCalendar.auth.v1";
    const local = getLocalStorage();
    pendingAuth = authSession;
    if (!local) return { ok: false, key, error: { message: "localStorage no está disponible." } };
    try { local.setItem(key, JSON.stringify(authSession)); return { ok: true, key, error: null }; }
    catch (error) { return { ok: false, key, error: { message: error && error.message ? error.message : "No se pudo guardar la sesión." } }; }
  }

  function readPendingAuth() {
    const config = getConfig();
    const key = config.storage ? config.storage.authKey : "agendaJeff.googleCalendar.auth.v1";
    const local = getLocalStorage();
    if (!local) return pendingAuth;
    try { const rawValue = local.getItem(key); return rawValue ? JSON.parse(rawValue) : pendingAuth; }
    catch (error) { return pendingAuth; }
  }

  function getFrameBridge(candidateWindow) {
    try { if (candidateWindow && candidateWindow.AgendaJeffElectron) return candidateWindow.AgendaJeffElectron; }
    catch (error) { return null; }
    return null;
  }

  function findElectronBridge() {
    const candidates = [global];
    try { if (global.parent && global.parent !== global) candidates.push(global.parent); } catch (error) {}
    try { if (global.top && global.top !== global && global.top !== global.parent) candidates.push(global.top); } catch (error) {}
    for (let index = 0; index < candidates.length; index += 1) {
      const bridge = getFrameBridge(candidates[index]);
      if (bridge) return { ok: true, bridge, source: index === 0 ? "module-frame" : index === 1 ? "parent-frame" : "top-frame" };
    }
    return { ok: false, bridge: null, source: "none" };
  }

  async function startReturnBridge() {
    const bridgeResult = findElectronBridge();
    if (!bridgeResult.ok || !bridgeResult.bridge || typeof bridgeResult.bridge.startGoogleCalendarReturn !== "function") return { ok: false, bridgeResult, redirectUri: "" };
    const result = await bridgeResult.bridge.startGoogleCalendarReturn();
    return { ...(result || {}), bridgeResult };
  }

  async function openAuthUrlWithoutPopup(url) {
    const bridgeResult = findElectronBridge();
    if (bridgeResult.ok && bridgeResult.bridge && typeof bridgeResult.bridge.openExternal === "function") {
      const result = await bridgeResult.bridge.openExternal(url);
      return { ok: Boolean(result && result.ok !== false), mode: "electron-open-external", bridgeSource: bridgeResult.source, result: result || null };
    }
    return { ok: false, mode: "manual-url", bridgeSource: bridgeResult.source, result: null };
  }

  async function startDesktopAuth(connection, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/googlecalendar/auth/gc-auth-desktop.js";

    if (!auth.buildAuthorizationUrl || typeof auth.buildAuthorizationUrl !== "function") {
      return createResult({ ok: false, status: config.status ? config.status.ERROR : "error", action: config.action ? config.action.START_AUTH : "startAuth", source: config.source ? config.source.AUTH : "google-calendar-auth", file, message: "No está disponible buildAuthorizationUrl.", error: { message: "Falta constructor de URL." } });
    }

    const returnStart = await startReturnBridge();
    const connectionData = { ...(connection && typeof connection === "object" ? connection : {}), ...(opts.authInput && typeof opts.authInput === "object" ? opts.authInput : {}) };
    if (returnStart && returnStart.ok && returnStart.redirectUri) {
      connectionData.redirectUri = returnStart.redirectUri;
      connectionData.redirectUriDesktop = returnStart.redirectUri;
    }

    const urlResult = auth.buildAuthorizationUrl(connectionData);
    if (!urlResult.ok) {
      return createResult({ ok: false, status: config.status ? config.status.ERROR : "error", action: config.action ? config.action.START_AUTH : "startAuth", source: config.source ? config.source.AUTH : "google-calendar-auth", file, message: "No se pudo construir la URL de autorización Google Calendar.", error: { message: urlResult.message || "Faltan datos para iniciar autorización.", file }, data: { urlResult, returnStart } });
    }

    const authSession = { provider: "googleCalendar", status: config.status ? config.status.AUTH_REQUIRED : "authRequired", action: config.action ? config.action.START_AUTH : "startAuth", source: config.source ? config.source.AUTH : "google-calendar-auth", url: urlResult.url, redirectUri: urlResult.params.redirect_uri, state: urlResult.meta.state, scopes: urlResult.meta.scopes, credentialType: urlResult.meta.credentialType, calendarId: urlResult.meta.calendarId, createdAt: new Date().toISOString() };
    const localResult = savePendingAuth(authSession);
    const openResult = opts.openExternal === false ? { ok: false, mode: "manual-url", skipped: true } : await openAuthUrlWithoutPopup(urlResult.url);

    return createResult({ ok: true, status: config.status ? config.status.AUTH_REQUIRED : "authRequired", action: config.action ? config.action.START_AUTH : "startAuth", source: config.source ? config.source.AUTH : "google-calendar-auth", file, message: openResult.ok && returnStart && returnStart.ok ? "Google Calendar abierto. Al volver, presiona Procesar código para finalizar automáticamente." : "URL de autorización Google Calendar preparada para apertura manual.", data: { authSession, localResult, openResult, returnStart, authorizationUrl: urlResult.url } });
  }

  function clearPendingAuth() {
    const config = getConfig();
    const key = config.storage ? config.storage.authKey : "agendaJeff.googleCalendar.auth.v1";
    const local = getLocalStorage();
    pendingAuth = null;
    if (local) { try { local.removeItem(key); } catch (error) { return { ok: false, key, error: { message: error && error.message ? error.message : "No se pudo limpiar autorización pendiente." } }; } }
    return { ok: true, key, error: null };
  }

  auth.savePendingAuth = savePendingAuth;
  auth.readPendingAuth = readPendingAuth;
  auth.getFrameBridge = getFrameBridge;
  auth.findElectronBridge = findElectronBridge;
  auth.startReturnBridge = startReturnBridge;
  auth.openAuthUrlWithoutPopup = openAuthUrlWithoutPopup;
  auth.startDesktopAuth = startDesktopAuth;
  auth.clearPendingAuth = clearPendingAuth;
})(window);
