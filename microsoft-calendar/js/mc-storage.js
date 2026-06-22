/*
  Nombre completo: mc-storage.js
  Ruta: microsoft-calendar/js/mc-storage.js
  Función:
    - Guardar configuración Microsoft Calendar en localStorage.
    - Leer configuración local.
    - Borrar configuración local.
    - Guardar estado local de cuenta 1 y cuenta 2.
    - Guardar última cuenta activa.
    - NO guarda tokens de Microsoft.
    - NO se conecta directamente con Firebase.
  Se conecta con:
    - mc-config.js
    - mc-ui.js
    - mc-connection.actions.js
    - mc-calendar.actions.js
*/

(function initMcStorage(global) {
  "use strict";

  const MC = global.MC = global.MC || {};
  const CONFIG = MC.CONFIG;
  const Utils = MC.Utils;

  function readJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);

      if (!raw) {
        return fallback;
      }

      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    global.localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function removeKey(key) {
    global.localStorage.removeItem(key);
  }

  function readConnection() {
    const rawConnection = readJson(CONFIG.STORAGE_KEY, null);
    return Utils.normalizeConnection(rawConnection);
  }

  function saveConnection(connection) {
    const normalized = Utils.normalizeConnection(connection);

    const connectionToSave = {
      ...normalized,
      updatedAt: Utils.nowIso()
    };

    return writeJson(CONFIG.STORAGE_KEY, connectionToSave);
  }

  function clearConnection() {
    removeKey(CONFIG.STORAGE_KEY);
    removeKey(CONFIG.LAST_ACTIVE_ACCOUNT_KEY);

    return Utils.createDefaultConnection();
  }

  function readLastActiveAccountSlot() {
    const stored = global.localStorage.getItem(CONFIG.LAST_ACTIVE_ACCOUNT_KEY);
    return Utils.normalizeAccountSlot(stored || "account1");
  }

  function saveLastActiveAccountSlot(accountSlot) {
    const normalized = Utils.normalizeAccountSlot(accountSlot);
    global.localStorage.setItem(CONFIG.LAST_ACTIVE_ACCOUNT_KEY, normalized);
    return normalized;
  }

  function updateConnection(mutator) {
    const current = readConnection();
    const draft = Utils.normalizeConnection(current);

    if (typeof mutator === "function") {
      mutator(draft);
    }

    return saveConnection(draft);
  }

  function updateAppConfig(appConfig) {
    return updateConnection((draft) => {
      draft.app = Utils.normalizeAppConfig({
        ...draft.app,
        ...appConfig
      });

      draft.configured = Boolean(draft.app.configured);
      draft.updatedAt = Utils.nowIso();
    });
  }

  function updateAccount(accountSlot, accountPatch) {
    const slot = Utils.normalizeAccountSlot(accountSlot);

    return updateConnection((draft) => {
      const currentAccount = draft.accounts[slot] ||
        Utils.createDefaultAccount(slot);

      draft.accounts[slot] = Utils.normalizeAccount(slot, {
        ...currentAccount,
        ...accountPatch
      });

      draft.updatedAt = Utils.nowIso();
    });
  }

  function markAccountConnected(accountSlot, payload) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const safePayload = Utils.isPlainObject(payload) ? payload : {};

    saveLastActiveAccountSlot(slot);

    return updateAccount(slot, {
      connected: true,
      accountEmail: safePayload.accountEmail,
      microsoftAccountId: safePayload.microsoftAccountId,
      microsoftUsername: safePayload.microsoftUsername,
      lastConnectedAt: Utils.nowIso(),
      lastError: null
    });
  }

  function markAccountDisconnected(accountSlot, errorMessage) {
    const slot = Utils.normalizeAccountSlot(accountSlot);

    return updateAccount(slot, {
      connected: false,
      lastError: errorMessage
        ? {
            message: Utils.cleanString(errorMessage),
            at: Utils.nowIso()
          }
        : null
    });
  }

  function saveCreatedEvent(accountSlot, eventPayload) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const safeEvent = Utils.isPlainObject(eventPayload) ? eventPayload : {};

    saveLastActiveAccountSlot(slot);

    return updateAccount(slot, {
      connected: true,
      lastTestAt: Utils.nowIso(),
      lastEventCreated: {
        id: Utils.cleanString(safeEvent.id),
        subject: Utils.cleanString(safeEvent.subject),
        webLink: Utils.cleanString(safeEvent.webLink),
        start: safeEvent.start || null,
        end: safeEvent.end || null,
        createdAt: Utils.nowIso()
      },
      lastError: null
    });
  }

  function saveLastEventsRead(accountSlot, payload) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const safePayload = Utils.isPlainObject(payload) ? payload : {};

    saveLastActiveAccountSlot(slot);

    return updateAccount(slot, {
      connected: true,
      lastEventsReadAt: Utils.nowIso(),
      lastError: null,
      lastEventsCount: Number(safePayload.count || 0)
    });
  }

  function saveAccountError(accountSlot, error) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const message = error && error.message
      ? error.message
      : String(error || "Error desconocido");

    saveLastActiveAccountSlot(slot);

    return updateAccount(slot, {
      connected: false,
      lastError: {
        message,
        at: Utils.nowIso()
      }
    });
  }

  function getAccount(accountSlot) {
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const connection = readConnection();
    return connection.accounts[slot] || Utils.createDefaultAccount(slot);
  }

  function getAppConfig() {
    const connection = readConnection();
    return connection.app;
  }

  function hasBasicAppConfig() {
    const app = getAppConfig();
    return Boolean(app.clientId && Utils.getActiveRedirectUri(app));
  }

  function hasAccountEmail(accountSlot) {
    const account = getAccount(accountSlot);
    return Boolean(account.accountEmail);
  }

  function createFirebasePublicPayload() {
    return Utils.createPublicConnectionForFirebase(readConnection());
  }

  MC.Storage = {
    readConnection,
    saveConnection,
    clearConnection,

    readLastActiveAccountSlot,
    saveLastActiveAccountSlot,

    updateConnection,
    updateAppConfig,
    updateAccount,

    markAccountConnected,
    markAccountDisconnected,
    saveCreatedEvent,
    saveLastEventsRead,
    saveAccountError,

    getAccount,
    getAppConfig,
    hasBasicAppConfig,
    hasAccountEmail,
    createFirebasePublicPayload
  };
})(window);