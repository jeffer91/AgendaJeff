/*
  Nombre completo: ag-responsible.service.js
  Ruta: Agendador/js/servicios/ag-responsible.service.js

  Función:
    - Manejar lógica especializada de responsables.
    - Validar responsables externos.
    - Preparar opciones para selectores.
    - Buscar responsables por nombre, correo o ID.
    - No pinta interfaz directamente.
    - No guarda directamente si no usa AG.Storage.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../ag-ui.js
*/

(function initAgResponsibleService(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeEmail(value) {
    return normalizeText(value).toLowerCase();
  }

  function validateResponsibleInput(input) {
    const safeInput = input || {};
    const name = normalizeText(safeInput.name);
    const email = normalizeEmail(safeInput.email);

    if (!name) {
      throw new Error("Escribe el nombre del responsable.");
    }

    if (email && !email.includes("@")) {
      throw new Error("El correo del responsable no parece válido.");
    }

    return {
      name,
      email,
      phone: normalizeText(safeInput.phone)
    };
  }

  function createResponsible(input) {
    const validatedInput = validateResponsibleInput(input);

    return AG.Storage.createResponsible(validatedInput);
  }

  function getAllResponsibles() {
    return AG.Storage.readResponsibles();
  }

  function getExternalResponsibles() {
    return getAllResponsibles().filter((responsible) => {
      return responsible.type === "external";
    });
  }

  function getInternalResponsibles() {
    return getAllResponsibles().filter((responsible) => {
      return responsible.type !== "external";
    });
  }

  function findById(responsibleId) {
    return AG.Storage.findResponsibleById(responsibleId);
  }

  function findByName(name) {
    const normalizedName = normalizeText(name).toLowerCase();

    if (!normalizedName) {
      return null;
    }

    return getAllResponsibles().find((responsible) => {
      return normalizeText(responsible.name).toLowerCase() === normalizedName;
    }) || null;
  }

  function findByEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return null;
    }

    return getAllResponsibles().find((responsible) => {
      return normalizeEmail(responsible.email) === normalizedEmail;
    }) || null;
  }

  function searchResponsibles(query) {
    const normalizedQuery = normalizeText(query).toLowerCase();

    if (!normalizedQuery) {
      return getAllResponsibles();
    }

    return getAllResponsibles().filter((responsible) => {
      const name = normalizeText(responsible.name).toLowerCase();
      const email = normalizeText(responsible.email).toLowerCase();
      const phone = normalizeText(responsible.phone).toLowerCase();

      return name.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        phone.includes(normalizedQuery);
    });
  }

  function toSelectOption(responsible) {
    const safeResponsible = responsible || CONFIG.DEFAULT_RESPONSIBLE;
    const meta = [];

    if (safeResponsible.email) {
      meta.push(safeResponsible.email);
    }

    if (safeResponsible.phone) {
      meta.push(safeResponsible.phone);
    }

    return {
      value: safeResponsible.id,
      label: meta.length
        ? `${safeResponsible.name} · ${meta.join(" · ")}`
        : safeResponsible.name,
      type: safeResponsible.type || "internal"
    };
  }

  function toSelectOptions(responsibles) {
    const safeResponsibles = Array.isArray(responsibles)
      ? responsibles
      : getAllResponsibles();

    return safeResponsibles.map(toSelectOption);
  }

  function ensureDefaultResponsible() {
    const responsibles = AG.Storage.readResponsibles();
    const hasDefault = responsibles.some((responsible) => {
      return responsible.id === CONFIG.DEFAULT_RESPONSIBLE.id;
    });

    if (hasDefault) {
      return responsibles;
    }

    const updated = [CONFIG.DEFAULT_RESPONSIBLE].concat(responsibles);
    AG.Storage.saveResponsibles(updated);

    return updated;
  }

  function removeResponsible(responsibleId) {
    const id = normalizeText(responsibleId);

    if (!id) {
      throw new Error("Falta el ID del responsable.");
    }

    if (id === CONFIG.DEFAULT_RESPONSIBLE.id) {
      throw new Error("No se puede eliminar el responsable principal.");
    }

    const responsibles = getAllResponsibles();
    const filtered = responsibles.filter((responsible) => responsible.id !== id);

    AG.Storage.saveResponsibles(filtered);

    return {
      deleted: responsibles.length !== filtered.length,
      id
    };
  }

  AG.ResponsibleService = {
    validateResponsibleInput,
    createResponsible,
    getAllResponsibles,
    getExternalResponsibles,
    getInternalResponsibles,
    findById,
    findByName,
    findByEmail,
    searchResponsibles,
    toSelectOption,
    toSelectOptions,
    ensureDefaultResponsible,
    removeResponsible
  };
})(window);