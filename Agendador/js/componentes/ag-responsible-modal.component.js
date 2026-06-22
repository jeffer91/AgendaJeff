/*
  Nombre completo: ag-responsible-modal.component.js
  Ruta: Agendador/js/componentes/ag-responsible-modal.component.js

  Función:
    - Componente visual para el modal de responsables externos.
    - Abre y cierra el modal.
    - Lee los campos del responsable.
    - Valida campos básicos antes de guardar.
    - Limpia campos al cerrar.
    - No guarda directamente en localStorage, salvo que se use saveFromModal().

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../ag-ui.js
    - ../servicios/ag-responsible.service.js
*/

(function initAgResponsibleModalComponent(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Components = AG.Components || {};

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function getElements() {
    return {
      modal: document.getElementById("agResponsibleModal"),
      openBtn: document.getElementById("agOpenResponsibleModalBtn"),
      closeBtn: document.getElementById("agCloseResponsibleModalBtn"),
      cancelBtn: document.getElementById("agCancelResponsibleBtn"),
      saveBtn: document.getElementById("agSaveResponsibleBtn"),
      name: document.getElementById("agResponsibleName"),
      email: document.getElementById("agResponsibleEmail"),
      phone: document.getElementById("agResponsiblePhone"),
      responsibleSelect: document.getElementById("agResponsible")
    };
  }

  function isOpen() {
    const elements = getElements();

    return elements.modal &&
      !elements.modal.classList.contains("ag-hidden");
  }

  function open() {
    const elements = getElements();

    if (!elements.modal) {
      return;
    }

    elements.modal.classList.remove("ag-hidden");
    elements.modal.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      if (elements.name) {
        elements.name.focus();
      }
    }, 50);
  }

  function clear() {
    const elements = getElements();

    if (elements.name) {
      elements.name.value = "";
    }

    if (elements.email) {
      elements.email.value = "";
    }

    if (elements.phone) {
      elements.phone.value = "";
    }
  }

  function close() {
    const elements = getElements();

    if (!elements.modal) {
      return;
    }

    elements.modal.classList.add("ag-hidden");
    elements.modal.setAttribute("aria-hidden", "true");

    clear();
  }

  function read() {
    const elements = getElements();

    return {
      name: elements.name ? elements.name.value : "",
      email: elements.email ? elements.email.value : "",
      phone: elements.phone ? elements.phone.value : ""
    };
  }

  function validate(input) {
    const safeInput = input || read();
    const name = normalizeText(safeInput.name);
    const email = normalizeText(safeInput.email).toLowerCase();
    const phone = normalizeText(safeInput.phone);

    if (!name) {
      throw new Error("Escribe el nombre del responsable.");
    }

    if (email && !email.includes("@")) {
      throw new Error("El correo del responsable no parece válido.");
    }

    return {
      name,
      email,
      phone
    };
  }

  function renderResponsibles(selectedId) {
    const responsibles = AG.Storage.readResponsibles();

    if (AG.UI && typeof AG.UI.renderResponsibles === "function") {
      AG.UI.renderResponsibles(responsibles, selectedId || CONFIG.DEFAULT_RESPONSIBLE.id);
    }

    return responsibles;
  }

  function saveFromModal() {
    const input = validate(read());

    let responsible;

    if (
      AG.ResponsibleService &&
      typeof AG.ResponsibleService.createResponsible === "function"
    ) {
      responsible = AG.ResponsibleService.createResponsible(input);
    } else {
      responsible = AG.Storage.createResponsible(input);
    }

    renderResponsibles(responsible.id);
    close();

    if (AG.Components.Toast) {
      AG.Components.Toast.success("Responsable agregado.");
    } else if (AG.UI && typeof AG.UI.showToast === "function") {
      AG.UI.showToast("Responsable agregado.");
    }

    return responsible;
  }

  function bind() {
    const elements = getElements();

    if (elements.openBtn) {
      elements.openBtn.addEventListener("click", open);
    }

    if (elements.closeBtn) {
      elements.closeBtn.addEventListener("click", close);
    }

    if (elements.cancelBtn) {
      elements.cancelBtn.addEventListener("click", close);
    }

    if (elements.saveBtn) {
      elements.saveBtn.addEventListener("click", () => {
        try {
          const responsible = saveFromModal();

          if (AG.UI && typeof AG.UI.setOutput === "function") {
            AG.UI.setOutput({
              ok: true,
              message: "Responsable externo agregado correctamente.",
              responsible
            });
          }
        } catch (error) {
          if (AG.Components.Toast) {
            AG.Components.Toast.error(error.message);
          } else if (AG.UI && typeof AG.UI.showToast === "function") {
            AG.UI.showToast(error.message);
          }

          if (AG.UI && typeof AG.UI.setOutput === "function") {
            AG.UI.setOutput({
              ok: false,
              message: error.message
            });
          }
        }
      });
    }

    if (elements.modal) {
      elements.modal.addEventListener("click", (event) => {
        if (event.target && event.target.dataset.closeModal === "true") {
          close();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) {
        close();
      }

      if (event.key === "Enter" && isOpen()) {
        const activeElement = document.activeElement;
        const isInsideModal = elements.modal && elements.modal.contains(activeElement);

        if (isInsideModal) {
          event.preventDefault();

          try {
            saveFromModal();
          } catch (error) {
            if (AG.Components.Toast) {
              AG.Components.Toast.error(error.message);
            }
          }
        }
      }
    });
  }

  AG.Components.ResponsibleModal = {
    getElements,
    isOpen,
    open,
    close,
    clear,
    read,
    validate,
    renderResponsibles,
    saveFromModal,
    bind
  };
})(window);