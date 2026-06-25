/*
  Nombre completo: tl-firebase-read.js
  Ruta: modulos/telegram/firebase/tl-firebase-read.js

  Función:
    - Leer desde Firestore la conexión del módulo Telegram.
    - Normalizar los datos recibidos desde Firebase.
    - Reportar si el documento existe o no existe.
    - No usar localStorage ni Telegram API; este archivo solo lee Firebase.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/tl-normalize.js
    - modulos/telegram/firebase/tl-firebase-init.js
    - modulos/telegram/connection/tl-connection-read.js
    - modulos/telegram/diagnostic/tl-diagnostic-firebase.js
*/

(function initTelegramFirebaseRead(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const firebaseLayer = telegram.Firebase = telegram.Firebase || {};

  function getConfig() {
    return telegram.CONFIG || {};
  }

  function getUtils() {
    return telegram.Utils || {};
  }

  function getCreateResult() {
    if (typeof telegram.createResult === "function") {
      return telegram.createResult;
    }

    return function fallbackCreateResult(payload) {
      const data = payload && typeof payload === "object" ? payload : {};

      return {
        ok: Boolean(data.ok),
        status: data.status || (data.ok ? "ready" : "error"),
        action: data.action || "read",
        source: data.source || "firebase",
        message: data.message || "",
        file: data.file || "modulos/telegram/firebase/tl-firebase-read.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function normalizeFirebaseConnection(rawData) {
    const config = getConfig();
    const utils = getUtils();
    const normalize = utils.Normalize || {};
    const source = config.source ? config.source.FIREBASE : "firebase";
    const data = rawData && typeof rawData === "object" ? rawData : {};

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(data, {
        source
      });
    }

    return {
      ...data,
      source
    };
  }

  async function readFirebaseConnection() {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.FIREBASE_READ : "modulos/telegram/firebase/tl-firebase-read.js";
    const action = config.action ? config.action.READ : "read";
    const source = config.source ? config.source.FIREBASE : "firebase";
    const checkedAt = new Date().toISOString();

    if (!firebaseLayer.getTelegramDocRef || typeof firebaseLayer.getTelegramDocRef !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No está disponible getTelegramDocRef. Revisa tl-firebase-init.js.",
        error: {
          message: "Falta inicializador Firebase.",
          file: config.fileHints ? config.fileHints.FIREBASE_INIT : "modulos/telegram/firebase/tl-firebase-init.js"
        },
        checkedAt
      });
    }

    const refResult = firebaseLayer.getTelegramDocRef();

    if (!refResult.ok || !refResult.ref) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No se pudo obtener la referencia del documento Telegram en Firebase.",
        error: refResult.initResult ? refResult.initResult.error : null,
        data: {
          collection: refResult.collection,
          document: refResult.document,
          initResult: refResult.initResult
        },
        checkedAt
      });
    }

    try {
      const snapshot = await refResult.ref.get();
      const exists = Boolean(snapshot && snapshot.exists);

      if (!exists) {
        return createResult({
          ok: false,
          status: config.status ? config.status.IDLE : "idle",
          action,
          source,
          file,
          message: "El documento Telegram no existe todavía en Firebase.",
          data: {
            exists: false,
            collection: refResult.collection,
            document: refResult.document,
            connection: null
          },
          checkedAt
        });
      }

      const rawData = snapshot.data() || {};
      const connection = normalizeFirebaseConnection({
        ...rawData,
        firebaseConnectionOk: true,
        lastCheckedAt: checkedAt
      });

      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action,
        source,
        file,
        message: "Conexión Telegram leída correctamente desde Firebase.",
        data: {
          exists: true,
          collection: refResult.collection,
          document: refResult.document,
          rawData,
          connection
        },
        checkedAt
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No se pudo leer la conexión Telegram desde Firebase.",
        error: {
          message: error && error.message ? error.message : "Error desconocido leyendo Firebase.",
          file
        },
        data: {
          collection: refResult.collection,
          document: refResult.document
        },
        checkedAt
      });
    }
  }

  firebaseLayer.readFirebaseConnection = readFirebaseConnection;
})(window);
