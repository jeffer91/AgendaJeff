/*
  Nombre completo: gc-local-save.js
  Ruta: modulos/googlecalendar/storage/gc-local-save.js

  Función:
    - Guardar la conexión Google Calendar en localStorage.
    - Crear respaldo local automático con la misma información normalizada.
    - Guardar el último resultado local para diagnóstico.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/utils/gc-normalize.js
    - modulos/googlecalendar/utils/gc-time.js
    - modulos/googlecalendar/storage/gc-local-read.js
*/

(function initGoogleCalendarLocalSave(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const storage = googleCalendar.Storage = googleCalendar.Storage || {};

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
            action: data.action || "save",
            source: data.source || "local",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/storage/gc-local-save.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  function getNormalize() {
    return googleCalendar.Utils && googleCalendar.Utils.Normalize ? googleCalendar.Utils.Normalize : {};
  }

  function getTime() {
    return googleCalendar.Utils && googleCalendar.Utils.Time ? googleCalendar.Utils.Time : {};
  }

  function getLocalStorage() {
    try {
      return global.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function prepareConnection(connection, options) {
    const config = getConfig();
    const normalize = getNormalize();
    const time = getTime();
    const opts = options && typeof options === "object" ? options : {};
    const now = typeof time.nowIso === "function" ? time.nowIso() : new Date().toISOString();
    const base = {
      ...(connection && typeof connection === "object" ? connection : {}),
      source: opts.source || (config.source ? config.source.LOCAL : "local"),
      status: opts.status || (config.status ? config.status.READY : "ready"),
      estado: opts.status || (config.status ? config.status.READY : "ready"),
      lastAction: opts.action || (config.action ? config.action.SAVE : "save"),
      ultimaAccion: opts.action || (config.action ? config.action.SAVE : "save"),
      lastError: "",
      ultimoError: "",
      lastErrorFile: "",
      updatedAt: now,
      actualizadoEn: now,
      savedAt: now
    };

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(base, { source: base.source });
    }

    return base;
  }

  function writeJsonValue(key, value) {
    const local = getLocalStorage();

    if (!local) {
      return {
        ok: false,
        key,
        error: { message: "localStorage no está disponible." }
      };
    }

    try {
      local.setItem(key, JSON.stringify(value));
      return { ok: true, key, error: null };
    } catch (error) {
      return {
        ok: false,
        key,
        error: { message: error && error.message ? error.message : "No se pudo escribir en localStorage." }
      };
    }
  }

  function saveLastLocalResult(result) {
    const config = getConfig();
    const key = config.storage ? config.storage.lastResultKey : "agendaJeff.googleCalendar.lastResult.v1";
    const payload = result && typeof result === "object" ? result : {};

    return writeJsonValue(key, {
      ...payload,
      storedAt: new Date().toISOString()
    });
  }

  function saveLocalConnection(connection, options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const mainKey = config.storage ? config.storage.mainKey : "agendaJeff.googleCalendar.connection.v1";
    const backupKey = config.storage ? config.storage.backupKey : "agendaJeff.googleCalendar.backup.v1";
    const action = config.action ? config.action.SAVE : "save";
    const source = config.source ? config.source.LOCAL : "local";
    const normalized = prepareConnection(connection, { ...opts, action, source });
    const mainWrite = writeJsonValue(mainKey, normalized);
    const backupWrite = opts.skipBackup === true
      ? { ok: true, key: backupKey, skipped: true, error: null }
      : writeJsonValue(backupKey, normalized);
    const ok = mainWrite.ok && backupWrite.ok;

    const result = createResult({
      ok,
      status: ok ? (config.status ? config.status.READY : "ready") : (config.status ? config.status.ERROR : "error"),
      action,
      source,
      file: "modulos/googlecalendar/storage/gc-local-save.js",
      message: ok
        ? "Conexión Google Calendar guardada en respaldo local."
        : "No se pudo guardar correctamente la conexión local de Google Calendar.",
      error: ok ? null : { main: mainWrite.error, backup: backupWrite.error },
      data: { mainKey, backupKey, mainWrite, backupWrite, connection: normalized }
    });

    saveLastLocalResult(result);
    return result;
  }

  function saveLocalBackup(connection) {
    const config = getConfig();
    const createResult = getCreateResult();
    const backupKey = config.storage ? config.storage.backupKey : "agendaJeff.googleCalendar.backup.v1";
    const normalized = prepareConnection(connection, {
      action: config.action ? config.action.SAVE : "save",
      source: config.source ? config.source.LOCAL : "local"
    });
    const backupWrite = writeJsonValue(backupKey, normalized);

    const result = createResult({
      ok: backupWrite.ok,
      status: backupWrite.ok ? (config.status ? config.status.READY : "ready") : (config.status ? config.status.ERROR : "error"),
      action: config.action ? config.action.SAVE : "save",
      source: config.source ? config.source.LOCAL : "local",
      file: "modulos/googlecalendar/storage/gc-local-save.js",
      message: backupWrite.ok ? "Respaldo local Google Calendar guardado." : "No se pudo guardar el respaldo local.",
      error: backupWrite.error,
      data: { backupKey, backupWrite, connection: normalized }
    });

    saveLastLocalResult(result);
    return result;
  }

  storage.writeJsonValue = writeJsonValue;
  storage.saveLastLocalResult = saveLastLocalResult;
  storage.saveLocalConnection = saveLocalConnection;
  storage.saveLocalBackup = saveLocalBackup;
})(window);
