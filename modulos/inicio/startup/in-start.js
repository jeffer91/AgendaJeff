/*
  Nombre completo: in-start.js
  Ruta: modulos/inicio/startup/in-start.js

  Función:
    - Iniciar la pantalla Inicio.
    - Leer eventos de hoy, próximos y pendientes desde la base local JSON cuando Electron esté disponible.
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
    lastLoadResult: null
  };

  function getBridge() {
    try {
      if (global.AgendaJeffElectron) return global.AgendaJeffElectron;
      if (global.parent && global.parent.AgendaJeffElectron) return global.parent.AgendaJeffElectron;
    } catch (error) {
      return null;
    }
    return null;
  }

  function setText(id, value) {
    const element = global.document ? global.document.getElementById(id) : null;
    if (element) element.textContent = value;
  }

  function getList(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"]/g, function replaceChar(char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char];
    });
  }

  function renderList(id, items, emptyText) {
    const list = getList(id);
    if (!list) return;

    if (!items || !items.length) {
      list.innerHTML = `<div class="in-empty">${escapeHtml(emptyText)}</div>`;
      return;
    }

    list.innerHTML = items.slice(0, 8).map(function mapItem(item) {
      const time = item.todoDia || !item.horaInicio ? "Todo el día" : item.horaInicio;
      return `<div class="in-empty"><strong>${escapeHtml(item.titulo || "Sin título")}</strong><br><span>${escapeHtml(item.tipo)} · ${escapeHtml(item.fechaInicio)} · ${escapeHtml(time)}</span></div>`;
    }).join("");
  }

  async function loadDashboard() {
    const bridge = getBridge();

    if (!bridge || typeof bridge.queryAgendaItems !== "function") {
      state.pendingCoreConnection = true;
      setText("inStatusTitle", "Modo visual");
      setText("inStatusDescription", "Abre la app con Electron para leer la base local JSON.");
      return { ok: false, message: "Puente Electron no disponible." };
    }

    await bridge.ensureLocalDatabase();
    const todayResult = await bridge.queryAgendaItems({ view: "today" });
    const upcomingResult = await bridge.queryAgendaItems({ view: "upcoming" });
    const pendingResult = await bridge.queryAgendaItems({ view: "pending" });

    const todayItems = todayResult && todayResult.data ? todayResult.data.items || [] : [];
    const upcomingItems = upcomingResult && upcomingResult.data ? upcomingResult.data.items || [] : [];
    const pendingItems = pendingResult && pendingResult.data ? pendingResult.data.items || [] : [];

    setText("inTodayCount", String(todayItems.length));
    setText("inUpcomingCount", String(upcomingItems.length));
    setText("inPendingCount", String(pendingItems.length));

    renderList("inTodayList", todayItems, "No hay eventos para hoy.");
    renderList("inUpcomingList", upcomingItems, "No hay próximos eventos registrados.");
    renderList("inPendingList", pendingItems, "No hay pendientes activos.");

    setText("inStatusTitle", "Inicio conectado");
    setText("inStatusDescription", "Datos cargados desde la base local JSON.");

    state.lastLoadResult = { todayResult, upcomingResult, pendingResult };
    return state.lastLoadResult;
  }

  async function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();
    await loadDashboard();
    return getState();
  }

  function getState() {
    return {
      started: state.started,
      startedAt: state.startedAt,
      module: state.module,
      pendingCoreConnection: state.pendingCoreConnection,
      lastLoadResult: state.lastLoadResult
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
