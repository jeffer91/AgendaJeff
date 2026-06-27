/*
  Nombre completo: gc-ui-dom.js
  Ruta: modulos/googlecalendar/ui/gc-ui-dom.js

  Función:
    - Centralizar referencias DOM del módulo Google Calendar.
    - Leer y escribir datos del formulario sin mezclar lógica de conexión.
    - Preparar datos para guardar, conectar, intercambiar código y crear eventos.

  Se conecta con:
    - modulos/googlecalendar/gc-module.html
    - modulos/googlecalendar/ui/gc-ui-events.js
    - modulos/googlecalendar/ui/gc-ui-render.js
*/

(function initGoogleCalendarUiDom(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const ui = googleCalendar.UI = googleCalendar.UI || {};

  function byId(id) {
    return document.getElementById(id);
  }

  function valueOf(id) {
    const element = byId(id);
    return element && typeof element.value === "string" ? element.value.trim() : "";
  }

  function checkedOf(id) {
    const element = byId(id);
    return element ? Boolean(element.checked) : false;
  }

  function setValue(id, value) {
    const element = byId(id);

    if (element) {
      element.value = value || "";
    }
  }

  function setChecked(id, value) {
    const element = byId(id);

    if (element) {
      element.checked = Boolean(value);
    }
  }

  function getElements() {
    return {
      statusBadge: byId("gcStatusBadge"),
      statusTitle: byId("gcStatusTitle"),
      statusDescription: byId("gcStatusDescription"),
      statusSource: byId("gcStatusSource"),
      statusUpdatedAt: byId("gcStatusUpdatedAt"),
      firebaseStatus: byId("gcFirebaseStatus"),
      authStatus: byId("gcAuthStatus"),
      apiStatus: byId("gcApiStatus"),
      connectorStatus: byId("gcConnectorStatus"),
      resultBox: byId("gcResultBox"),
      errorBox: byId("gcErrorBox"),
      diagnosticBox: byId("gcDiagnosticBox"),
      jsonBox: byId("gcJsonBox"),
      btnSave: byId("gcBtnSave"),
      btnLoad: byId("gcBtnLoad"),
      btnClear: byId("gcBtnClear"),
      btnConnect: byId("gcBtnConnect"),
      btnExchangeCode: byId("gcBtnExchangeCode"),
      btnTestFirebase: byId("gcBtnTestFirebase"),
      btnTestGoogle: byId("gcBtnTestGoogle"),
      btnCreateTestEvent: byId("gcBtnCreateTestEvent"),
      btnDiagnostic: byId("gcBtnDiagnostic")
    };
  }

  function readConnectionForm() {
    return {
      enabled: checkedOf("gcEnabled"),
      activeCredentialType: valueOf("gcActiveCredentialType") || "desktop",
      calendarId: valueOf("gcCalendarId") || "primary",
      clientIdDesktop: valueOf("gcClientIdDesktop"),
      clientSecretDesktop: valueOf("gcClientSecretDesktop"),
      redirectUriDesktop: valueOf("gcRedirectUriDesktop"),
      clientIdWeb: valueOf("gcClientIdWeb"),
      clientSecretWeb: valueOf("gcClientSecretWeb"),
      redirectUriWeb: valueOf("gcRedirectUriWeb"),
      updatedAt: new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    };
  }

  function readAuthInput() {
    const connection = readConnectionForm();
    const credentialType = connection.activeCredentialType || "desktop";

    return {
      ...connection,
      code: valueOf("gcAuthorizationCode"),
      clientId: credentialType === "web" ? connection.clientIdWeb : connection.clientIdDesktop,
      clientSecret: credentialType === "web" ? connection.clientSecretWeb : connection.clientSecretDesktop,
      redirectUri: credentialType === "web" ? connection.redirectUriWeb : connection.redirectUriDesktop
    };
  }

  function readEventDraft() {
    const connection = readConnectionForm();
    return {
      title: valueOf("gcTestEventTitle") || "Prueba AgendaJeff · Google Calendar",
      description: valueOf("gcTestEventDescription") || "Evento de prueba creado desde AgendaJeff.",
      location: valueOf("gcTestEventLocation") || "AgendaJeff",
      calendarId: connection.calendarId || "primary"
    };
  }

  function fillConnectionForm(connection) {
    const data = connection && typeof connection === "object" ? connection : {};

    setChecked("gcEnabled", data.enabled !== false);
    setValue("gcActiveCredentialType", data.activeCredentialType || "desktop");
    setValue("gcCalendarId", data.calendarId || "primary");
    setValue("gcClientIdDesktop", data.clientIdDesktop || "");
    setValue("gcRedirectUriDesktop", data.redirectUriDesktop || "");
    setValue("gcClientIdWeb", data.clientIdWeb || "");
    setValue("gcRedirectUriWeb", data.redirectUriWeb || "");
  }

  function clearSensitiveFields() {
    setValue("gcClientSecretDesktop", "");
    setValue("gcClientSecretWeb", "");
    setValue("gcAuthorizationCode", "");
  }

  ui.Dom = Object.freeze({
    byId,
    valueOf,
    checkedOf,
    setValue,
    setChecked,
    getElements,
    readConnectionForm,
    readAuthInput,
    readEventDraft,
    fillConnectionForm,
    clearSensitiveFields
  });
})(window);
