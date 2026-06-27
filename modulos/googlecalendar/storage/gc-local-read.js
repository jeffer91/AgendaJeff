/*
  Nombre completo: gc-local-read.js
  Ruta: modulos/googlecalendar/storage/gc-local-read.js

  Función:
    - Leer la conexión Google Calendar guardada en localStorage.
    - Leer el respaldo local cuando la conexión principal no exista o falle.
    - Normalizar los datos locales antes de entregarlos a conexión, diagnóstico o UI.
    - Reportar errores claros de lectura local.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/utils/gc-normalize.js
    - modulos/googlecalendar/storage/gc-local-save.js
*/

(function initGoogleCalendarLocalRead(global) {
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
            action: data.action || "read",
            source: data.source || "local",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/storage/gc-local-read.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  function getNormalize() {
    return googleCalendar.Utils && googleCalendar.Utils.Normalize ? googleCalendar.Utils.Normalize : {};
  }

  function getLocalStorage() {
    try {
      return global.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function readRawLocalValue(key) {
    const local = getLocalStorage();

    if (!local) {
      return {
        ok: false,
        exists: false,
        key,
        rawValue: "",
        error: { message: "localStorage no está disponible." }
      };
    }

    try {
      const rawValue = local.getItem(key);
      return {
        ok: true,
        exists: rawValue !== null,
        key,
        rawValue: rawValue || "",
        error: null
      };
    } catch (error) {
      return {
        ok: false,
        exists: false,
        key,
        rawValue: "",
        error: { message: error && error.message ? error.message : "No se pudo leer localStorage." }
      };
    }
  }

  function safeJsonParse(rawValue, key) {
    if (!rawValue) {
      return {
        ok: false,
        exists: false,
        key,
        value: null,
        error: null,
        message: "No existe información local para esta clave."
      };
    }

    try {
      return {
        ok: true,
        exists: true,
        key,
        value: JSON.parse(rawValue),
        error: null,
        message: "Información local leída correctamente."
      };
    } catch (error) {
      return {
        ok: false,
        exists: true,
        key,
        value: null,
        error: { message: error && error.message ? error.message : "JSON local inválido." },
        message: "La información local existe, pero no se pudo interpretar."
      };
    }
  }

  function normalizeLocalConnection(value, source) {
    const config = getConfig();
    const normalize = getNormalize();
    const data = value && typeof value === "object" ? value : {};

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(data, {
        source: source || (config.source ? config.source.LOCAL : "local")
      });
    }

    return {
      ...data,
      source: source || "local"
    };
  }

  function readLocalByKey(key, label) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = "modulos/googlecalendar/storage/gc-local-read.js";
    const raw = readRawLocalValue(key);
    const source = config.source ? config.source.LOCAL : "local";
    const action = config.action ? config.action.READ : "read";

    if (!raw.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: raw.error && raw.error.message ? raw.error.message : "No se pudo leer localStorage.",
        error: raw.error,
        data: { key, label: label || key, exists: false }
      });
    }

    const parsed = safeJsonParse(raw.rawValue, key);

    if (!parsed.ok) {
      return createResult({
        ok: false,
        status: parsed.exists ? (config.status ? config.status.ERROR : "error") : (config.status ? config.status.IDLE : "idle"),
        action,
        source,
        file,
        message: parsed.message,
        error: parsed.error,
        data: { key, label: label || key, exists: parsed.exists }
      });
    }

    return createResult({
      ok: true,
      status: config.status ? config.status.READY : "ready",
      action,
      source,
      file,
      message: "Conexión local Google Calendar leída correctamente.",
      data: {
        key,
        label: label || key,
        exists: true,
        connection: normalizeLocalConnection(parsed.value, source)
      }
    });
  }

  function readLocalConnection() {
    const config = getConfig();
    const key = config.storage ? config.storage.mainKey : "agendaJeff.googleCalendar.connection.v1";
    return readLocalByKey(key, "main");
  }

  function readLocalBackup() {
    const config = getConfig();
    const key = config.storage ? config.storage.backupKey : "agendaJeff.googleCalendar.backup.v1";
    return readLocalByKey(key, "backup");
  }

  function readLocalConnectionWithFallback() {
    const config = getConfig();
    const createResult = getCreateResult();
    const mainResult = readLocalConnection();

    if (mainResult.ok) {
      return mainResult;
    }

    const backupResult = readLocalBackup();

    if (backupResult.ok) {
      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.LOCAL : "local",
        file: "modulos/googlecalendar/storage/gc-local-read.js",
        message: "Se usó el respaldo local de Google Calendar.",
        data: {
          usedFallback: true,
          mainResult,
          backupResult,
          connection: backupResult.data ? backupResult.data.connection : null
        }
      });
    }

    return createResult({
      ok: false,
      status: config.status ? config.status.IDLE : "idle",
      action: config.action ? config.action.READ : "read",
      source: config.source ? config.source.LOCAL : "local",
      file: "modulos/googlecalendar/storage/gc-local-read.js",
      message: "No hay conexión local ni respaldo local disponible para Google Calendar.",
      data: { usedFallback: false, mainResult, backupResult }
    });
  }

  storage.readRawLocalValue = readRawLocalValue;
  storage.readLocalConnection = readLocalConnection;
  storage.readLocalBackup = readLocalBackup;
  storage.readLocalConnectionWithFallback = readLocalConnectionWithFallback;
})(window);
