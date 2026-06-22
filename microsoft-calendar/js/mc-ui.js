/*
  Nombre completo: mc-ui.js
  Ruta: microsoft-calendar/js/mc-ui.js
  Función:
    - Centralizar lectura y escritura de inputs.
    - Controlar estado visual general y por cuenta.
    - Mostrar resultados JSON.
    - Activar/desactivar botones durante procesos.
    - Preparar valores iniciales de la pantalla.
  Se conecta con:
    - mc-config.js
    - mc-storage.js
    - mc-connection.actions.js
    - mc-calendar.actions.js
    - mc-bindings.js
*/

(function initMcUi(global) {
  "use strict";

  const MC = global.MC = global.MC || {};
  const Utils = MC.Utils;

  function $(id) {
    return document.getElementById(id);
  }

  function todayAsInputDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getElements() {
    return {
      statusBadge: $("mcStatusBadge"),
      output: $("mcOutput"),

      connectionForm: $("mcConnectionForm"),
      clientId: $("mcClientId"),
      tenantMode: $("mcTenantMode"),
      tenantId: $("mcTenantId"),
      activeRedirectType: $("mcActiveRedirectType"),
      redirectUriWeb: $("mcRedirectUriWeb"),
      redirectUriDesktop: $("mcRedirectUriDesktop"),
      readCalendarsBtn: $("mcReadCalendarsBtn"),
      clearConnectionBtn: $("mcClearConnectionBtn"),

      account1Status: $("mcAccount1Status"),
      account1Email: $("mcAccount1Email"),
      account1CalendarMode: $("mcAccount1CalendarMode"),
      account1CalendarId: $("mcAccount1CalendarId"),
      connectAccount1Btn: $("mcConnectAccount1Btn"),
      testAccount1Btn: $("mcTestAccount1Btn"),
      readEventsAccount1Btn: $("mcReadEventsAccount1Btn"),

      account2Status: $("mcAccount2Status"),
      account2Email: $("mcAccount2Email"),
      account2CalendarMode: $("mcAccount2CalendarMode"),
      account2CalendarId: $("mcAccount2CalendarId"),
      connectAccount2Btn: $("mcConnectAccount2Btn"),
      testAccount2Btn: $("mcTestAccount2Btn"),
      readEventsAccount2Btn: $("mcReadEventsAccount2Btn"),

      eventForm: $("mcEventForm"),
      eventAccountSlot: $("mcEventAccountSlot"),
      eventTitle: $("mcEventTitle"),
      eventDate: $("mcEventDate"),
      eventTime: $("mcEventTime"),
      eventDuration: $("mcEventDuration"),
      eventDescription: $("mcEventDescription")
    };
  }

  function setStatus(type, text) {
    const elements = getElements();

    if (!elements.statusBadge) {
      return;
    }

    elements.statusBadge.className = `mc-status mc-status--${type}`;
    elements.statusBadge.textContent = text;
  }

  function setAccountStatus(accountSlot, type, text) {
    const elements = getElements();
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const statusElement = slot === "account2"
      ? elements.account2Status
      : elements.account1Status;

    if (!statusElement) {
      return;
    }

    statusElement.className = `mc-mini-status mc-mini-status--${type}`;
    statusElement.textContent = text;
  }

  function setOutput(data) {
    const elements = getElements();

    if (!elements.output) {
      return;
    }

    if (typeof data === "string") {
      elements.output.textContent = data;
      return;
    }

    elements.output.textContent = JSON.stringify(data, null, 2);
  }

  function setBusy(isBusy) {
    const buttons = document.querySelectorAll("button");

    buttons.forEach((button) => {
      button.disabled = Boolean(isBusy);
    });
  }

  function readAppConfigFromInputs() {
    const elements = getElements();

    return Utils.normalizeAppConfig({
      clientId: elements.clientId ? elements.clientId.value : "",
      tenantMode: elements.tenantMode ? elements.tenantMode.value : "common",
      tenantId: elements.tenantId ? elements.tenantId.value : "",
      activeRedirectType: elements.activeRedirectType
        ? elements.activeRedirectType.value
        : "web",
      redirectUriWeb: elements.redirectUriWeb ? elements.redirectUriWeb.value : "",
      redirectUriDesktop: elements.redirectUriDesktop
        ? elements.redirectUriDesktop.value
        : "http://localhost"
    });
  }

  function readAccountFromInputs(accountSlot) {
    const elements = getElements();
    const slot = Utils.normalizeAccountSlot(accountSlot);

    if (slot === "account2") {
      return Utils.normalizeAccount("account2", {
        accountEmail: elements.account2Email ? elements.account2Email.value : "",
        calendarMode: elements.account2CalendarMode
          ? elements.account2CalendarMode.value
          : "default",
        calendarId: elements.account2CalendarId
          ? elements.account2CalendarId.value
          : ""
      });
    }

    return Utils.normalizeAccount("account1", {
      accountEmail: elements.account1Email ? elements.account1Email.value : "",
      calendarMode: elements.account1CalendarMode
        ? elements.account1CalendarMode.value
        : "default",
      calendarId: elements.account1CalendarId
        ? elements.account1CalendarId.value
        : ""
    });
  }

  function readConnectionFromInputs() {
    const currentConnection = MC.Storage.readConnection();

    const account1Input = readAccountFromInputs("account1");
    const account2Input = readAccountFromInputs("account2");

    return Utils.normalizeConnection({
      ...currentConnection,
      app: {
        ...currentConnection.app,
        ...readAppConfigFromInputs()
      },
      accounts: {
        account1: {
          ...currentConnection.accounts.account1,
          ...account1Input
        },
        account2: {
          ...currentConnection.accounts.account2,
          ...account2Input
        }
      }
    });
  }

  function writeAppConfigToInputs(appConfig) {
    const elements = getElements();
    const app = Utils.normalizeAppConfig(appConfig);

    if (elements.clientId) {
      elements.clientId.value = app.clientId || "";
    }

    if (elements.tenantMode) {
      elements.tenantMode.value = app.tenantMode || "common";
    }

    if (elements.tenantId) {
      elements.tenantId.value = app.tenantId || "";
    }

    if (elements.activeRedirectType) {
      elements.activeRedirectType.value = app.activeRedirectType || "web";
    }

    if (elements.redirectUriWeb) {
      elements.redirectUriWeb.value =
        app.redirectUriWeb || Utils.createCurrentPageRedirectUri();
    }

    if (elements.redirectUriDesktop) {
      elements.redirectUriDesktop.value = app.redirectUriDesktop || "http://localhost";
    }
  }

  function writeAccountToInputs(accountSlot, account) {
    const elements = getElements();
    const slot = Utils.normalizeAccountSlot(accountSlot);
    const normalized = Utils.normalizeAccount(slot, account);

    if (slot === "account2") {
      if (elements.account2Email) {
        elements.account2Email.value = normalized.accountEmail || "";
      }

      if (elements.account2CalendarMode) {
        elements.account2CalendarMode.value = normalized.calendarMode || "default";
      }

      if (elements.account2CalendarId) {
        elements.account2CalendarId.value = normalized.calendarId || "";
      }

      setAccountStatus(
        "account2",
        normalized.connected ? "ok" : "idle",
        normalized.connected ? "Conectada" : "Sin conectar"
      );

      return;
    }

    if (elements.account1Email) {
      elements.account1Email.value = normalized.accountEmail || "";
    }

    if (elements.account1CalendarMode) {
      elements.account1CalendarMode.value = normalized.calendarMode || "default";
    }

    if (elements.account1CalendarId) {
      elements.account1CalendarId.value = normalized.calendarId || "";
    }

    setAccountStatus(
      "account1",
      normalized.connected ? "ok" : "idle",
      normalized.connected ? "Conectada" : "Sin conectar"
    );
  }

  function writeConnectionToInputs(connection) {
    const normalized = Utils.normalizeConnection(connection);

    writeAppConfigToInputs(normalized.app);
    writeAccountToInputs("account1", normalized.accounts.account1);
    writeAccountToInputs("account2", normalized.accounts.account2);
  }

  function readManualEventFromInputs() {
    const elements = getElements();

    return {
      accountSlot: elements.eventAccountSlot
        ? elements.eventAccountSlot.value
        : "account1",
      title: elements.eventTitle ? elements.eventTitle.value : "",
      date: elements.eventDate ? elements.eventDate.value : "",
      time: elements.eventTime ? elements.eventTime.value : "",
      durationMinutes: elements.eventDuration ? elements.eventDuration.value : "",
      description: elements.eventDescription ? elements.eventDescription.value : ""
    };
  }

  function setupInitialInputs() {
    const elements = getElements();

    if (elements.eventDate && !elements.eventDate.value) {
      elements.eventDate.value = todayAsInputDate();
    }

    if (elements.redirectUriWeb && !elements.redirectUriWeb.value) {
      elements.redirectUriWeb.value = Utils.createCurrentPageRedirectUri();
    }

    if (elements.redirectUriDesktop && !elements.redirectUriDesktop.value) {
      elements.redirectUriDesktop.value = "http://localhost";
    }
  }

  function showConnectionLoaded(connection, firebaseStatus) {
    const normalized = Utils.normalizeConnection(connection);

    writeConnectionToInputs(normalized);

    if (normalized.configured) {
      setStatus("idle", "Guardado");
    } else {
      setStatus("idle", "Sin probar");
    }

    setOutput({
      ok: true,
      message: normalized.configured
        ? "Configuración Microsoft Calendar cargada localmente."
        : "Esperando configuración Microsoft Calendar.",
      firestorePath: "conexiones/microsoftCalendar",
      local: {
        configured: normalized.configured,
        clientIdSaved: Boolean(normalized.app.clientId),
        account1Email: normalized.accounts.account1.accountEmail,
        account2Email: normalized.accounts.account2.accountEmail
      },
      firebase: firebaseStatus || null,
      note: "Los tokens no se guardan en Firebase."
    });
  }

  MC.UI = {
    getElements,

    setStatus,
    setAccountStatus,
    setOutput,
    setBusy,

    readAppConfigFromInputs,
    readAccountFromInputs,
    readConnectionFromInputs,
    readManualEventFromInputs,

    writeAppConfigToInputs,
    writeAccountToInputs,
    writeConnectionToInputs,

    setupInitialInputs,
    showConnectionLoaded
  };
})(window);