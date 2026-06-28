/*
  Nombre completo: ag-list-events.js
  Ruta: modulos/agenda/list/ag-list-events.js

  Función:
    - Manejar acciones de lista: editar, completar y eliminar registros locales.
*/

(function initAgendaListEvents(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const agenda = root.Agenda = root.Agenda || {};

  function findItemById(idLocal) {
    const items = Array.isArray(agenda.state && agenda.state.items) ? agenda.state.items : [];
    return items.find(function findItem(item) { return item.idLocal === idLocal; }) || null;
  }

  async function completeItem(idLocal) {
    const bridge = agenda.dom.getBridge();
    if (!bridge || typeof bridge.completeAgendaItem !== "function") {
      agenda.dom.setOutput({ ok: false, message: "Puente Electron no disponible para completar." });
      return null;
    }

    const result = await bridge.completeAgendaItem(idLocal);
    agenda.dom.setOutput(result);
    if (agenda.loadItems) await agenda.loadItems();
    return result;
  }

  async function removeItem(idLocal) {
    const bridge = agenda.dom.getBridge();
    if (!bridge || typeof bridge.removeAgendaItem !== "function") {
      agenda.dom.setOutput({ ok: false, message: "Puente Electron no disponible para eliminar." });
      return null;
    }

    const confirmed = global.confirm ? global.confirm("¿Eliminar este registro de AgendaJeff?") : true;
    if (!confirmed) return null;

    const result = await bridge.removeAgendaItem(idLocal);
    agenda.dom.setOutput(result);
    if (agenda.loadItems) await agenda.loadItems();
    return result;
  }

  async function handleListClick(event) {
    const button = event.target && event.target.closest ? event.target.closest("button[data-action]") : null;
    if (!button) return;

    const action = button.dataset.action;
    const idLocal = button.dataset.idLocal;
    const item = findItemById(idLocal);

    if (action === "edit" && item) {
      agenda.formFill.fillForm(item);
      agenda.dom.setOutput({ ok: true, action: "edit", message: "Registro cargado para edición.", data: item });
      return;
    }

    if (action === "complete") {
      await completeItem(idLocal);
      return;
    }

    if (action === "remove") {
      await removeItem(idLocal);
    }
  }

  function attachListEvents() {
    const list = agenda.dom.getElement("agListBox");
    if (list) list.addEventListener("click", handleListClick);
  }

  agenda.listEvents = Object.freeze({ attachListEvents, completeItem, removeItem });
})(window);
