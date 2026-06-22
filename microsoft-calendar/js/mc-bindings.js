/*
  Nombre completo: mc-bindings.js
  Ruta: microsoft-calendar/js/mc-bindings.js
  Función:
    - Conectar botones y formularios del HTML con las acciones de Microsoft Calendar.
    - Preparar valores iniciales de la pantalla.
    - Cargar conexión guardada desde localStorage/Firebase.
    - Mantener el módulo completamente independiente.
  Se conecta con:
    - mc-config.js
    - mc-storage.js
    - mc-ui.js
    - mc-connection.actions.js
    - mc-calendar.actions.js

  Importante:
    - Este archivo debe cargarse al final.
    - Este archivo usa window.MC.
    - No usa window.GC.
    - No usa window.TL.
*/

(function initMcBindings(global) {
  "use strict";

  const MC = global.MC = global.MC || {};

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
    const elements = MC.UI.getElements();

    addSubmit(
      elements.connectionForm,
      MC.ConnectionActions.saveConnection
    );

    addClick(
      elements.readCalendarsBtn,
      MC.CalendarActions.readCalendars
    );

    addClick(
      elements.clearConnectionBtn,
      MC.ConnectionActions.clearConnection
    );

    addClick(
      elements.connectAccount1Btn,
      MC.ConnectionActions.connectAccount1
    );

    addClick(
      elements.testAccount1Btn,
      MC.CalendarActions.testAccount1
    );

    addClick(
      elements.readEventsAccount1Btn,
      MC.CalendarActions.readEventsAccount1
    );

    addClick(
      elements.connectAccount2Btn,
      MC.ConnectionActions.connectAccount2
    );

    addClick(
      elements.testAccount2Btn,
      MC.CalendarActions.testAccount2
    );

    addClick(
      elements.readEventsAccount2Btn,
      MC.CalendarActions.readEventsAccount2
    );

    addSubmit(
      elements.eventForm,
      MC.CalendarActions.createManualEvent
    );
  }

  function validateRequiredModules() {
    const requiredModules = [
      "CONFIG",
      "Utils",
      "Storage",
      "MicrosoftApi",
      "EventService",
      "FirebaseConfig",
      "FirebaseService",
      "UI",
      "TokenService",
      "ConnectionActions",
      "CalendarActions"
    ];

    const missingModules = requiredModules.filter((moduleName) => {
      return !MC[moduleName];
    });

    if (missingModules.length) {
      throw new Error(
        `Faltan archivos o módulos Microsoft Calendar: ${missingModules.join(", ")}`
      );
    }

    return true;
  }

  async function start() {
    if (started) {
      return;
    }

    started = true;

    try {
      validateRequiredModules();

      MC.UI.setupInitialInputs();
      bindEvents();

      await MC.ConnectionActions.loadSavedConnection();
    } catch (error) {
      if (MC.UI && typeof MC.UI.setStatus === "function") {
        MC.UI.setStatus("error", "Error");
      }

      if (MC.UI && typeof MC.UI.setOutput === "function") {
        MC.UI.setOutput({
          ok: false,
          message: error.message,
          help: "Revisa que todos los archivos JS estén creados y cargados en el orden correcto."
        });
      } else {
        console.error(error);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  MC.Bindings = {
    start,
    bindEvents,
    validateRequiredModules
  };
})(window);