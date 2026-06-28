/*
  Nombre completo: ag-start.js
  Ruta: modulos/agenda/startup/ag-start.js

  Función:
    - Iniciar la pantalla Agenda.
    - Guardar eventos, recordatorios y pendientes en la base local JSON cuando Electron esté disponible.
*/

(function initAgendaModule(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const agenda = root.Agenda = root.Agenda || {};

  const state = {
    started: false,
    startedAt: "",
    lastDraft: null,
    lastSavedResult: null
  };

  function getElement(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function getBridge() {
    try {
      if (global.AgendaJeffElectron) return global.AgendaJeffElectron;
      if (global.parent && global.parent.AgendaJeffElectron) return global.parent.AgendaJeffElectron;
    } catch (error) {
      return null;
    }
    return null;
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
      repeticion: {
        tipo: getElement("agRepeat") ? getElement("agRepeat").value : "none"
      },
      canales: {
        escritorio: true,
        telegram: true,
        googleCalendar: true
      },
      recordatorios: {
        cincoDiasAntes: true,
        tresDiasAntes: true,
        unDiaAntes: true,
        mismoDia: true,
        usarDiasLaborables: false,
        horasSinHora: ["06:00", "13:00", "17:00"],
        horasPendiente: ["06:00", "17:00"]
      },
      origen: {
        tipo: "manual",
        archivo: "",
        textoOriginal: ""
      },
      creadoEn: new Date().toISOString()
    };
  }

  async function saveVisualDraft() {
    const bridge = getBridge();
    state.lastDraft = readFormDraft();

    if (!bridge || typeof bridge.saveAgendaItem !== "function") {
      setOutput({
        ok: false,
        action: "saveAgendaItem",
        message: "No se detectó el puente Electron. Se muestra solo el borrador visual.",
        data: state.lastDraft
      });
      return state.lastDraft;
    }

    const result = await bridge.saveAgendaItem(state.lastDraft);
    state.lastSavedResult = result;
    setOutput(result);

    if (result && result.ok) {
      clearForm(false);
    }

    return result;
  }

  function clearForm(renderMessage) {
    const form = getElement("agEventForm");
    if (form && typeof form.reset === "function") form.reset();
    state.lastDraft = null;

    if (renderMessage !== false) {
      setOutput({ ok: true, action: "clear", message: "Formulario limpiado." });
    }
  }

  function attachEvents() {
    const saveButton = getElement("agBtnSaveDraft");
    const clearButton = getElement("agBtnClear");
    if (saveButton) saveButton.addEventListener("click", saveVisualDraft);
    if (clearButton) clearButton.addEventListener("click", function handleClear() { clearForm(true); });
  }

  async function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();
    attachEvents();

    const bridge = getBridge();
    const ensureResult = bridge && typeof bridge.ensureLocalDatabase === "function"
      ? await bridge.ensureLocalDatabase()
      : { ok: false, message: "Puente Electron no disponible." };

    setOutput({
      ok: true,
      module: "agenda",
      message: "Pantalla Agenda conectada a base local JSON cuando Electron está disponible.",
      localDatabase: ensureResult,
      checkedAt: state.startedAt
    });
    return getState();
  }

  function getState() {
    return {
      started: state.started,
      startedAt: state.startedAt,
      lastDraft: state.lastDraft,
      lastSavedResult: state.lastSavedResult
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
