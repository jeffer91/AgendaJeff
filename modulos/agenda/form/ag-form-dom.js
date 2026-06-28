/*
  Nombre completo: ag-form-dom.js
  Ruta: modulos/agenda/form/ag-form-dom.js

  Función:
    - Centralizar acceso seguro a elementos DOM y puente Electron para el módulo Agenda.
*/

(function initAgendaFormDom(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const agenda = root.Agenda = root.Agenda || {};

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

  function setText(id, value) {
    const element = getElement(id);
    if (element) element.textContent = value;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"]/g, function replaceChar(char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char];
    });
  }

  agenda.dom = Object.freeze({ getElement, getBridge, setOutput, setText, escapeHtml });
})(window);
