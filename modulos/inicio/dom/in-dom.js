/*
  Nombre completo: in-dom.js
  Ruta: modulos/inicio/dom/in-dom.js

  Función:
    - Centralizar acceso DOM y puente Electron para la pantalla Inicio.
*/

(function initInicioDom(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const inicio = root.Inicio = root.Inicio || {};

  function getElement(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function setText(id, value) {
    const element = getElement(id);
    if (element) element.textContent = value === null || value === undefined ? "" : String(value);
  }

  function setHtml(id, value) {
    const element = getElement(id);
    if (element) element.innerHTML = value || "";
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

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"]/g, function replaceChar(char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char];
    });
  }

  function todayIsoDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  function addDaysIso(days) {
    const date = new Date();
    date.setDate(date.getDate() + Number(days || 0));
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function openAgendaModule() {
    try {
      if (global.parent && global.parent.AgendaJeffShell && typeof global.parent.AgendaJeffShell.openModule === "function") {
        global.parent.AgendaJeffShell.openModule("agenda");
        return true;
      }

      if (global.parent && global.parent.document) {
        const frame = global.parent.document.getElementById("moduleFrame");
        if (frame) frame.src = "modulos/agenda/ag-module.html";

        global.parent.document.querySelectorAll(".aj-nav-button[data-module]").forEach(function eachButton(button) {
          button.classList.toggle("is-active", button.dataset.module === "agenda");
        });

        const footer = global.parent.document.getElementById("footerStatus");
        if (footer) footer.textContent = "Agenda · Cargando módulo";
        return Boolean(frame);
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  inicio.dom = Object.freeze({ getElement, setText, setHtml, getBridge, escapeHtml, todayIsoDate, addDaysIso, openAgendaModule });
})(window);
