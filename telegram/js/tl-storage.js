/*
  Nombre completo: tl-storage.js
  Ruta: telegram/js/tl-storage.js

  Función:
    - Guardar y leer la conexión de Telegram desde localStorage.
    - Sincronizar Bot Token y Chat ID con Electron para uso en segundo plano.
    - Evitar que la pantalla principal maneje directamente localStorage.
*/

(function initTlStorage(global) {
  "use strict";

  const TL = global.TL;
  const STORAGE_KEY = TL.CONFIG.STORAGE_KEY;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function maskValue(value) {
    const text = normalizeText(value);
    if (!text) return "";
    if (text.length <= 8) return "********";
    return `${"*".repeat(Math.max(0, text.length - 8))}${text.slice(-8)}`;
  }

  function getElectronBridge() {
    try {
      return global.AgendaJeffElectron || global.parent?.AgendaJeffElectron || global.top?.AgendaJeffElectron || null;
    } catch (_error) {
      return global.AgendaJeffElectron || null;
    }
  }

  function normalizeConnection(rawConnection) {
    const connection = rawConnection && typeof rawConnection === "object"
      ? rawConnection
      : {};

    const botToken = normalizeText(connection.botToken);
    const chatId = normalizeText(connection.chatId);

    return {
      botToken,
      chatId,
      botUsername: normalizeText(connection.botUsername || connection.username),
      enabled: Boolean(botToken && chatId),
      configured: Boolean(botToken && chatId),
      savedAt: normalizeText(connection.savedAt),
      updatedAt: normalizeText(connection.updatedAt)
    };
  }

  function syncInBackground(connection) {
    if (!connection || !connection.botToken || !connection.chatId) {
      return;
    }

    syncWithElectron(connection).catch(() => {
      // No romper lecturas locales si Electron no está disponible.
    });
  }

  function readConnection() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const connection = normalizeConnection(raw ? JSON.parse(raw) : {});
      syncInBackground(connection);
      return connection;
    } catch (_error) {
      return normalizeConnection({});
    }
  }

  async function syncWithElectron(connection) {
    const bridge = getElectronBridge();
    const normalized = normalizeConnection(connection);

    if (!bridge || !bridge.telegram || typeof bridge.telegram.sync !== "function") {
      return {
        ok: false,
        mode: "web",
        message: "Electron no está disponible para sincronizar Telegram."
      };
    }

    return bridge.telegram.sync({
      botToken: normalized.botToken,
      chatId: normalized.chatId,
      username: normalized.botUsername,
      enabled: normalized.enabled,
      configured: normalized.configured,
      updatedAt: normalized.updatedAt || nowIso()
    });
  }

  function saveConnection(connection) {
    const current = readConnection();
    const normalized = normalizeConnection({
      ...current,
      ...(connection || {}),
      savedAt: current.savedAt || nowIso(),
      updatedAt: nowIso()
    });

    if (!normalized.botToken) {
      throw new Error("Falta el Bot Token.");
    }

    if (!normalized.chatId) {
      throw new Error("Falta el Chat ID.");
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

    syncWithElectron(normalized).catch(() => {
      // No romper la pantalla si Electron no está disponible.
    });

    return normalized;
  }

  function clearConnection() {
    localStorage.removeItem(STORAGE_KEY);

    const emptyConnection = normalizeConnection({});

    syncWithElectron(emptyConnection).catch(() => {
      // No romper la pantalla si Electron no está disponible.
    });

    return emptyConnection;
  }

  function hasConnection() {
    const connection = readConnection();
    return Boolean(connection.botToken && connection.chatId);
  }

  function getSafeConnection() {
    const connection = readConnection();

    return {
      enabled: connection.enabled,
      configured: connection.configured,
      hasBotToken: Boolean(connection.botToken),
      botTokenMasked: maskValue(connection.botToken),
      hasChatId: Boolean(connection.chatId),
      chatIdMasked: maskValue(connection.chatId),
      botUsername: connection.botUsername,
      savedAt: connection.savedAt,
      updatedAt: connection.updatedAt
    };
  }

  TL.Storage = {
    normalizeText,
    nowIso,
    maskValue,
    normalizeConnection,
    readConnection,
    saveConnection,
    clearConnection,
    hasConnection,
    getSafeConnection,
    syncWithElectron
  };
})(window);
