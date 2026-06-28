/*
  Nombre completo: in-start.js
  Ruta: modulos/inicio/startup/in-start.js

  Función:
    - Iniciar la pantalla Inicio.
    - Dejar una API mínima de estado para el shell y futuros módulos core.
*/

(function initInicioModule(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const inicio = root.Inicio = root.Inicio || {};

  const state = {
    started: false,
    startedAt: "",
    module: "inicio",
    pendingCoreConnection: true
  };

  function setText(id, value) {
    const element = global.document ? global.document.getElementById(id) : null;
    if (element) element.textContent = value;
  }

  function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();
    setText("inStatusTitle", "Inicio cargado");
    setText("inStatusDescription", "Pantalla base lista para conectarse con eventos, próximos y pendientes.");
    return getState();
  }

  function getState() {
    return {
      started: state.started,
      startedAt: state.startedAt,
      module: state.module,
      pendingCoreConnection: state.pendingCoreConnection
    };
  }

  function autoStart() {
    if (!global.document || global.document.readyState !== "loading") {
      start();
      return;
    }

    global.document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  inicio.start = start;
  inicio.getState = getState;
  autoStart();
})(window);
