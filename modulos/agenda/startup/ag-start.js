/*
  Nombre completo: ag-start.js
  Ruta: modulos/agenda/startup/ag-start.js

  Función:
    - Iniciar la pantalla Agenda.
    - Capturar datos del formulario como borrador visual sin persistencia real todavía.
*/

(function initAgendaModule(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const agenda = root.Agenda = root.Agenda || {};

  const state = {
    started: false,
    startedAt: "",
    lastDraft: null
  };

  function getElement(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function setOutput(data) {
    const output = getElement("agResultBox");
    if (output) output.textContent = JSON.stringify(data, null, 2);
  }

  function readFormDraft() {
    return {
      tipo: getElement("agType") ? getElement("agType").value : "evento",
      titulo: getElement("agTitle") ? getElement("agTitle").value.trim() : "",
      descripcion: getElement("agDescription") ? getElement("agDescription").value.trim() : "",
      fechaInicio: getElement("agStartDate") ? getElement("agStartDate").value : "",
      fechaFin: getElement("agEndDate") ? getElement("agEndDate").value : "",
      horaInicio: getElement("agStartTime") ? getElement("agStartTime").value : "",
      horaFin: getElement("agEndTime") ? getElement("agEndTime").value : "",
      todoDia: getElement("agAllDay") ? getElement("agAllDay").checked : false,
      categoria: getElement("agCategory") ? getElement("agCategory").value : "otro",
      repeticion: getElement("agRepeat") ? getElement("agRepeat").value : "none",
      estado: "borrador_visual",
      creadoEn: new Date().toISOString()
    };
  }

  function saveVisualDraft() {
    state.lastDraft = readFormDraft();
    setOutput({
      ok: true,
      action: "saveVisualDraft",
      message: "Borrador visual generado. La persistencia real se conectará en el bloque de base local.",
      data: state.lastDraft
    });
    return state.lastDraft;
  }

  function clearForm() {
    const form = getElement("agEventForm");
    if (form && typeof form.reset === "function") form.reset();
    state.lastDraft = null;
    setOutput({ ok: true, action: "clear", message: "Formulario limpiado." });
  }

  function attachEvents() {
    const saveButton = getElement("agBtnSaveDraft");
    const clearButton = getElement("agBtnClear");
    if (saveButton) saveButton.addEventListener("click", saveVisualDraft);
    if (clearButton) clearButton.addEventListener("click", clearForm);
  }

  function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();
    attachEvents();
    setOutput({
      ok: true,
      module: "agenda",
      message: "Pantalla Agenda base cargada.",
      next: "Bloque 2 conectará modelo y base local JSON.",
      checkedAt: state.startedAt
    });
    return getState();
  }

  function getState() {
    return {
      started: state.started,
      startedAt: state.startedAt,
      lastDraft: state.lastDraft
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
  agenda.readFormDraft = readFormDraft;
  agenda.saveVisualDraft = saveVisualDraft;
  autoStart();
})(window);
