/*
  Nombre completo: aj-start.js
  Ruta: modulos/ajustes/startup/aj-start.js

  Función:
    - Iniciar pantalla Ajustes.
    - Exponer estado visual de preferencias base sin guardar todavía.
*/

(function initAjustesModule(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const ajustes = root.Ajustes = root.Ajustes || {};

  const state = {
    started: false,
    startedAt: ""
  };

  function getElement(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function readSettingsDraft() {
    return {
      runInBackground: getElement("ajRunInBackground") ? getElement("ajRunInBackground").checked : true,
      askStartWindows: getElement("ajAskStartWindows") ? getElement("ajAskStartWindows").checked : true,
      lowResourceMode: getElement("ajLowResourceMode") ? getElement("ajLowResourceMode").checked : true,
      autoUpdate: getElement("ajAutoUpdate") ? getElement("ajAutoUpdate").checked : true,
      confirmInstall: getElement("ajConfirmInstall") ? getElement("ajConfirmInstall").checked : true
    };
  }

  function renderState() {
    const output = getElement("ajResultBox");
    if (!output) return;

    output.textContent = JSON.stringify({
      ok: true,
      module: "ajustes",
      message: "Pantalla Ajustes base cargada. Persistencia pendiente para bloque de base local.",
      settingsDraft: readSettingsDraft(),
      checkedAt: new Date().toISOString()
    }, null, 2);
  }

  function attachEvents() {
    ["ajRunInBackground", "ajAskStartWindows", "ajLowResourceMode", "ajAutoUpdate", "ajConfirmInstall"].forEach(function eachId(id) {
      const element = getElement(id);
      if (element) element.addEventListener("change", renderState);
    });
  }

  function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();
    attachEvents();
    renderState();
    return getState();
  }

  function getState() {
    return {
      started: state.started,
      startedAt: state.startedAt,
      settingsDraft: readSettingsDraft()
    };
  }

  function autoStart() {
    if (!global.document || global.document.readyState !== "loading") {
      start();
      return;
    }

    global.document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  ajustes.start = start;
  ajustes.getState = getState;
  ajustes.readSettingsDraft = readSettingsDraft;
  autoStart();
})(window);
