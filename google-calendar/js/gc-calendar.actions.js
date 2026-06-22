/*
  Nombre completo: gc-calendar.actions.js
  Ruta: google-calendar/js/gc-calendar.actions.js
  Función:
    - Maneja acciones de calendario.
    - Crea evento automático con el botón Probar.
    - Lee próximos eventos.
    - Crea evento manual de prueba.
*/

(function initGcCalendarActions(global) {
  "use strict";

  const GC = global.GC = global.GC || {};
  const CONFIG = GC.CONFIG;

  function getBrowserTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil";
    } catch (error) {
      return "America/Guayaquil";
    }
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function addMinutes(date, minutes) {
    const safeDate = new Date(date.getTime());
    safeDate.setMinutes(safeDate.getMinutes() + minutes);
    return safeDate;
  }

  function formatLocalDateTimeForGoogle(date) {
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    const hour = pad2(date.getHours());
    const minute = pad2(date.getMinutes());
    const second = pad2(date.getSeconds());

    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  function createNextMinuteDate() {
    const startDate = new Date();

    startDate.setSeconds(0, 0);
    startDate.setMinutes(startDate.getMinutes() + 1);

    return startDate;
  }

  function createAutomaticTestEventPayload() {
    const startDate = createNextMinuteDate();
    const durationMinutes = CONFIG.DEFAULT_EVENT_DURATION_MINUTES || 30;
    const endDate = addMinutes(startDate, durationMinutes);
    const timeZone = getBrowserTimeZone();

    const title = "Evento de prueba desde AgendaJeff";
    const description = [
      "Evento creado automáticamente para verificar que Google Calendar está funcionando.",
      "",
      "Origen: módulo Google Calendar de AgendaJeff.",
      "Acción: botón Probar.",
      "Este evento confirma que la app puede crear eventos reales en Google Calendar.",
      `Creado desde la app el: ${new Date().toLocaleString("es-EC")}`
    ].join("\n");

    return {
      local: {
        title,
        description,
        durationMinutes,
        timeZone,
        startLocal: formatLocalDateTimeForGoogle(startDate),
        endLocal: formatLocalDateTimeForGoogle(endDate)
      },
      googleEvent: {
        summary: title,
        description,
        start: {
          dateTime: formatLocalDateTimeForGoogle(startDate),
          timeZone
        },
        end: {
          dateTime: formatLocalDateTimeForGoogle(endDate),
          timeZone
        },
        reminders: {
          useDefault: true
        }
      }
    };
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

  async function testConnection() {
    GC.UI.setBusy(true);
    GC.UI.setStatus("loading", "Creando prueba");

    let connection = GC.ConnectionActions.createConnectionDraft();

    try {
      connection = GC.Storage.readConnection();

      if (!connection.clientId || !connection.calendarId) {
        throw new Error("Primero guarda la configuración. Luego usa Probar para crear el evento automático.");
      }

      const reusedExistingToken = GC.TokenService.hasValidToken();
      const token = await GC.TokenService.ensureToken(connection);

      const automaticTestEvent = createAutomaticTestEventPayload();

      const createdEvent = await GC.GoogleApi.insertEvent({
        accessToken: token.accessToken,
        calendarId: connection.calendarId,
        event: automaticTestEvent.googleEvent
      });

      const normalizedEvent = GC.EventService.normalizeGoogleEvent(createdEvent);

      GC.Storage.saveCreatedEvent({
        eventId: normalizedEvent.id,
        htmlLink: normalizedEvent.htmlLink
      });

      const firebasePayload =
        await GC.FirebaseService.saveGoogleCalendarEventCreatedStatus({
          calendarId: connection.calendarId,
          event: normalizedEvent
        });

      GC.UI.setStatus("ok", "Prueba creada");

      GC.UI.setOutput({
        ok: true,
        message: "Prueba correcta. Se creó un evento real en Google Calendar para el siguiente minuto.",
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
        testEventLocal: automaticTestEvent.local,
        googleCalendar: normalizedEvent,
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
          events: eventsSummary
        });

      GC.UI.setStatus("ok", "Eventos leídos");

      GC.UI.setOutput({
        ok: true,
        message: "Próximos eventos leídos correctamente y Firebase actualizado.",
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

  async function createTestEvent(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    GC.UI.setBusy(true);
    GC.UI.setStatus("loading", "Creando");

    let connection = GC.ConnectionActions.createConnectionDraft();

    try {
      connection = GC.Storage.saveConnection(GC.UI.readConnectionFromInputs());

      await GC.ConnectionActions.saveConnectionToFirebase(connection);

      const token = await GC.TokenService.ensureToken(connection);

      const testEvent = GC.EventService.createTestEvent(
        GC.UI.readManualEventFromInputs()
      );

      const googleEvent = GC.EventService.toGoogleCalendarEvent(testEvent);

      const createdEvent = await GC.GoogleApi.insertEvent({
        accessToken: token.accessToken,
        calendarId: connection.calendarId,
        event: googleEvent
      });

      const normalizedEvent = GC.EventService.normalizeGoogleEvent(createdEvent);

      GC.Storage.saveCreatedEvent({
        eventId: normalizedEvent.id,
        htmlLink: normalizedEvent.htmlLink
      });

      const firebasePayload =
        await GC.FirebaseService.saveGoogleCalendarEventCreatedStatus({
          calendarId: connection.calendarId,
          event: normalizedEvent
        });

      GC.UI.setStatus("ok", "Evento creado");

      GC.UI.setOutput({
        ok: true,
        message: "Evento manual de prueba creado en Google Calendar y Firebase actualizado.",
        firestorePath: "conexiones/googleCalendar",
        runtimeMode: connection.runtimeMode,
        activeCredentialType: connection.activeCredentialType,
        localEvent: testEvent,
        googleCalendar: normalizedEvent,
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

  GC.CalendarActions = {
    createAutomaticTestEventPayload,
    testConnection,
    readUpcomingEvents,
    createTestEvent
  };
})(window);