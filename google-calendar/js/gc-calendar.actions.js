/*
  Nombre completo: gc-calendar.actions.js
  Ruta: google-calendar/js/gc-calendar.actions.js

  Función:
    - Maneja acciones de calendario permitidas para la pantalla Google Calendar.
    - Probar conexión sin crear eventos.
    - Leer próximos eventos.
    - Bloquear cualquier creación de eventos desde esta pantalla.

  Regla funcional:
    - Los eventos solo se crean desde Agendador o Carga Masiva.
*/

(function initGcCalendarActions(global) {
  "use strict";

  const GC = global.GC = global.GC || {};
  const CONFIG = GC.CONFIG;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function getCalendarIdForError(connection) {
    const safeConnection = connection || {};
    const inputConnection = GC.UI.readConnectionFromInputs();

    return safeConnection.calendarId ||
      GC.ConnectionActions.normalizeCalendarId(inputConnection.calendarId);
  }

  async function saveErrorStatus(error, connection) {
    return GC.FirebaseService.saveGoogleCalendarErrorStatus({
      message: error.message,
      calendarId: getCalendarIdForError(connection)
    });
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

  async function testConnection() {
    GC.UI.setBusy(true);
    GC.UI.setStatus("loading", "Probando");

    let connection = GC.ConnectionActions.createConnectionDraft();

    try {
      connection = GC.Storage.saveConnection(GC.UI.readConnectionFromInputs());
      await GC.ConnectionActions.saveConnectionToFirebase(connection);

      if (!connection.clientId || !connection.calendarId) {
        throw new Error("Primero guarda la configuración de Google Calendar.");
      }

      const reusedExistingToken = GC.TokenService.hasValidToken();
      const token = await GC.TokenService.ensureToken(connection);

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

      const firebasePayload = await GC.FirebaseService.saveGoogleCalendarConnectedStatus({
        calendarId: connection.calendarId,
        accountEmail,
        primaryCalendarId: normalizeText(primaryCalendar.id),
        calendarSummary: normalizeText(configuredCalendar.summary),
        timeZone: normalizeText(configuredCalendar.timeZone)
      });

      GC.UI.setStatus("ok", "Conectado");

      GC.UI.setOutput({
        ok: true,
        message: "Google Calendar conectado correctamente. No se creó ningún evento desde esta pantalla.",
        firestorePath: "conexiones/googleCalendar",
        runtimeMode: connection.runtimeMode,
        activeCredentialType: connection.activeCredentialType,
        fallbackUsed: Boolean(connection.fallbackUsed),
        calendarId: connection.calendarId,
        token: {
          reused: reusedExistingToken,
          savedInFirebase: false,
          savedInLocalStorage: false,
          scope: token.scope,
          issuedAt: token.issuedAt,
          expiresIn: token.expiresIn
        },
        calendar: cleanCalendarForOutput(configuredCalendar),
        primaryCalendar: cleanCalendarForOutput(primaryCalendar),
        firebase: firebasePayload,
        rule: "Los eventos solo se crean desde Agendador o Carga Masiva."
      });
    } catch (error) {
      try {
        await saveErrorStatus(error, connection);
      } catch (firebaseError) {
        GC.UI.setStatus("error", "Error");
        GC.UI.setOutput({
          ok: false,
          message: error.message,
          firebaseError: firebaseError.message,
          help: "La prueba falló y además Firebase no pudo guardar el error."
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
        firestorePath: "conexiones/googleCalendar"
      });
    } finally {
      GC.UI.setBusy(false);
    }
  }

  async function readUpcomingEvents() {
    GC.UI.setBusy(true);
    GC.UI.setStatus("loading", "Leyendo");

    let connection = GC.ConnectionActions.createConnectionDraft();

    try {
      connection = GC.Storage.saveConnection(GC.UI.readConnectionFromInputs());

      await GC.ConnectionActions.saveConnectionToFirebase(connection);

      const token = await GC.TokenService.ensureToken(connection);

      const payload = await GC.GoogleApi.listUpcomingEvents({
        accessToken: token.accessToken,
        calendarId: connection.calendarId,
        maxResults: CONFIG.MAX_EVENTS_TO_READ
      });

      const events = GC.EventService.normalizeGoogleEventsList(payload);
      const eventsSummary = GC.EventService.summarizeEvents(events);

      GC.Storage.saveLastEventsRead({
        readAt: new Date().toISOString()
      });

      const firebasePayload =
        await GC.FirebaseService.saveGoogleCalendarEventsReadStatus({
          calendarId: connection.calendarId,
          eventsCount: eventsSummary.length,
          events: eventsSummary
        });

      GC.UI.setStatus("ok", "Eventos leídos");

      GC.UI.setOutput({
        ok: true,
        message: "Próximos eventos leídos correctamente. No se creó ningún evento.",
        firestorePath: "conexiones/googleCalendar",
        runtimeMode: connection.runtimeMode,
        activeCredentialType: connection.activeCredentialType,
        calendarId: connection.calendarId,
        count: eventsSummary.length,
        events: eventsSummary,
        firebase: firebasePayload
      });
    } catch (error) {
      try {
        await saveErrorStatus(error, connection);
      } catch (firebaseError) {
        GC.UI.setStatus("error", "Error");
        GC.UI.setOutput({
          ok: false,
          message: error.message,
          firebaseError: firebaseError.message
        });
        return;
      }

      GC.UI.setStatus("error", "Error");
      GC.UI.setOutput({
        ok: false,
        message: error.message,
        runtimeMode: connection.runtimeMode,
        activeCredentialType: connection.activeCredentialType,
        firestorePath: "conexiones/googleCalendar"
      });
    } finally {
      GC.UI.setBusy(false);
    }
  }

  async function blockEventCreationFromModule(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    GC.UI.setStatus("error", "Bloqueado");
    GC.UI.setOutput({
      ok: false,
      blocked: true,
      message: "La creación de eventos desde Google Calendar está bloqueada.",
      rule: "Crea eventos únicamente desde Agendador o Carga Masiva."
    });
  }

  GC.CalendarActions = {
    testConnection,
    readUpcomingEvents,
    blockEventCreationFromModule,
    createTestEvent: blockEventCreationFromModule
  };
})(window);
