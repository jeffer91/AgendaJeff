/*
  Nombre completo: ag-start.js
  Ruta: modulos/agenda/startup/ag-start.js

  Función:
    - Iniciar la pantalla Agenda.
    - Crear, editar, completar, eliminar, listar y respaldar registros de la base local JSON.
*/

(function initAgendaModule(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const agenda = root.Agenda = root.Agenda || {};

  agenda.state = agenda.state || {
    started: false,
    startedAt: "",
    items: [],
    currentFilter: "all",
    lastResult: null
  };

  function getFilter() {
    const filter = agenda.dom.getElement("agFilterView");
    return filter && filter.value ? filter.value : "all";
  }

  function buildQueryFilter() {
    const view = getFilter();
    if (view === "all") return {};
    return { view };
  }

  async function loadItems() {
    const bridge = agenda.dom.getBridge();

    if (!bridge || typeof bridge.queryAgendaItems !== "function") {
      agenda.state.lastResult = { ok: false, message: "Puente Electron no disponible para listar registros." };
      agenda.listRender.renderList([]);
      agenda.dom.setOutput(agenda.state.lastResult);
      return agenda.state.lastResult;
    }

    const result = await bridge.queryAgendaItems(buildQueryFilter());
    const items = result && result.ok && result.data && Array.isArray(result.data.items) ? result.data.items : [];

    agenda.state.items = items;
    agenda.state.currentFilter = getFilter();
    agenda.state.lastResult = result;
    agenda.listRender.renderList(items);
    return result;
  }

  async function saveItem() {
    const bridge = agenda.dom.getBridge();
    const item = agenda.formRead.readFormItem();
    const validation = agenda.formRead.validateFormItem(item);

    if (!validation.ok) {
      agenda.dom.setOutput({ ok: false, action: "validate", message: validation.message, errors: validation.errors, data: item });
      return null;
    }

    if (!bridge || typeof bridge.saveAgendaItem !== "function") {
      agenda.dom.setOutput({ ok: false, action: "saveAgendaItem", message: "Puente Electron no disponible.", data: item });
      return null;
    }

    const result = await bridge.saveAgendaItem(item);
    agenda.state.lastResult = result;
    agenda.dom.setOutput(result);

    if (result && result.ok) {
      agenda.formFill.clearForm();
      await loadItems();
    }

    return result;
  }

  async function createBackup() {
    const bridge = agenda.dom.getBridge();

    if (!bridge || typeof bridge.createLocalBackup !== "function") {
      agenda.dom.setOutput({ ok: false, action: "backup", message: "Puente Electron no disponible." });
      return null;
    }

    const result = await bridge.createLocalBackup();
    agenda.state.lastResult = result;
    agenda.dom.setOutput(result);
    return result;
  }

  function clearForm() {
    agenda.formFill.clearForm();
    agenda.dom.setOutput({ ok: true, action: "clear", message: "Formulario listo para crear un nuevo registro." });
  }

  function attachEvents() {
    const saveButton = agenda.dom.getElement("agBtnSaveDraft");
    const clearButton = agenda.dom.getElement("agBtnClear");
    const cancelButton = agenda.dom.getElement("agBtnCancelEdit");
    const backupButton = agenda.dom.getElement("agBtnBackup");
    const refreshButton = agenda.dom.getElement("agBtnRefresh");
    const filterView = agenda.dom.getElement("agFilterView");

    if (saveButton) saveButton.addEventListener("click", saveItem);
    if (clearButton) clearButton.addEventListener("click", clearForm);
    if (cancelButton) cancelButton.addEventListener("click", clearForm);
    if (backupButton) backupButton.addEventListener("click", createBackup);
    if (refreshButton) refreshButton.addEventListener("click", loadItems);
    if (filterView) filterView.addEventListener("change", loadItems);

    if (agenda.listEvents && typeof agenda.listEvents.attachListEvents === "function") {
      agenda.listEvents.attachListEvents();
    }
  }

  async function start() {
    agenda.state.started = true;
    agenda.state.startedAt = new Date().toISOString();
    attachEvents();

    const bridge = agenda.dom.getBridge();
    const ensureResult = bridge && typeof bridge.ensureLocalDatabase === "function"
      ? await bridge.ensureLocalDatabase()
      : { ok: false, message: "Puente Electron no disponible." };

    agenda.formFill.clearForm();
    await loadItems();

    agenda.dom.setOutput({
      ok: true,
      module: "agenda",
      message: "Pantalla Agenda lista para crear, editar, completar, eliminar y respaldar registros.",
      localDatabase: ensureResult,
      totalItems: agenda.state.items.length,
      checkedAt: agenda.state.startedAt
    });

    return getState();
  }

  function getState() {
    return {
      started: agenda.state.started,
      startedAt: agenda.state.startedAt,
      currentFilter: agenda.state.currentFilter,
      items: agenda.state.items.slice(),
      lastResult: agenda.state.lastResult
    };
  }

  function autoStart() {
    if (!global.document || global.document.readyState !== "loading") {
      start();
      return;
    }
    global.document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  agenda.start = start;
  agenda.getState = getState;
  agenda.loadItems = loadItems;
  agenda.saveItem = saveItem;
  agenda.createBackup = createBackup;
  autoStart();
})(window);
