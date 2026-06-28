/*
  Nombre completo: in-actions.js
  Ruta: modulos/inicio/actions/in-actions.js

  Función:
    - Acciones rápidas de Inicio: actualizar, completar y abrir Agenda.
*/

(function initInicioActions(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const inicio = root.Inicio = root.Inicio || {};

  async function completeItem(idLocal) {
    const bridge = inicio.dom.getBridge();

    if (!bridge || typeof bridge.completeAgendaItem !== "function") {
      return { ok: false, action: "complete", message: "Puente Electron no disponible para completar." };
    }

    const result = await bridge.completeAgendaItem(idLocal);
    if (inicio.loadDashboard) await inicio.loadDashboard();
    return result;
  }

  async function refresh() {
    if (inicio.loadDashboard) return inicio.loadDashboard();
    return { ok: false, action: "refresh", message: "loadDashboard no disponible." };
  }

  function openAgenda() {
    const opened = inicio.dom.openAgendaModule();
    return { ok: opened, action: "openAgenda", message: opened ? "Agenda abierta." : "No se pudo abrir Agenda desde Inicio." };
  }

  async function handleClick(event) {
    const button = event.target && event.target.closest ? event.target.closest("button[data-action]") : null;
    if (!button) return;

    const action = button.dataset.action;
    const idLocal = button.dataset.idLocal;
    let result = null;

    if (action === "refresh") result = await refresh();
    if (action === "complete") result = await completeItem(idLocal);
    if (action === "openAgenda") result = openAgenda();

    if (result && inicio.dom && inicio.dom.setText) {
      inicio.dom.setText("inActionStatus", result.message || "Acción ejecutada.");
    }
  }

  function attach() {
    const page = inicio.dom.getElement("inPageRoot");
    if (page) page.addEventListener("click", handleClick);
  }

  inicio.actions = Object.freeze({ attach, completeItem, refresh, openAgenda });
})(window);
