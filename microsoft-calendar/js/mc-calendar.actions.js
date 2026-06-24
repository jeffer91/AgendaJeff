/*
  Nombre completo: mc-calendar.actions.js
  Ruta: microsoft-calendar/js/mc-calendar.actions.js

  Función:
    - Manejar acciones permitidas de Microsoft Calendar.
    - Leer calendarios disponibles.
    - Probar conexión de cuenta 1 y cuenta 2 sin crear eventos.
    - Leer próximos eventos de cuenta 1 y cuenta 2.
    - Bloquear cualquier creación de eventos desde esta pantalla.

  Regla funcional:
    - Los eventos solo se crean desde Agendador o Carga Masiva.
*/

(function initMcCalendarActions(global) {
  "use strict";

  const MC = global.MC = global.MC || {};
  const CONFIG = MC.CONFIG;
  const Utils = MC.Utils;

  function getCalendarIdFromAccount(account) {
    return Utils.getAccountCalendarId(account);
  }

  function getPreferredAccountSlot() {
    const elements = MC.UI.getElements();

    if (elements.eventAccountSlot && elements.eventAccountSlot.value) {
      return Utils.normalizeAccountSlot(elements.eventAccountSlot.value);
    }

    return MC.Storage.readLastActiveAccountSlot();
  }

  async function prepareConnectionForCalendarAction(accountSlot) {
    const slot = Utils.normalizeAccountSlot(accountSlot);

    let connection = MC.UI.readConnectionFromInputs();

    connection = MC.Storage.saveConnection(connection);

    MC.ConnectionActions.validateAppConfig(connection);
    MC.ConnectionActions.validateAccountForConnection(connection, slot);

    await MC.ConnectionActions.saveConnectionToFirebase(connection);

    return connection;
  }

  async function saveCalendarError(accountSlot, error) {
    const slot = Utils.normalizeAccountSlot(accountSlot);

    try {
      MC.Storage.saveAccountError(slot, error);

      await MC.FirebaseService.saveMicrosoftCalendarErrorStatus({
        accountSlot: slot,
        error
      });
    } catch (firebaseError) {
      return {
        ok: false,
        firebaseError: firebaseError.message
      };
    }

    return {
      ok: true
    };
  }

  async function readCalendars() {
    const slot = getPreferredAccountSlot();

    MC.UI.setBusy(true);
    MC.UI.setStatus("loading", "Leyendo");
    MC.UI.setAccountStatus(slot, "loading", "Leyendo");

    let connection = MC.ConnectionActions.createConnectionDraft();

    try {
      connection = await prepareConnectionForCalendarAction(slot);

      const tokenInfo = await MC.TokenService.ensureToken(slot, connection);

      const calendars = await MC.MicrosoftApi.listCalendars({
        accessToken: tokenInfo.accessToken,
        maxResults: 25
      });

      const firebasePayload =
        await MC.FirebaseService.saveMicrosoftCalendarCalendarsReadStatus({
          accountSlot: slot,
          calendars
        });

      MC.Storage.saveLastActiveAccountSlot(slot);

      MC.UI.setStatus("ok", "Calendarios leídos");
      MC.UI.setAccountStatus(slot, "ok", "Conectada");

      MC.UI.setOutput({
        ok: true,
        message: `Calendarios leídos correctamente desde ${Utils.getAccountLabel(slot)}. No se creó ningún evento.`,
        firestorePath: CONFIG.FIRESTORE_PATH,
        accountSlot: slot,
        count: calendars.length,
        calendars,
        token: MC.TokenService.getPublicTokenInfo(slot),
        firebase: firebasePayload,
        note: "Si quieres usar un calendario específico, copia su id en Calendar ID específico."
      });

      return calendars;
    } catch (error) {
      await saveCalendarError(slot, error);

      MC.UI.setStatus("error", "Error");
      MC.UI.setAccountStatus(slot, "error", "Error");

      MC.UI.setOutput({
        ok: false,
        message: error.message,
        accountSlot: slot,
        firestorePath: CONFIG.FIRESTORE_PATH
      });

      throw error;
    } finally {
      MC.UI.setBusy(false);
    }
  }

  async function testAccount(accountSlot) {
    const slot = Utils.normalizeAccountSlot(accountSlot);

    MC.UI.setBusy(true);
    MC.UI.setStatus("loading", "Probando");
    MC.UI.setAccountStatus(slot, "loading", "Probando");

    let connection = MC.ConnectionActions.createConnectionDraft();

    try {
      connection = await prepareConnectionForCalendarAction(slot);

      const tokenInfo = await MC.TokenService.ensureToken(slot, connection);
      const profile = await MC.MicrosoftApi.getMe(tokenInfo.accessToken);

      const updatedConnection = MC.Storage.markAccountConnected(slot, {
        accountEmail: profile.email || connection.accounts[slot].accountEmail,
        microsoftAccountId: profile.id,
        microsoftUsername: profile.displayName || profile.userPrincipalName
      });

      const updatedAccount = updatedConnection.accounts[slot];

      const firebasePayload =
        await MC.FirebaseService.saveMicrosoftCalendarConnectedStatus({
          accountSlot: slot,
          account: updatedAccount
        });

      MC.UI.writeConnectionToInputs(updatedConnection);
      MC.UI.setStatus("ok", "Conectado");
      MC.UI.setAccountStatus(slot, "ok", "Conectada");

      MC.UI.setOutput({
        ok: true,
        message: `Conexión correcta con ${Utils.getAccountLabel(slot)}. No se creó ningún evento desde esta pantalla.`,
        firestorePath: CONFIG.FIRESTORE_PATH,
        accountSlot: slot,
        accountEmail: updatedAccount.accountEmail,
        microsoftProfile: {
          id: profile.id,
          displayName: profile.displayName,
          email: profile.email
        },
        token: MC.TokenService.getPublicTokenInfo(slot),
        firebase: firebasePayload,
        rule: "Los eventos solo se crean desde Agendador o Carga Masiva."
      });

      return profile;
    } catch (error) {
      await saveCalendarError(slot, error);

      MC.UI.setStatus("error", "Error");
      MC.UI.setAccountStatus(slot, "error", "Error");

      MC.UI.setOutput({
        ok: false,
        message: error.message,
        accountSlot: slot,
        firestorePath: CONFIG.FIRESTORE_PATH
      });

      throw error;
    } finally {
      MC.UI.setBusy(false);
    }
  }

  async function testAccount1() {
    return testAccount("account1");
  }

  async function testAccount2() {
    return testAccount("account2");
  }

  async function readUpcomingEvents(accountSlot) {
    const slot = Utils.normalizeAccountSlot(accountSlot);

    MC.UI.setBusy(true);
    MC.UI.setStatus("loading", "Leyendo eventos");
    MC.UI.setAccountStatus(slot, "loading", "Leyendo");

    let connection = MC.ConnectionActions.createConnectionDraft();

    try {
      connection = await prepareConnectionForCalendarAction(slot);

      const account = connection.accounts[slot];
      const tokenInfo = await MC.TokenService.ensureToken(slot, connection);
      const calendarId = getCalendarIdFromAccount(account);

      const events = await MC.MicrosoftApi.listUpcomingEvents({
        accessToken: tokenInfo.accessToken,
        calendarId,
        maxResults: CONFIG.MAX_EVENTS_TO_READ
      });

      const normalizedEvents =
        MC.EventService.normalizeMicrosoftEventsList(events);

      const eventsSummary = MC.EventService.summarizeEvents(normalizedEvents);

      const updatedConnection = MC.Storage.saveLastEventsRead(slot, {
        count: eventsSummary.length
      });

      const updatedAccount = updatedConnection.accounts[slot];

      const firebasePayload =
        await MC.FirebaseService.saveMicrosoftCalendarEventsReadStatus({
          accountSlot: slot,
          account: updatedAccount,
          events: eventsSummary
        });

      MC.UI.writeConnectionToInputs(updatedConnection);
      MC.UI.setStatus("ok", "Eventos leídos");
      MC.UI.setAccountStatus(slot, "ok", "Conectada");

      MC.UI.setOutput({
        ok: true,
        message: `Próximos eventos leídos correctamente desde ${Utils.getAccountLabel(slot)}. No se creó ningún evento.`,
        firestorePath: CONFIG.FIRESTORE_PATH,
        accountSlot: slot,
        accountEmail: updatedAccount.accountEmail,
        calendarId: calendarId || "default",
        count: eventsSummary.length,
        events: eventsSummary,
        token: MC.TokenService.getPublicTokenInfo(slot),
        firebase: firebasePayload
      });

      return eventsSummary;
    } catch (error) {
      await saveCalendarError(slot, error);

      MC.UI.setStatus("error", "Error");
      MC.UI.setAccountStatus(slot, "error", "Error");

      MC.UI.setOutput({
        ok: false,
        message: error.message,
        accountSlot: slot,
        firestorePath: CONFIG.FIRESTORE_PATH
      });

      throw error;
    } finally {
      MC.UI.setBusy(false);
    }
  }

  async function readEventsAccount1() {
    return readUpcomingEvents("account1");
  }

  async function readEventsAccount2() {
    return readUpcomingEvents("account2");
  }

  async function blockEventCreationFromModule(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    MC.UI.setStatus("error", "Bloqueado");
    MC.UI.setOutput({
      ok: false,
      blocked: true,
      message: "La creación de eventos desde Microsoft Calendar está bloqueada.",
      rule: "Crea eventos únicamente desde Agendador o Carga Masiva."
    });
  }

  MC.CalendarActions = {
    readCalendars,

    testAccount,
    testAccount1,
    testAccount2,

    readUpcomingEvents,
    readEventsAccount1,
    readEventsAccount2,

    blockEventCreationFromModule,
    createManualEvent: blockEventCreationFromModule
  };
})(window);
