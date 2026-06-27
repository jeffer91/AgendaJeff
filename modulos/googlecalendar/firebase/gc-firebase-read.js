/*
  Nombre completo: gc-firebase-read.js
  Ruta: modulos/googlecalendar/firebase/gc-firebase-read.js

  Función:
    - Leer desde Firestore el documento conexiones/googleCalendar.
    - Normalizar los datos recibidos desde Firebase.
    - Reportar si el documento existe o no existe.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/utils/gc-normalize.js
    - modulos/googlecalendar/firebase/gc-firebase-init.js
*/

(function initGoogleCalendarFirebaseRead(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const firebaseLayer = googleCalendar.Firebase = googleCalendar.Firebase || {};

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
            source: data.source || "firebase",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/firebase/gc-firebase-read.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  function normalizeFirebaseConnection(rawData) {
    const config = getConfig();
    const normalize = googleCalendar.Utils && googleCalendar.Utils.Normalize ? googleCalendar.Utils.Normalize : {};
    const source = config.source ? config.source.FIREBASE : "firebase";
    const data = rawData && typeof rawData === "object" ? rawData : {};

    if (typeof normalize.normalizeConnection === "function") {
      return normalize.normalizeConnection(data, { source });
    }

    return { ...data, source };
  }

  async function readFirebaseConnection() {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = "modulos/googlecalendar/firebase/gc-firebase-read.js";
    const checkedAt = new Date().toISOString();

    if (!firebaseLayer.getGoogleCalendarDocRef || typeof firebaseLayer.getGoogleCalendarDocRef !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "No está disponible getGoogleCalendarDocRef. Revisa gc-firebase-init.js.",
        error: {
          message: "Falta inicializador Firebase.",
          file: "modulos/googlecalendar/firebase/gc-firebase-init.js"
        },
        checkedAt
      });
    }

    const refResult = firebaseLayer.getGoogleCalendarDocRef();

    if (!refResult.ok || !refResult.ref) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "No se pudo obtener la referencia de Google Calendar en Firebase.",
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
          action: config.action ? config.action.READ : "read",
          source: config.source ? config.source.FIREBASE : "firebase",
          file,
          message: "El documento googleCalendar no existe todavía en Firebase.",
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
        firebaseConexionOk: true,
        lastCheckedAt: checkedAt
      });

      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "Conexión Google Calendar leída correctamente desde Firebase.",
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
        action: config.action ? config.action.READ : "read",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "No se pudo leer Google Calendar desde Firebase.",
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
