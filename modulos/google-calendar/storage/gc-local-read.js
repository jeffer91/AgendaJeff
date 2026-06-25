/*
  Nombre completo: gc-local-read.js
  Ruta: modulos/google-calendar/storage/gc-local-read.js

  Función:
    - Leer conexión Google Calendar desde localStorage.
    - Leer respaldo local de Google Calendar.
    - Leer estado de token OAuth guardado localmente.
    - Usar respaldo local si la conexión principal no existe o está dañada.
    - No tocar Firebase ni Google API.

  Se conecta con:
    - modulos/google-calendar/config/gc-config.js
    - modulos/google-calendar/utils/gc-normalize.js
    - modulos/google-calendar/utils/gc-validate.js
    - modulos/google-calendar/storage/gc-local-save.js
    - modulos/google-calendar/connection/gc-connection-read.js
*/

(function initGoogleCalendarLocalRead(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const storage = googleCalendar.Storage = googleCalendar.Storage || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getUtils() {
    return googleCalendar.Utils || {};
  }

  function getCreateResult() {
    if (typeof googleCalendar.createResult === "function") {
      return googleCalendar.createResult;
    }

    return function fallbackCreateResult(payload) {
      const data = payload && typeof payload === "object" ? payload : {};
      return {
        ok: Boolean(data.ok),
        status: data.status || (data.ok ? "ready" : "error"),
        action: data.action || "read",
        source: data.source || "local",
        message: data.message || "",
        file: data.file || "modulos/google-calendar/storage/gc-local-read.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function hasLocalStorage() {
    try {
      return Boolean(global.localStorage);
    } catch (error) {
      return false;
    }
  }

  function readRawLocalValue(key) {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.LOCAL_READ : "modulos/google-calendar/storage/gc-local-read.js";

    if (!hasLocalStorage()) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "localStorage no está disponible para Google Calendar.",
        error: {
          message: "localStorage no disponible.",
          file
        },
        data: {
          key
        }
      });
    }

    try {
      const raw = global.localStorage.getItem(key);

      if (!raw) {
        return createResult({
          ok: false,
          status: config.status ? config.status.IDLE : "idle",
          action: config.action ? config.action.READ : "read",
          source: config.source ? config.source.LOCAL : "local",
          file,
          message: "No existe valor local para la clave solicitada.",
          data: {
            key,
            raw: null,
            parsed: null
          }
        });
      }

      const parsed = JSON.parse(raw);

      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "Valor local leído correctamente.",
        data: {
          key,
          raw,
          parsed
        }
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.LOCAL : "local",
        file,
        message: "No se pudo leer o interpretar el valor local.",
        error: {
          message: error && error.message ? error.message : "Error leyendo localStorage.",
          file
        },
        data: {
          key
        }
      });
    }
  }

  function normalizeConnection(data) {
    const config = getConfig();
    const utils = getUtils();
    const normalize = utils.Normalize || {};

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(data, {
        source: config.source ? config.source.LOCAL : "local"
      });
    }

    return data && typeof data === "object" ? data : {};
  }

  function normalizeTokenState(data) {
    const utils = getUtils();
    const normalize = utils.Normalize || {};

    if (typeof normalize.normalizeTokenState === "function") {
      return normalize.normalizeTokenState(data);
    }

    return data && typeof data === "object" ? data : {};
  }

  function readLocalConnection() {
    const config = getConfig();
    const createResult = getCreateResult();
    const key = config.storage ? config.storage.mainKey : "agendaJeff.googleCalendar.connection.v1";
    const rawResult = readRawLocalValue(key);

    if (!rawResult.ok) {
      return rawResult;
    }

    const connection = normalizeConnection(rawResult.data.parsed);

    return createResult({
      ok: true,
      status: connection.status || (config.status ? config.status.READY : "ready"),
      action: config.action ? config.action.READ : "read",
      source: config.source ? config.source.LOCAL : "local",
      file: config.fileHints ? config.fileHints.LOCAL_READ : "modulos/google-calendar/storage/gc-local-read.js",
      message: "Conexión Google Calendar leída desde localStorage.",
      data: {
        key,
        connection
      }
    });
  }

  function readLocalBackup() {
    const config = getConfig();
    const createResult = getCreateResult();
    const key = config.storage ? config.storage.backupKey : "agendaJeff.googleCalendar.backup.v1";
    const rawResult = readRawLocalValue(key);

    if (!rawResult.ok) {
      return rawResult;
    }

    const connection = normalizeConnection(rawResult.data.parsed);

    return createResult({
      ok: true,
      status: connection.status || (config.status ? config.status.READY : "ready"),
      action: config.action ? config.action.READ : "read",
      source: config.source ? config.source.LOCAL : "local",
      file: config.fileHints ? config.fileHints.LOCAL_READ : "modulos/google-calendar/storage/gc-local-read.js",
      message: "Respaldo Google Calendar leído desde localStorage.",
      data: {
        key,
        connection
      }
    });
  }

  function readLocalTokenState() {
    const config = getConfig();
    const createResult = getCreateResult();
    const key = config.storage ? config.storage.tokenKey : "agendaJeff.googleCalendar.token.v1";
    const rawResult = readRawLocalValue(key);

    if (!rawResult.ok) {
      return rawResult;
    }

    const token = normalizeTokenState(rawResult.data.parsed);

    return createResult({
      ok: true,
      status: config.status ? config.status.AUTHORIZED : "authorized",
      action: config.action ? config.action.READ : "read",
      source: config.source ? config.source.LOCAL : "local",
      file: config.fileHints ? config.fileHints.LOCAL_READ : "modulos/google-calendar/storage/gc-local-read.js",
      message: "Token Google Calendar leído desde localStorage.",
      data: {
        key,
        token
      }
    });
  }

  function readLastLocalResult() {
    const config = getConfig();
    const key = config.storage ? config.storage.lastResultKey : "agendaJeff.googleCalendar.lastResult.v1";

    return readRawLocalValue(key);
  }

  function readLocalConnectionWithFallback() {
    const config = getConfig();
    const createResult = getCreateResult();
    const mainResult = readLocalConnection();

    if (mainResult.ok) {
      return createResult({
        ok: true,
        status: mainResult.status,
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.LOCAL : "local",
        file: config.fileHints ? config.fileHints.LOCAL_READ : "modulos/google-calendar/storage/gc-local-read.js",
        message: "Conexión Google Calendar cargada desde localStorage principal.",
        data: {
          connection: mainResult.data.connection,
          mainResult,
          backupResult: null,
          usedBackup: false
        }
      });
    }

    const backupResult = readLocalBackup();

    if (backupResult.ok) {
      return createResult({
        ok: true,
        status: backupResult.status,
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.LOCAL : "local",
        file: config.fileHints ? config.fileHints.LOCAL_READ : "modulos/google-calendar/storage/gc-local-read.js",
        message: "Conexión Google Calendar cargada desde respaldo local.",
        data: {
          connection: backupResult.data.connection,
          mainResult,
          backupResult,
          usedBackup: true
        }
      });
    }

    return createResult({
      ok: false,
      status: config.status ? config.status.IDLE : "idle",
      action: config.action ? config.action.READ : "read",
      source: config.source ? config.source.LOCAL : "local",
      file: config.fileHints ? config.fileHints.LOCAL_READ : "modulos/google-calendar/storage/gc-local-read.js",
      message: "No existe conexión Google Calendar en localStorage ni en respaldo.",
      data: {
        connection: null,
        mainResult,
        backupResult,
        usedBackup: false
      }
    });
  }

  function hasLocalBackup() {
    return readLocalBackup().ok;
  }

  storage.hasLocalStorage = hasLocalStorage;
  storage.readRawLocalValue = readRawLocalValue;
  storage.readLocalConnection = readLocalConnection;
  storage.readLocalBackup = readLocalBackup;
  storage.readLocalTokenState = readLocalTokenState;
  storage.readLastLocalResult = readLastLocalResult;
  storage.readLocalConnectionWithFallback = readLocalConnectionWithFallback;
  storage.hasLocalBackup = hasLocalBackup;
})(window);
