/*
  Nombre completo: gc-bindings.js
  Ruta: google-calendar/js/gc-bindings.js

  Función:
    - Conecta los botones y formularios del HTML con las acciones separadas.
    - Prepara los valores iniciales de la pantalla.
    - Carga la conexión guardada.
    - No enlaza creación de eventos desde Google Calendar.
*/

(function initGcBindings(global) {
  "use strict";

  const GC = global.GC = global.GC || {};

  let started = false;

  function addClick(element, handler) {
    if (!element || typeof handler !== "function") {
      return;
    }

    element.addEventListener("click", handler);
  }

  function addSubmit(element, handler) {
    if (!element || typeof handler !== "function") {
      return;
    }

    element.addEventListener("submit", handler);
  }

  function bindEvents() {
    const elements = GC.UI.getElements();

    addSubmit(elements.connectionForm, GC.ConnectionActions.saveConnection);
    addClick(elements.connectBtn, GC.ConnectionActions.connectGoogleCalendar);
    addClick(elements.testConnectionBtn, GC.CalendarActions.testConnection);
    addClick(elements.readEventsBtn, GC.CalendarActions.readUpcomingEvents);
    addClick(elements.clearConnectionBtn, GC.ConnectionActions.clearConnection);

    if (elements.eventForm) {
      addSubmit(elements.eventForm, GC.CalendarActions.blockEventCreationFromModule);
    }
  }

  function start() {
    if (started) {
      return;
    }

    started = true;

    GC.UI.setupInitialInputs();
    bindEvents();
    GC.ConnectionActions.loadSavedConnection();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  GC.Bindings = {
    start,
    bindEvents
  };
})(window);
