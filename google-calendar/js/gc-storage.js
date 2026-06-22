/*
  Nombre completo: gc-storage.js
  Ruta: google-calendar/js/gc-storage.js
  Función:
    - Guardar y leer la configuración de Google Calendar desde localStorage.
    - Guardar Client ID Web, Client Secret Web, Client ID Escritorio y Client Secret Escritorio.
    - Detectar si la app corre en navegador o escritorio.
    - Elegir automáticamente el par activo de credenciales según el entorno.
    - Mantener compatibilidad con datos viejos guardados como clientId/clientSecret.
    - Evitar guardar access tokens en localStorage.
    - Evitar que la pantalla principal maneje directamente localStorage.
  Se conecta con:
    - gc-config.js
    - gc-app.js

  Importante:
    - Este archivo NO guarda accessToken.
    - Este archivo NO guarda refreshToken.
    - Este archivo NO usa Telegram.
*/

(function initGcStorage(global) {
  "use strict";

  const GC = global.GC;
  const CONFIG = GC.CONFIG;
  const STORAGE_KEY = CONFIG.STORAGE_KEY;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeCalendarId(value) {
    const calendarId = normalizeText(value);

    if (!calendarId) {
      return CONFIG.DEFAULT_CALENDAR_ID;
    }

    return calendarId;
  }

  function maskValue(value) {
    const text = normalizeText(value);

    if (!text) {
      return "";
    }

    if (text.length <= 8) {
      return "********";
    }

    return `${"*".repeat(Math.max(0, text.length - 8))}${text.slice(-8)}`;
  }

  function isElectronRuntime() {
    const hasElectronProcess = Boolean(
      global.process &&
      global.process.versions &&
      global.process.versions.electron
    );

    const hasElectronUserAgent = Boolean(
      global.navigator &&
      /Electron/i.test(global.navigator.userAgent || "")
    );

    const hasElectronBridge = Boolean(
      global.electronAPI ||
      global.api ||
      global.preloadAPI
    );

    return hasElectronProcess || hasElectronUserAgent || hasElectronBridge;
  }

  function detectRuntimeMode() {
    if (isElectronRuntime()) {
      return "desktop";
    }

    return "web";
  }

  function createEmptyConnection(extra) {
    const emptyConnection = {
      clientId: "",
      clientSecret: "",

      clientIdWeb: "",
      clientSecretWeb: "",

      clientIdDesktop: "",
      clientSecretDesktop: "",

      activeCredentialType: detectRuntimeMode(),
      runtimeMode: detectRuntimeMode(),
      calendarId: CONFIG.DEFAULT_CALENDAR_ID,

      savedAt: "",
      lastAccountEmail: "",
      lastPrimaryCalendarId: "",
      lastConnectedAt: "",
      lastEventsReadAt: "",
      lastCreatedEventId: "",
      lastCreatedEventHtmlLink: "",

      fallbackUsed: false
    };

    return {
      ...emptyConnection,
      ...(extra || {})
    };
  }

  function safeParseJson(raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function resolveActiveCredentials(connection) {
    const safeConnection = connection && typeof connection === "object"
      ? connection
      : {};

    const runtimeMode = detectRuntimeMode();

    const legacyClientId = normalizeText(safeConnection.clientId);
    const legacyClientSecret = normalizeText(safeConnection.clientSecret);

    const clientIdWeb = normalizeText(safeConnection.clientIdWeb);
    const clientSecretWeb = normalizeText(safeConnection.clientSecretWeb);

    const clientIdDesktop = normalizeText(safeConnection.clientIdDesktop);
    const clientSecretDesktop = normalizeText(safeConnection.clientSecretDesktop);

    if (runtimeMode === "desktop") {
      if (clientIdDesktop || clientSecretDesktop) {
        return {
          clientId: clientIdDesktop,
          clientSecret: clientSecretDesktop,
          activeCredentialType: "desktop",
          runtimeMode,
          fallbackUsed: false
        };
      }

      if (clientIdWeb || clientSecretWeb) {
        return {
          clientId: clientIdWeb,
          clientSecret: clientSecretWeb,
          activeCredentialType: "web",
          runtimeMode,
          fallbackUsed: true
        };
      }

      return {
        clientId: legacyClientId,
        clientSecret: legacyClientSecret,
        activeCredentialType: "legacy",
        runtimeMode,
        fallbackUsed: Boolean(legacyClientId || legacyClientSecret)
      };
    }

    if (clientIdWeb || clientSecretWeb) {
      return {
        clientId: clientIdWeb,
        clientSecret: clientSecretWeb,
        activeCredentialType: "web",
        runtimeMode,
        fallbackUsed: false
      };
    }

    if (clientIdDesktop || clientSecretDesktop) {
      return {
        clientId: clientIdDesktop,
        clientSecret: clientSecretDesktop,
        activeCredentialType: "desktop",
        runtimeMode,
        fallbackUsed: true
      };
    }

    return {
      clientId: legacyClientId,
      clientSecret: legacyClientSecret,
      activeCredentialType: "legacy",
      runtimeMode,
      fallbackUsed: Boolean(legacyClientId || legacyClientSecret)
    };
  }

  function normalizeConnection(connection) {
    const safeConnection = connection && typeof connection === "object"
      ? connection
      : {};

    const legacyClientId = normalizeText(safeConnection.clientId);
    const legacyClientSecret = normalizeText(safeConnection.clientSecret);

    let clientIdWeb = normalizeText(safeConnection.clientIdWeb);
    let clientSecretWeb = normalizeText(safeConnection.clientSecretWeb);

    let clientIdDesktop = normalizeText(safeConnection.clientIdDesktop);
    let clientSecretDesktop = normalizeText(safeConnection.clientSecretDesktop);

    if (!clientIdWeb && !clientIdDesktop && legacyClientId) {
      clientIdWeb = legacyClientId;
    }

    if (!clientSecretWeb && !clientSecretDesktop && legacyClientSecret) {
      clientSecretWeb = legacyClientSecret;
    }

    const active = resolveActiveCredentials({
      clientId: legacyClientId,
      clientSecret: legacyClientSecret,
      clientIdWeb,
      clientSecretWeb,
      clientIdDesktop,
      clientSecretDesktop
    });

    return {
      clientId: active.clientId,
      clientSecret: active.clientSecret,

      clientIdWeb,
      clientSecretWeb,

      clientIdDesktop,
      clientSecretDesktop,

      activeCredentialType: active.activeCredentialType,
      runtimeMode: active.runtimeMode,
      fallbackUsed: active.fallbackUsed,

      calendarId: normalizeCalendarId(safeConnection.calendarId),
      savedAt: normalizeText(safeConnection.savedAt),

      lastAccountEmail: normalizeText(safeConnection.lastAccountEmail),
      lastPrimaryCalendarId: normalizeText(safeConnection.lastPrimaryCalendarId),
      lastConnectedAt: normalizeText(safeConnection.lastConnectedAt),
      lastEventsReadAt: normalizeText(safeConnection.lastEventsReadAt),
      lastCreatedEventId: normalizeText(safeConnection.lastCreatedEventId),
      lastCreatedEventHtmlLink: normalizeText(safeConnection.lastCreatedEventHtmlLink)
    };
  }

  function readConnection() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return createEmptyConnection();
      }

      const parsed = safeParseJson(raw);

      if (!parsed || typeof parsed !== "object") {
        return createEmptyConnection({
          error: "La configuración guardada no tiene un formato válido."
        });
      }

      return normalizeConnection(parsed);
    } catch (error) {
      return createEmptyConnection({
        error: "No se pudo leer la configuración guardada."
      });
    }
  }

  function writeConnection(connection) {
    const safeConnection = normalizeConnection(connection);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConnection));

    return safeConnection;
  }

  function validateActiveConnection(connection) {
    if (!connection.clientId) {
      if (connection.runtimeMode === "desktop") {
        throw new Error(
          "Falta el Google OAuth Client ID Escritorio. Si estás probando en navegador, usa la clave Web."
        );
      }

      throw new Error(
        "Falta el Google OAuth Client ID Web. Si estás dentro de Electron, usa la clave Escritorio."
      );
    }

    if (!connection.clientSecret) {
      if (connection.runtimeMode === "desktop") {
        throw new Error(
          "Falta el Google OAuth Client Secret Escritorio. Si estás probando en navegador, usa el Secret Web."
        );
      }

      throw new Error(
        "Falta el Google OAuth Client Secret Web. Si estás dentro de Electron, usa el Secret Escritorio."
      );
    }

    if (!connection.calendarId) {
      throw new Error("Falta el Calendar ID.");
    }
  }

  function saveConnection(connection) {
    const current = readConnection();

    const safeConnection = normalizeConnection({
      ...current,
      ...connection,
      savedAt: new Date().toISOString()
    });

    validateActiveConnection(safeConnection);

    return writeConnection(safeConnection);
  }

  function saveConnectedAccount(params) {
    const current = readConnection();

    const updated = {
      ...current,
      lastAccountEmail: normalizeText(params.accountEmail),
      lastPrimaryCalendarId: normalizeText(params.primaryCalendarId),
      lastConnectedAt: new Date().toISOString()
    };

    return writeConnection(updated);
  }

  function saveLastEventsRead(params) {
    const current = readConnection();

    const updated = {
      ...current,
      lastEventsReadAt: normalizeText(params.readAt) || new Date().toISOString()
    };

    return writeConnection(updated);
  }

  function saveCreatedEvent(params) {
    const current = readConnection();

    const updated = {
      ...current,
      lastCreatedEventId: normalizeText(params.eventId),
      lastCreatedEventHtmlLink: normalizeText(params.htmlLink)
    };

    return writeConnection(updated);
  }

  function clearConnection() {
    localStorage.removeItem(STORAGE_KEY);

    return createEmptyConnection();
  }

  function hasConnection() {
    const connection = readConnection();

    return Boolean(
      connection.clientId &&
      connection.clientSecret &&
      connection.calendarId
    );
  }

  function getSafeConnectionStatus() {
    const connection = readConnection();

    return {
      runtimeMode: connection.runtimeMode,
      activeCredentialType: connection.activeCredentialType,
      fallbackUsed: Boolean(connection.fallbackUsed),

      activeClientIdSaved: Boolean(connection.clientId),
      activeClientIdMasked: maskValue(connection.clientId),

      activeClientSecretSaved: Boolean(connection.clientSecret),
      activeClientSecretMasked: maskValue(connection.clientSecret),

      clientIdWebSaved: Boolean(connection.clientIdWeb),
      clientIdWebMasked: maskValue(connection.clientIdWeb),

      clientSecretWebSaved: Boolean(connection.clientSecretWeb),
      clientSecretWebMasked: maskValue(connection.clientSecretWeb),

      clientIdDesktopSaved: Boolean(connection.clientIdDesktop),
      clientIdDesktopMasked: maskValue(connection.clientIdDesktop),

      clientSecretDesktopSaved: Boolean(connection.clientSecretDesktop),
      clientSecretDesktopMasked: maskValue(connection.clientSecretDesktop),

      calendarId: connection.calendarId,
      savedAt: connection.savedAt,
      lastAccountEmail: connection.lastAccountEmail,
      lastPrimaryCalendarId: connection.lastPrimaryCalendarId,
      lastConnectedAt: connection.lastConnectedAt,
      lastEventsReadAt: connection.lastEventsReadAt,
      lastCreatedEventId: connection.lastCreatedEventId,
      lastCreatedEventHtmlLink: connection.lastCreatedEventHtmlLink
    };
  }

  GC.Storage = {
    readConnection,
    saveConnection,
    saveConnectedAccount,
    saveLastEventsRead,
    saveCreatedEvent,
    clearConnection,
    hasConnection,
    getSafeConnectionStatus,
    detectRuntimeMode,
    resolveActiveCredentials
  };
})(window);