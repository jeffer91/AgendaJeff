/*
  Nombre completo: ag-toast.component.js
  Ruta: Agendador/js/componentes/ag-toast.component.js

  Función:
    - Componente para mostrar mensajes rápidos.
    - Muestra éxito, error, advertencia e información.
    - No guarda datos.
    - No sincroniza conexiones.
    - Reutiliza el contenedor #agToast.

  Se conecta con:
    - ../ag-config.js
    - ../ag-ui.js
*/

(function initAgToastComponent(global) {
  "use strict";

  const AG = global.AG = global.AG || {};

  AG.Components = AG.Components || {};

  let timer = null;

  function getElement() {
    return document.getElementById("agToast");
  }

  function clearClasses(element) {
    element.classList.remove(
      "ag-toast--success",
      "ag-toast--error",
      "ag-toast--warning",
      "ag-toast--info"
    );
  }

  function show(message, type, duration) {
    const element = getElement();

    if (!element) {
      return;
    }

    const safeType = type || "info";
    const safeDuration = Number(duration || 2600);

    clearTimeout(timer);
    clearClasses(element);

    element.textContent = String(message || "");
    element.classList.add(`ag-toast--${safeType}`);
    element.classList.remove("ag-hidden");

    timer = setTimeout(() => {
      hide();
    }, safeDuration);
  }

  function hide() {
    const element = getElement();

    if (!element) {
      return;
    }

    element.classList.add("ag-hidden");
  }

  function success(message, duration) {
    show(message || "Acción realizada correctamente.", "success", duration);
  }

  function error(message, duration) {
    show(message || "Ocurrió un error.", "error", duration || 3500);
  }

  function warning(message, duration) {
    show(message || "Revisa esta acción.", "warning", duration || 3200);
  }

  function info(message, duration) {
    show(message || "Información.", "info", duration);
  }

  AG.Components.Toast = {
    show,
    hide,
    success,
    error,
    warning,
    info
  };
})(window);