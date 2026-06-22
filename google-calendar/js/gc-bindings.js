/*
  Nombre completo: gc-bindings.js
  Ruta: google-calendar/js/gc-bindings.js
  Función:
    - Conecta los botones y formularios del HTML con las acciones separadas.
    - Prepara los valores iniciales de la pantalla.
    - Carga la conexión guardada.
*/

(function initGcBindings(global) {
  "use strict";

  const GC = global.GC = global.GC || {};

  let started = false;

  function bindEvents() {
    const elements = GC.UI.getElements();

    elements.connectionForm.addEventListener(
      "submit",
      GC.ConnectionActions.saveConnection
    );

    elements.connectBtn.addEventListener(
      "click",
      GC.ConnectionActions.connectGoogleCalendar
    );

    elements.testConnectionBtn.addEventListener(
      "click",
      GC.CalendarActions.testConnection
    );

    elements.readEventsBtn.addEventListener(
      "click",
      GC.CalendarActions.readUpcomingEvents
    );

    elements.clearConnectionBtn.addEventListener(
      "click",
      GC.ConnectionActions.clearConnection
    );

    elements.eventForm.addEventListener(
      "submit",
      GC.CalendarActions.createTestEvent
    );
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