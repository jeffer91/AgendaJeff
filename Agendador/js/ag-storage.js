/*
  Nombre completo: ag-storage.js
  Ruta: Agendador/js/ag-storage.js

  Función:
    - Manejar la base local del Agendador usando localStorage.
    - Guardar, leer, actualizar y eliminar eventos/pendientes/recordatorios.
    - Guardar responsables externos.
    - Guardar estados visuales de conexiones.
    - No pinta interfaz directamente.

  Se conecta con:
    - ag-config.js
    - servicios/ag-event.service.js
    - ag-app.js
    - ag-ui.js
*/

(function initAgStorage(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  function nowIso() {
    return new Date().toISOString();
  }

  function safeJsonParse(rawValue, fallbackValue) {
    try {
      if (!rawValue) {
        return fallbackValue;
      }

      return JSON.parse(rawValue);
    } catch (error) {
      return fallbackValue;
    }
  }

  function readKey(key, fallbackValue) {
    return safeJsonParse(global.localStorage.getItem(key), fallbackValue);
  }

  function writeKey(key, value) {
    global.localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function createId(prefix) {
    const safePrefix = normalizeText(prefix) || "ag";
    const random = Math.random().toString(36).slice(2, 8);
    return `${safePrefix}-${Date.now()}-${random}`;
  }

  function readItems() {
    const items = readKey(CONFIG.STORAGE_KEYS.ITEMS, []);

    if (!Array.isArray(items)) {
      return [];
    }

    return items;
  }

  function saveItems(items) {
    const safeItems = Array.isArray(items) ? items : [];
    return writeKey(CONFIG.STORAGE_KEYS.ITEMS, safeItems);
  }

  function saveItem(item) {
    if (!item || typeof item !== "object") {
      throw new Error("No se puede guardar un registro vacío.");
    }

    const items = readItems();
    const index = items.findIndex((currentItem) => currentItem.id === item.id);
    const itemToSave = {
      ...item,
      updatedAt: nowIso()
    };

    if (index >= 0) {
      items[index] = itemToSave;
    } else {
      items.unshift(itemToSave);
    }

    saveItems(items);

    return itemToSave;
  }

  function findItemById(itemId) {
    const id = normalizeText(itemId);

    if (!id) {
      return null;
    }

    return readItems().find((item) => item.id === id) || null;
  }

  function updateItem(itemId, patch) {
    const id = normalizeText(itemId);

    if (!id) {
      throw new Error("Falta el ID del registro.");
    }

    const items = readItems();
    const index = items.findIndex((item) => item.id === id);

    if (index < 0) {
      throw new Error("No se encontró el registro para actualizar.");
    }

    const updatedItem = {
      ...items[index],
      ...(patch || {}),
      updatedAt: nowIso()
    };

    items[index] = updatedItem;
    saveItems(items);

    return updatedItem;
  }

  function deleteItem(itemId) {
    const id = normalizeText(itemId);

    if (!id) {
      throw new Error("Falta el ID del registro.");
    }

    const items = readItems();
    const filteredItems = items.filter((item) => item.id !== id);

    saveItems(filteredItems);

    return {
      deleted: items.length !== filteredItems.length,
      id
    };
  }

  function markCompleted(itemId) {
    return updateItem(itemId, {
      status: CONFIG.STATUS.COMPLETED,
      completedAt: nowIso()
    });
  }

  function readResponsibles() {
    const responsibles = readKey(CONFIG.STORAGE_KEYS.RESPONSIBLES, []);

    if (!Array.isArray(responsibles)) {
      return [CONFIG.DEFAULT_RESPONSIBLE];
    }

    const hasDefaultResponsible = responsibles.some(
      (responsible) => responsible && responsible.id === CONFIG.DEFAULT_RESPONSIBLE.id
    );

    if (!hasDefaultResponsible) {
      return [CONFIG.DEFAULT_RESPONSIBLE].concat(responsibles);
    }

    return responsibles;
  }

  function saveResponsibles(responsibles) {
    const safeResponsibles = Array.isArray(responsibles) ? responsibles : [];
    return writeKey(CONFIG.STORAGE_KEYS.RESPONSIBLES, safeResponsibles);
  }

  function createResponsible(input) {
    const safeInput = input || {};
    const name = normalizeText(safeInput.name);
    const email = normalizeText(safeInput.email);
    const phone = normalizeText(safeInput.phone);

    if (!name) {
      throw new Error("Escribe el nombre del responsable.");
    }

    const responsibles = readResponsibles();
    const duplicated = responsibles.some(
      (responsible) => normalizeText(responsible.name).toLowerCase() === name.toLowerCase()
    );

    if (duplicated) {
      throw new Error("Ese responsable ya existe.");
    }

    const responsible = {
      id: createId("ag-responsible"),
      name,
      email,
      phone,
      type: "external",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    responsibles.push(responsible);
    saveResponsibles(responsibles);

    return responsible;
  }

  function findResponsibleById(responsibleId) {
    const id = normalizeText(responsibleId);

    return readResponsibles().find((responsible) => responsible.id === id) ||
      CONFIG.DEFAULT_RESPONSIBLE;
  }

  function createDefaultConnectionStatus() {
    return {
      local: {
        status: CONFIG.CONNECTION_STATUS.OK,
        label: CONFIG.CONNECTION_LABELS.local,
        message: "Base local lista.",
        checkedAt: nowIso()
      },
      firebase: {
        status: CONFIG.CONNECTION_STATUS.IDLE,
        label: CONFIG.CONNECTION_LABELS.firebase,
        message: "Adaptador pendiente.",
        checkedAt: ""
      },
      telegram: {
        status: CONFIG.CONNECTION_STATUS.IDLE,
        label: CONFIG.CONNECTION_LABELS.telegram,
        message: "Adaptador pendiente.",
        checkedAt: ""
      },
      googleCalendar: {
        status: CONFIG.CONNECTION_STATUS.IDLE,
        label: CONFIG.CONNECTION_LABELS.googleCalendar,
        message: "Adaptador pendiente.",
        checkedAt: ""
      },
      microsoftCalendar: {
        status: CONFIG.CONNECTION_STATUS.IDLE,
        label: CONFIG.CONNECTION_LABELS.microsoftCalendar,
        message: "Adaptador pendiente.",
        checkedAt: ""
      },
      desktopNotifications: {
        status: CONFIG.CONNECTION_STATUS.IDLE,
        label: CONFIG.CONNECTION_LABELS.desktopNotifications,
        message: "Adaptador pendiente.",
        checkedAt: ""
      }
    };
  }

  function readConnectionStatus() {
    const savedStatus = readKey(
      CONFIG.STORAGE_KEYS.CONNECTION_STATUS,
      createDefaultConnectionStatus()
    );

    return {
      ...createDefaultConnectionStatus(),
      ...(savedStatus || {})
    };
  }

  function saveConnectionStatus(status) {
    return writeKey(CONFIG.STORAGE_KEYS.CONNECTION_STATUS, {
      ...readConnectionStatus(),
      ...(status || {})
    });
  }

  function setConnectionStatus(connectionName, status, message) {
    const name = normalizeText(connectionName);

    if (!name) {
      throw new Error("Falta el nombre de la conexión.");
    }

    const allStatus = readConnectionStatus();

    allStatus[name] = {
      ...(allStatus[name] || {}),
      status: normalizeText(status) || CONFIG.CONNECTION_STATUS.IDLE,
      label: CONFIG.CONNECTION_LABELS[name] || name,
      message: normalizeText(message),
      checkedAt: nowIso()
    };

    saveConnectionStatus(allStatus);

    return allStatus[name];
  }

  function readActiveFilter() {
    return normalizeText(
      global.localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_FILTER)
    ) || CONFIG.FILTERS.UPCOMING;
  }

  function saveActiveFilter(filterName) {
    const filter = normalizeText(filterName) || CONFIG.FILTERS.UPCOMING;
    global.localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_FILTER, filter);
    return filter;
  }

  function clearAllLocalData() {
    global.localStorage.removeItem(CONFIG.STORAGE_KEYS.ITEMS);
    global.localStorage.removeItem(CONFIG.STORAGE_KEYS.RESPONSIBLES);
    global.localStorage.removeItem(CONFIG.STORAGE_KEYS.CONNECTION_STATUS);
    global.localStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVE_FILTER);

    return {
      ok: true,
      clearedAt: nowIso()
    };
  }

  AG.Storage = {
    nowIso,
    normalizeText,
    createId,

    readItems,
    saveItems,
    saveItem,
    findItemById,
    updateItem,
    deleteItem,
    markCompleted,

    readResponsibles,
    saveResponsibles,
    createResponsible,
    findResponsibleById,

    createDefaultConnectionStatus,
    readConnectionStatus,
    saveConnectionStatus,
    setConnectionStatus,

    readActiveFilter,
    saveActiveFilter,

    clearAllLocalData
  };
})(window);