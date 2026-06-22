/*
  Nombre completo: mc-config.js
  Ruta: microsoft-calendar/js/mc-config.js
  Función:
    - Centralizar constantes del módulo Microsoft Calendar.
    - Crear el namespace global window.MC.
    - Definir nombres limpios para Firestore.
    - Definir configuración base de Microsoft Identity y Microsoft Graph.
    - Preparar estructura para dos cuentas Microsoft.
  Se conecta con:
    - mc-storage.js
    - mc-microsoft-api.js
    - mc-event.service.js
    - mc-firebase-config.js
    - mc-firebase.service.js
    - mc-ui.js
    - mc-token.service.js
    - mc-connection.actions.js
    - mc-calendar.actions.js
    - mc-bindings.js

  Importante:
    - Este archivo NO usa window.GC.
    - Este archivo NO usa window.TL.
    - Este archivo crea y usa window.MC.
*/

(function initMcConfig(global) {
  "use strict";

  const MC = global.MC = global.MC || {};

  const PROVIDER = "microsoftCalendar";

  const FIRESTORE_COLLECTION = "conexiones";
  const FIRESTORE_DOCUMENT = "microsoftCalendar";

  const STORAGE_KEY = "aj-microsoft-calendar-connection-v1";
  const LAST_ACTIVE_ACCOUNT_KEY = "aj-microsoft-calendar-last-active-account-v1";

  const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

  const DEFAULT_TIME_ZONE = "America/Guayaquil";
  const DEFAULT_EVENT_DURATION_MINUTES = 30;
  const MAX_EVENTS_TO_READ = 10;

  const ACCOUNT_SLOTS = ["account1", "account2"];

  const TENANT_MODES = {
    COMMON: "common",
    CONSUMERS: "consumers",
    ORGANIZATIONS: "organizations",
    TENANT: "tenant"
  };

  const REDIRECT_TYPES = {
    WEB: "web",
    DESKTOP: "desktop"
  };

  const CALENDAR_MODES = {
    DEFAULT: "default",
    SPECIFIC: "specific"
  };

  const DEFAULT_SCOPES = [
    "User.Read",
    "Calendars.ReadWrite",
    "offline_access"
  ];

  function nowIso() {
    return new Date().toISOString();
  }

  function cleanString(value) {
    return String(value || "").trim();
  }

  function safeLower(value) {
    return cleanString(value).toLowerCase();
  }

  function isPlainObject(value) {
    return Boolean(value) &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function createCurrentPageRedirectUri() {
    try {
      const location = global.location;

      if (!location || !location.origin || !location.pathname) {
        return "";
      }

      return `${location.origin}${location.pathname}`;
    } catch (error) {
      return "";
    }
  }

  function normalizeTenantMode(value) {
    const normalized = safeLower(value);

    if (
      normalized === TENANT_MODES.COMMON ||
      normalized === TENANT_MODES.CONSUMERS ||
      normalized === TENANT_MODES.ORGANIZATIONS ||
      normalized === TENANT_MODES.TENANT
    ) {
      return normalized;
    }

    return TENANT_MODES.COMMON;
  }

  function normalizeRedirectType(value) {
    const normalized = safeLower(value);

    if (
      normalized === REDIRECT_TYPES.WEB ||
      normalized === REDIRECT_TYPES.DESKTOP
    ) {
      return normalized;
    }

    return REDIRECT_TYPES.WEB;
  }

  function normalizeCalendarMode(value) {
    const normalized = safeLower(value);

    if (
      normalized === CALENDAR_MODES.DEFAULT ||
      normalized === CALENDAR_MODES.SPECIFIC
    ) {
      return normalized;
    }

    return CALENDAR_MODES.DEFAULT;
  }

  function normalizeAccountSlot(accountSlot) {
    const normalized = safeLower(accountSlot);

    if (ACCOUNT_SLOTS.includes(normalized)) {
      return normalized;
    }

    return "account1";
  }

  function getAccountLabel(accountSlot) {
    const slot = normalizeAccountSlot(accountSlot);

    if (slot === "account2") {
      return "Cuenta Microsoft 2";
    }

    return "Cuenta Microsoft 1";
  }

  function createDefaultAccount(accountSlot) {
    const slot = normalizeAccountSlot(accountSlot);

    return {
      slot,
      label: getAccountLabel(slot),
      enabled: true,
      accountEmail: "",
      calendarMode: CALENDAR_MODES.DEFAULT,
      calendarId: "",
      connected: false,
      microsoftAccountId: "",
      microsoftUsername: "",
      lastConnectedAt: "",
      lastTestAt: "",
      lastEventsReadAt: "",
      lastEventCreated: null,
      lastError: null
    };
  }

  function createDefaultAccounts() {
    return {
      account1: createDefaultAccount("account1"),
      account2: createDefaultAccount("account2")
    };
  }

  function createDefaultAppConfig() {
    const currentRedirectUri = createCurrentPageRedirectUri();

    return {
      clientId: "",
      tenantMode: TENANT_MODES.COMMON,
      tenantId: "",
      activeRedirectType: REDIRECT_TYPES.WEB,
      redirectUriWeb: currentRedirectUri,
      redirectUriDesktop: "http://localhost",
      scopes: DEFAULT_SCOPES.slice(),
      configured: false
    };
  }

  function createDefaultConnection() {
    return {
      provider: PROVIDER,
      configured: false,
      createdAt: nowIso(),
      updatedAt: "",
      app: createDefaultAppConfig(),
      accounts: createDefaultAccounts()
    };
  }

  function normalizeScopes(scopes) {
    if (!Array.isArray(scopes)) {
      return DEFAULT_SCOPES.slice();
    }

    const cleanScopes = scopes
      .map(cleanString)
      .filter(Boolean);

    if (!cleanScopes.length) {
      return DEFAULT_SCOPES.slice();
    }

    const uniqueScopes = [];

    cleanScopes.forEach((scope) => {
      if (!uniqueScopes.includes(scope)) {
        uniqueScopes.push(scope);
      }
    });

    DEFAULT_SCOPES.forEach((scope) => {
      if (!uniqueScopes.includes(scope)) {
        uniqueScopes.push(scope);
      }
    });

    return uniqueScopes;
  }

  function normalizeAppConfig(appConfig) {
    const defaults = createDefaultAppConfig();
    const source = isPlainObject(appConfig) ? appConfig : {};

    const tenantMode = normalizeTenantMode(source.tenantMode);
    const activeRedirectType = normalizeRedirectType(source.activeRedirectType);

    const clientId = cleanString(source.clientId);
    const tenantId = cleanString(source.tenantId);
    const redirectUriWeb = cleanString(source.redirectUriWeb) ||
      defaults.redirectUriWeb;
    const redirectUriDesktop = cleanString(source.redirectUriDesktop) ||
      defaults.redirectUriDesktop;

    return {
      clientId,
      tenantMode,
      tenantId,
      activeRedirectType,
      redirectUriWeb,
      redirectUriDesktop,
      scopes: normalizeScopes(source.scopes),
      configured: Boolean(clientId)
    };
  }

  function normalizeAccount(accountSlot, account) {
    const defaults = createDefaultAccount(accountSlot);
    const source = isPlainObject(account) ? account : {};
    const slot = normalizeAccountSlot(accountSlot);

    const calendarMode = normalizeCalendarMode(source.calendarMode);
    const calendarId = cleanString(source.calendarId);

    return {
      slot,
      label: cleanString(source.label) || defaults.label,
      enabled: source.enabled !== false,
      accountEmail: cleanString(source.accountEmail),
      calendarMode,
      calendarId: calendarMode === CALENDAR_MODES.SPECIFIC ? calendarId : "",
      connected: Boolean(source.connected),
      microsoftAccountId: cleanString(source.microsoftAccountId),
      microsoftUsername: cleanString(source.microsoftUsername),
      lastConnectedAt: cleanString(source.lastConnectedAt),
      lastTestAt: cleanString(source.lastTestAt),
      lastEventsReadAt: cleanString(source.lastEventsReadAt),
      lastEventCreated: source.lastEventCreated || null,
      lastError: source.lastError || null
    };
  }

  function normalizeAccounts(accounts) {
    const source = isPlainObject(accounts) ? accounts : {};

    return {
      account1: normalizeAccount("account1", source.account1),
      account2: normalizeAccount("account2", source.account2)
    };
  }

  function normalizeConnection(connection) {
    const defaults = createDefaultConnection();
    const source = isPlainObject(connection) ? connection : {};

    const app = normalizeAppConfig(source.app);
    const accounts = normalizeAccounts(source.accounts);

    return {
      provider: PROVIDER,
      configured: Boolean(app.configured),
      createdAt: cleanString(source.createdAt) || defaults.createdAt,
      updatedAt: cleanString(source.updatedAt),
      app,
      accounts
    };
  }

  function getAuthorityFromAppConfig(appConfig) {
    const app = normalizeAppConfig(appConfig);

    if (app.tenantMode === TENANT_MODES.TENANT && app.tenantId) {
      return `https://login.microsoftonline.com/${encodeURIComponent(app.tenantId)}`;
    }

    return `https://login.microsoftonline.com/${app.tenantMode}`;
  }

  function getActiveRedirectUri(appConfig) {
    const app = normalizeAppConfig(appConfig);

    if (app.activeRedirectType === REDIRECT_TYPES.DESKTOP) {
      return app.redirectUriDesktop;
    }

    return app.redirectUriWeb;
  }

  function getAccountCalendarId(account) {
    const safeAccount = normalizeAccount(
      account && account.slot ? account.slot : "account1",
      account
    );

    if (safeAccount.calendarMode === CALENDAR_MODES.SPECIFIC) {
      return safeAccount.calendarId;
    }

    return "";
  }

  function maskText(value, visibleEnd) {
    const cleanValue = cleanString(value);
    const safeVisibleEnd = Number.isFinite(Number(visibleEnd))
      ? Number(visibleEnd)
      : 4;

    if (!cleanValue) {
      return "";
    }

    if (cleanValue.length <= safeVisibleEnd) {
      return "*".repeat(cleanValue.length);
    }

    const end = cleanValue.slice(-safeVisibleEnd);
    return `${"*".repeat(Math.max(8, cleanValue.length - safeVisibleEnd))}${end}`;
  }

  function createPublicConnectionForFirebase(connection) {
    const normalized = normalizeConnection(connection);

    return {
      provider: PROVIDER,
      configured: normalized.configured,
      updatedAt: nowIso(),
      app: {
        clientId: normalized.app.clientId,
        clientIdMasked: maskText(normalized.app.clientId, 8),
        tenantMode: normalized.app.tenantMode,
        tenantId: normalized.app.tenantId,
        redirectUriWeb: normalized.app.redirectUriWeb,
        redirectUriDesktop: normalized.app.redirectUriDesktop,
        activeRedirectType: normalized.app.activeRedirectType,
        scopes: normalized.app.scopes,
        configured: normalized.app.configured
      },
      accounts: {
        account1: normalized.accounts.account1,
        account2: normalized.accounts.account2
      }
    };
  }

  MC.CONFIG = {
    PROVIDER,
    FIRESTORE_COLLECTION,
    FIRESTORE_DOCUMENT,
    FIRESTORE_PATH: `${FIRESTORE_COLLECTION}/${FIRESTORE_DOCUMENT}`,
    STORAGE_KEY,
    LAST_ACTIVE_ACCOUNT_KEY,
    GRAPH_BASE_URL,
    DEFAULT_TIME_ZONE,
    DEFAULT_EVENT_DURATION_MINUTES,
    MAX_EVENTS_TO_READ,
    ACCOUNT_SLOTS,
    TENANT_MODES,
    REDIRECT_TYPES,
    CALENDAR_MODES,
    DEFAULT_SCOPES
  };

  MC.Utils = {
    nowIso,
    cleanString,
    safeLower,
    isPlainObject,
    createCurrentPageRedirectUri,
    normalizeTenantMode,
    normalizeRedirectType,
    normalizeCalendarMode,
    normalizeAccountSlot,
    getAccountLabel,
    createDefaultAccount,
    createDefaultAccounts,
    createDefaultAppConfig,
    createDefaultConnection,
    normalizeScopes,
    normalizeAppConfig,
    normalizeAccount,
    normalizeAccounts,
    normalizeConnection,
    getAuthorityFromAppConfig,
    getActiveRedirectUri,
    getAccountCalendarId,
    maskText,
    createPublicConnectionForFirebase
  };
})(window);