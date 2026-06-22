/*
  Nombre completo: cm-toast.component.js
  Ruta: carga-masiva/js/componentes/cm-toast.component.js

  Función:
    - Controlar mensajes rápidos del módulo Carga Masiva.
    - Mostrar mensajes de éxito, error, advertencia e información.
    - Centralizar nombres y tipos de toast.
    - Servir como capa visual sobre CM.UI.showToast.
    - No procesa ni guarda eventos.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - cm-app.js
    - cm-bindings.js
    - componentes/cm-summary.component.js
*/

(function initCmToastComponent(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  CM.Components = CM.Components || {};

  function show(message, type) {
    if (CM.UI && typeof CM.UI.showToast === "function") {
      CM.UI.showToast(message, type || "info");
    }
  }

  function success(message) {
    show(message || "Acción completada.", "success");
  }

  function error(message) {
    show(message || "Ocurrió un error.", "error");
  }

  function warning(message) {
    show(message || "Revisa la información.", "warning");
  }

  function info(message) {
    show(message || "Información.", "info");
  }

  function processing(message) {
    info(message || "Procesando...");
  }

  function imported(total) {
    success(`${Number(total || 0)} evento(s) agregado(s) correctamente.`);
  }

  function blockedByReview() {
    warning("Hay eventos en revisión. Corrige o confirma manualmente antes de agregar.");
  }

  function blockedByError() {
    error("Hay eventos con error. Corrige los campos obligatorios antes de agregar.");
  }

  function noEventsDetected() {
    warning("No se detectaron eventos en la carga.");
  }

  function fileReady(fileName) {
    info(`Archivo listo: ${fileName || "archivo seleccionado"}.`);
  }

  function clear() {
    if (CM.UI && typeof CM.UI.hideToast === "function") {
      CM.UI.hideToast();
    }
  }

  CM.Components.Toast = {
    show,
    success,
    error,
    warning,
    info,
    processing,
    imported,
    blockedByReview,
    blockedByError,
    noEventsDetected,
    fileReady,
    clear
  };
})(window);