/*
  Nombre completo: ag-bindings.js
  Ruta: Agendador/js/ag-bindings.js

  Función:
    - Conectar botones, formularios y acciones del HTML con AG.App.
    - Iniciar el Agendador cuando carga el documento.
    - Evitar duplicar eventos de escucha.
    - Permitir acciones de lista:
        completar
        duplicar
        sincronizar
        eliminar
    - No contiene lógica de negocio.

  Se conecta con:
    - ag-config.js
    - ag-storage.js
    - ag-ui.js
    - ag-app.js
    - componentes/ag-responsible-modal.component.js
*/

(function initAgBindings(global) {
  "use strict";

  const AG = global.AG = global.AG || {};

  let started = false;

  function bindFormEvents(elements) {
    elements.itemForm.addEventListener("submit", AG.App.createItemFromForm);

    elements.resetFormBtn.addEventListener("click", AG.App.resetForm);

    elements.type.addEventListener("change", AG.App.handleTypeChange);
  }

  function bindFilterEvents() {
    document.querySelectorAll(".ag-filter-btn").forEach((button) => {
      button.addEventListener("click", () => {
        AG.App.setFilter(button.dataset.filter);
      });
    });
  }

  function bindListEvents(elements) {
    elements.itemList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action][data-id]");

      if (!button) {
        return;
      }

      AG.App.handleItemAction(button.dataset.action, button.dataset.id);
    });
  }

  function bindResponsibleModalEvents(elements) {
    if (
      AG.Components &&
      AG.Components.ResponsibleModal &&
      typeof AG.Components.ResponsibleModal.bind === "function"
    ) {
      AG.Components.ResponsibleModal.bind();
      return;
    }

    elements.openResponsibleModalBtn.addEventListener(
      "click",
      AG.UI.openResponsibleModal
    );

    elements.closeResponsibleModalBtn.addEventListener(
      "click",
      AG.UI.closeResponsibleModal
    );

    elements.cancelResponsibleBtn.addEventListener(
      "click",
      AG.UI.closeResponsibleModal
    );

    elements.saveResponsibleBtn.addEventListener(
      "click",
      AG.App.addResponsibleFromModal
    );

    elements.responsibleModal.addEventListener("click", (event) => {
      if (event.target && event.target.dataset.closeModal === "true") {
        AG.UI.closeResponsibleModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        AG.UI.closeResponsibleModal();
      }
    });
  }

  function bindDemoEvents(elements) {
    elements.seedDemoBtn.addEventListener("click", AG.App.createDemoItems);
  }

  function bindEvents() {
    const elements = AG.UI.getElements();

    bindFormEvents(elements);
    bindFilterEvents();
    bindListEvents(elements);
    bindResponsibleModalEvents(elements);
    bindDemoEvents(elements);
  }

  function start() {
    if (started) {
      return;
    }

    started = true;

    bindEvents();
    AG.App.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  AG.Bindings = {
    start,
    bindEvents
  };
})(window);