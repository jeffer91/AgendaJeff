/*
  Nombre completo: tl-storage.js
  Ruta: telegram/js/tl-storage.js
  Función:
    - Guardar y leer la conexión de Telegram desde localStorage.
    - Evitar que la pantalla principal maneje directamente localStorage.
  Se conecta con:
    - tl-config.js
    - tl-app.js
*/

(function initTlStorage(global) {
  "use strict";

  const TL = global.TL;
  const STORAGE_KEY = TL.CONFIG.STORAGE_KEY;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function readConnection() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          botToken: "",
          chatId: "",
          savedAt: ""
        };
      }

      const parsed = JSON.parse(raw);

      return {
        botToken: normalizeText(parsed.botToken),
        chatId: normalizeText(parsed.chatId),
        savedAt: normalizeText(parsed.savedAt)
      };
    } catch (error) {
      return {
        botToken: "",
        chatId: "",
        savedAt: "",
        error: "No se pudo leer la conexión guardada."
      };
    }
  }

  function saveConnection(connection) {
    const safeConnection = {
      botToken: normalizeText(connection.botToken),
      chatId: normalizeText(connection.chatId),
      savedAt: new Date().toISOString()
    };

    if (!safeConnection.botToken) {
      throw new Error("Falta el Bot Token.");
    }

    if (!safeConnection.chatId) {
      throw new Error("Falta el Chat ID.");
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConnection));

    return safeConnection;
  }

  function clearConnection() {
    localStorage.removeItem(STORAGE_KEY);

    return {
      botToken: "",
      chatId: "",
      savedAt: ""
    };
  }

  TL.Storage = {
    readConnection,
    saveConnection,
    clearConnection
  };
})(window);