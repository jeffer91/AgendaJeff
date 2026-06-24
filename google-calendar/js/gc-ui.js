/*
  Nombre completo: gc-ui.js
  Ruta: google-calendar/js/gc-ui.js

  Función:
    - Centralizar los elementos HTML del módulo Google Calendar.
    - Permitir leer y escribir los campos de conexión.
    - Mostrar estado, salida y bloquear/desbloquear botones.
    - Tolerar que no exista formulario de eventos, porque esta pantalla no crea eventos.
*/

(function initGcUi(global) {
  "use strict";

  const GC = global.GC = global.GC || {};
  const CONFIG = GC.CONFIG;

  const elements = {
    statusBadge: document.getElementById("gcStatusBadge"),
    output: document.getElementById("gcOutput"),

    connectionForm: document.getElementById("gcConnectionForm"),
    clientIdWeb: document.getElementById("gcClientIdWeb"),
    clientSecretWeb: document.getElementById("gcClientSecretWeb"),
    clientIdDesktop: document.getElementById("gcClientIdDesktop"),
    clientSecretDesktop: document.getElementById("gcClientSecretDesktop"),
    calendarId: document.getElementById("gcCalendarId"),
    connectBtn: document.getElementById("gcConnectBtn"),
    testConnectionBtn: document.getElementById("gcTestConnectionBtn"),
    readEventsBtn: document.getElementById("gcReadEventsBtn"),
    clearConnectionBtn: document.getElementById("gcClearConnectionBtn"),

    eventForm: document.getElementById("gcEventForm"),
    eventTitle: document.getElementById("gcEventTitle"),
    eventDate: document.getElementById("gcEventDate"),
    eventTime: document.getElementById("gcEventTime"),
    eventDuration: document.getElementById("gcEventDuration"),
    eventDescription: document.getElementById("gcEventDescription")
  };

  function getElement(name) {
    const element = elements[name];

    if (!element) {
      throw new Error(`No se encontró el elemento de pantalla: ${name}.`);
    }

    return element;
  }

  function getOptionalElement(name) {
    return elements[name] || null;
  }

  function getElements() {
    return elements;
  }

  function todayAsInputDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function setStatus(type, text) {
    const statusBadge = getOptionalElement("statusBadge");

    if (!statusBadge) {
      return;
    }

    statusBadge.className = `gc-status gc-status--${type}`;
    statusBadge.textContent = text;
  }

  function setOutput(data) {
    const output = getOptionalElement("output");

    if (!output) {
      return;
    }

    if (typeof data === "string") {
      output.textContent = data;
      return;
    }

    output.textContent = JSON.stringify(data, null, 2);
  }

  function setBusy(isBusy) {
    const buttons = document.querySelectorAll("button");

    buttons.forEach((button) => {
      button.disabled = Boolean(isBusy);
    });
  }

  function readConnectionFromInputs() {
    return {
      clientIdWeb: getElement("clientIdWeb").value,
      clientSecretWeb: getElement("clientSecretWeb").value,
      clientIdDesktop: getElement("clientIdDesktop").value,
      clientSecretDesktop: getElement("clientSecretDesktop").value,
      calendarId: getElement("calendarId").value
    };
  }

  function writeConnectionToInputs(connection) {
    const safeConnection = connection || {};

    getElement("clientIdWeb").value =
      safeConnection.clientIdWeb || safeConnection.clientId || "";

    getElement("clientSecretWeb").value =
      safeConnection.clientSecretWeb || safeConnection.clientSecret || "";

    getElement("clientIdDesktop").value = safeConnection.clientIdDesktop || "";
    getElement("clientSecretDesktop").value = safeConnection.clientSecretDesktop || "";

    getElement("calendarId").value =
      safeConnection.calendarId || CONFIG.DEFAULT_CALENDAR_ID;
  }

  function clearConnectionInputs() {
    getElement("clientIdWeb").value = "";
    getElement("clientSecretWeb").value = "";
    getElement("clientIdDesktop").value = "";
    getElement("clientSecretDesktop").value = "";
    getElement("calendarId").value = CONFIG.DEFAULT_CALENDAR_ID;
  }

  function readManualEventFromInputs() {
    throw new Error("La creación manual de eventos está bloqueada en Google Calendar. Usa Agendador o Carga Masiva.");
  }

  function setupInitialInputs() {
    const eventDate = getOptionalElement("eventDate");

    if (eventDate && !eventDate.value) {
      eventDate.value = todayAsInputDate();
    }

    if (!getElement("calendarId").value) {
      getElement("calendarId").value = CONFIG.DEFAULT_CALENDAR_ID;
    }
  }

  GC.UI = {
    getElements,
    getOptionalElement,
    todayAsInputDate,
    setStatus,
    setOutput,
    setBusy,
    readConnectionFromInputs,
    writeConnectionToInputs,
    clearConnectionInputs,
    readManualEventFromInputs,
    setupInitialInputs
  };
})(window);
