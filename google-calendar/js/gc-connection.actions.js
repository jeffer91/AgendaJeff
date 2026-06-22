/*
  Nombre completo: gc-connection.actions.js
  Ruta: google-calendar/js/gc-connection.actions.js
  Función:
    - Maneja guardar configuración de Google Calendar.
    - Maneja cargar configuración guardada.
    - Maneja conectar Google Calendar.
    - Maneja borrar conexión local y Firebase.
*/

(function initGcConnectionActions(global) {
  "use strict";

  const GC = global.GC = global.GC || {};
  const CONFIG = GC.CONFIG;

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

  function createConnectionDraft() {
    return {
      clientId: "",
      clientSecret: "",
      clientIdWeb: "",
      clientSecretWeb: "",
      clientIdDesktop: "",
      clientSecretDesktop: "",
      activeCredentialType: "",
      runtimeMode: GC.Storage.detectRuntimeMode(),
      calendarId: CONFIG.DEFAULT_CALENDAR_ID
    };
  }

  function guessAccountEmail(primaryCalendar, configuredCalendar) {
    const primaryId = normalizeText(primaryCalendar && primaryCalendar.id);
    const configuredId = normalizeText(configuredCalendar && configuredCalendar.id);

    if (primaryId.includes("@")) {
      return primaryId;
    }

    if (configuredId.includes("@")) {
      return configuredId;
    }

    return "";
  }

  function cleanCalendarForOutput(calendar) {
    const safeCalendar = calendar && typeof calendar === "object" ? calendar : {};

    return {
      id: normalizeText(safeCalendar.id),
      summary: normalizeText(safeCalendar.summary),
      description: normalizeText(safeCalendar.description),
      timeZone: normalizeText(safeCalendar.timeZone)
    };
  }

  function safeLocalConnectionForOutput(connection) {
    const safeConnection = connection || {};

    return {
      runtimeMode: safeConnection.runtimeMode || "",
      activeCredentialType: safeConnection.activeCredentialType || "",
      fallbackUsed: Boolean(safeConnection.fallbackUsed),

      activeClientIdSaved: Boolean(safeConnection.clientId),
      activeClientSecretSaved: Boolean(safeConnection.clientSecret),

      clientIdWebSaved: Boolean(safeConnection.clientIdWeb),
      clientSecretWebSaved: Boolean(safeConnection.clientSecretWeb),

      clientIdDesktopSaved: Boolean(safeConnection.clientIdDesktop),
      clientSecretDesktopSaved: Boolean(safeConnection.clientSecretDesktop),

      calendarId: safeConnection.calendarId,
      savedAt: safeConnection.savedAt || null,
      lastAccountEmail: safeConnection.lastAccountEmail || "",
      lastConnectedAt: safeConnection.lastConnectedAt || ""
    };
  }

  async function saveConnectionToFirebase(connection) {
    return GC.FirebaseService.saveGoogleCalendarSavedConnectionStatus({
      clientId: connection.clientId,
      clientSecret: connection.clientSecret,

      clientIdWeb: connection.clientIdWeb,
      clientSecretWeb: connection.clientSecretWeb,

      clientIdDesktop: connection.clientIdDesktop,
      clientSecretDesktop: connection.clientSecretDesktop,

      activeCredentialType: connection.activeCredentialType,
      runtimeMode: connection.runtimeMode,
      fallbackUsed: Boolean(connection.fallbackUsed),

      calendarId: connection.calendarId,
      savedAt: connection.savedAt
    });
  }

  function getCalendarIdForError(connection) {
    const safeConnection = connection || {};
    const inputConnection = GC.UI.readConnectionFromInputs();

    return safeConnection.calendarId || normalizeCalendarId(inputConnection.calendarId);
  }

  async function loadSavedConnection() {
    const connection = GC.Storage.readConnection();

    GC.UI.writeConnectionToInputs(connection);

    try {
      await GC.FirebaseService.checkFirebaseConnection();
    } catch (error) {
      GC.UI.setStatus("error", "Firebase error");
      GC.UI.setOutput({
        ok: false,
        message: "Google Calendar puede funcionar, pero Firebase no inicializó.",
        error: error.message,
        local: safeLocalConnectionForOutput(connection)
      });
      return;
    }

    if (connection.clientId && connection.clientSecret && connection.calendarId) {
      try {
        const firebaseStatus = await GC.FirebaseService.readGoogleCalendarConnectionStatus();

        GC.UI.setStatus("idle", "Guardado local");

        GC.UI.setOutput({
          ok: true,
          message: "Configuración de Google Calendar cargada desde localStorage.",
          local: safeLocalConnectionForOutput(connection),
          firebase: firebaseStatus,
          note: "Usa Conectar para autorizar Google. Después usa Probar para crear un evento real en el siguiente minuto."
        });
      } catch (error) {
        GC.UI.setStatus("idle", "Guardado local");

        GC.UI.setOutput({
          ok: true,
          message: "Configuración cargada localmente, pero no se pudo leer Firebase.",
          local: safeLocalConnectionForOutput(connection),
          firebaseError: error.message
        });
      }

      return;
    }

    GC.UI.setStatus("idle", "Sin probar");

    GC.UI.setOutput({
      ok: true,
      message: "Esperando acción.",
      runtimeMode: connection.runtimeMode || GC.Storage.detectRuntimeMode(),
      firebasePath: "conexiones/googleCalendar"
    });
  }

  async function saveConnection(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    GC.UI.setBusy(true);
    GC.UI.setStatus("loading", "Guardando");

    try {
      const connection = GC.Storage.saveConnection(GC.UI.readConnectionFromInputs());
      const firebasePayload = await saveConnectionToFirebase(connection);

      GC.UI.setStatus("idle", "Guardado");

      GC.UI.setOutput({
        ok: true,
        message: "Configuración guardada en localStorage y Cloud Firestore.",
        firestorePath: "conexiones/googleCalendar",
        savedAt: connection.savedAt,
        local: safeLocalConnectionForOutput(connection),
        firebase: firebasePayload,
        note: "Ahora usa Conectar o Probar. Probar puede pedir autorización si no hay token activo."
      });
    } catch (error) {
      GC.UI.setStatus("error", "Error");

      GC.UI.setOutput({
        ok: false,
        message: error.message
      });
    } finally {
      GC.UI.setBusy(false);
    }
  }

  async function connectGoogleCalendar() {
    GC.UI.setBusy(true);
    GC.UI.setStatus("loading", "Conectando");

    let connection = createConnectionDraft();

    try {
      connection = GC.Storage.saveConnection(GC.UI.readConnectionFromInputs());

      const savedFirebasePayload = await saveConnectionToFirebase(connection);

      const token = await GC.TokenService.requestToken(connection, "consent");

      const primaryCalendar = await GC.GoogleApi.getCalendar({
        accessToken: token.accessToken,
        calendarId: CONFIG.DEFAULT_CALENDAR_ID
      });

      const configuredCalendar = await GC.GoogleApi.getCalendar({
        accessToken: token.accessToken,
        calendarId: connection.calendarId
      });

      const accountEmail = guessAccountEmail(primaryCalendar, configuredCalendar);

      GC.Storage.saveConnectedAccount({
        accountEmail,
        primaryCalendarId: normalizeText(primaryCalendar.id)
      });

      const connectedFirebasePayload =
        await GC.FirebaseService.saveGoogleCalendarConnectedStatus({
          calendarId: connection.calendarId,
          accountEmail,
          primaryCalendarId: normalizeText(primaryCalendar.id),
          calendarSummary: normalizeText(configuredCalendar.summary),
          timeZone: normalizeText(configuredCalendar.timeZone)
        });

      GC.UI.setStatus("ok", "Conectado");

      GC.UI.setOutput({
        ok: true,
        message: "Google Calendar quedó conectado. Ahora presiona Probar para crear un evento automático en el siguiente minuto.",
        firestorePath: "conexiones/googleCalendar",
        savedConfigFirebase: savedFirebasePayload,
        runtimeMode: connection.runtimeMode,
        activeCredentialType: connection.activeCredentialType,
        fallbackUsed: Boolean(connection.fallbackUsed),
        token: {
          received: true,
          savedInFirebase: false,
          savedInLocalStorage: false,
          scope: token.scope,
          issuedAt: token.issuedAt,
          expiresIn: token.expiresIn
        },
        calendar: cleanCalendarForOutput(configuredCalendar),
        primaryCalendar: cleanCalendarForOutput(primaryCalendar),
        firebase: connectedFirebasePayload
      });
    } catch (error) {
      try {
        await GC.FirebaseService.saveGoogleCalendarErrorStatus({
          message: error.message,
          calendarId: getCalendarIdForError(connection)
        });
      } catch (firebaseError) {
        GC.UI.setStatus("error", "Error");

        GC.UI.setOutput({
          ok: false,
          message: error.message,
          firebaseError: firebaseError.message,
          help: "Google Calendar falló y además Firebase no pudo guardar el error."
        });

        return;
      }

      GC.UI.setStatus("error", "Error");

      GC.UI.setOutput({
        ok: false,
        message: error.message,
        runtimeMode: connection.runtimeMode,
        activeCredentialType: connection.activeCredentialType,
        fallbackUsed: Boolean(connection.fallbackUsed),
        firestorePath: "conexiones/googleCalendar",
        help: "Revisa que el Client ID y Client Secret correctos estén guardados para este entorno, que Calendar API esté habilitada y que el origen esté autorizado si estás en navegador."
      });
    } finally {
      GC.UI.setBusy(false);
    }
  }

  async function clearConnection() {
    GC.UI.setBusy(true);
    GC.UI.setStatus("loading", "Borrando");

    try {
      GC.TokenService.clearToken();

      GC.Storage.clearConnection();
      GC.UI.clearConnectionInputs();

      const firebasePayload =
        await GC.FirebaseService.saveGoogleCalendarDisconnectedStatus();

      GC.UI.setStatus("idle", "Desconectado");

      GC.UI.setOutput({
        ok: true,
        message: "Datos de Google Calendar borrados del navegador y Firebase actualizado.",
        firestorePath: "conexiones/googleCalendar",
        firebase: firebasePayload
      });
    } catch (error) {
      GC.UI.setStatus("error", "Error");

      GC.UI.setOutput({
        ok: false,
        message: error.message
      });
    } finally {
      GC.UI.setBusy(false);
    }
  }

  GC.ConnectionActions = {
    normalizeText,
    normalizeCalendarId,
    createConnectionDraft,
    safeLocalConnectionForOutput,
    cleanCalendarForOutput,
    guessAccountEmail,
    saveConnectionToFirebase,
    loadSavedConnection,
    saveConnection,
    connectGoogleCalendar,
    clearConnection
  };
})(window);