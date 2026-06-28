/*
  Nombre completo: in-start.js
  Ruta: modulos/inicio/startup/in-start.js

  Función:
    - Iniciar la pantalla Inicio.
    - Leer toda la base local y construir resumen principal de AgendaJeff.
*/

(function initInicioModule(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const inicio = root.Inicio = root.Inicio || {};

  const state = {
    started: false,
    startedAt: "",
    module: "inicio",
    pendingCoreConnection: false,
    lastLoadResult: null,
    allItems: [],
    summary: null
  };

  async function loadDashboard() {
    const bridge = inicio.dom.getBridge();

    if (!bridge || typeof bridge.queryAgendaItems !== "function") {
      state.pendingCoreConnection = true;
      inicio.render.renderDisconnected("Abre la app con Electron para leer la base local JSON.");
      return { ok: false, message: "Puente Electron no disponible." };
    }

    state.pendingCoreConnection = false;
    if (typeof bridge.ensureLocalDatabase === "function") await bridge.ensureLocalDatabase();

    const allResult = await bridge.queryAgendaItems({});
    const items = allResult && allResult.ok && allResult.data && Array.isArray(allResult.data.items) ? allResult.data.items : [];
    const summary = inicio.summary.buildSummary(items);

    state.allItems = items;
    state.summary = summary;
    state.lastLoadResult = allResult;

    inicio.render.renderDashboard(summary);
    return { ok: true, allResult, summary };
  }

  async function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();

    if (inicio.actions && typeof inicio.actions.attach === "function") inicio.actions.attach();
    await loadDashboard();
    return getState();
  }

  function getState() {
    return {
      started: state.started,
      startedAt: state.startedAt,
      module: state.module,
      pendingCoreConnection: state.pendingCoreConnection,
      lastLoadResult: state.lastLoadResult,
      allItems: state.allItems.slice(),
      summary: state.summary
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
  inicio.loadDashboard = loadDashboard;
  autoStart();
})(window);
