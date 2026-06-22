/*
  Nombre completo: menu-storage.js
  Ruta: menu/js/menu-storage.js

  Función:
    - Guardar memoria del menú superior.
    - Recordar la última pantalla abierta.
    - Recordar el último grupo o submenú activo.
    - Mantener historial simple de navegación.
    - Trabajar con localStorage de forma segura.
    - No guarda datos internos de las pantallas existentes.

  Se conecta con:
    - menu/js/menu-config.js
    - menu/js/menu-router.js
    - menu/js/menu-renderer.js
    - menu/js/menu-app.js
*/

(function initMenuStorage(global) {
  "use strict";

  const MENU = global.MENU = global.MENU || {};
  const CONFIG = MENU.CONFIG;

  function hasLocalStorage() {
    try {
      const testKey = "__agendajeff_menu_test__";
      global.localStorage.setItem(testKey, "1");
      global.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  const memoryFallback = {};
  const canUseLocalStorage = hasLocalStorage();

  function readRaw(key) {
    if (!key) {
      return null;
    }

    if (!canUseLocalStorage) {
      return Object.prototype.hasOwnProperty.call(memoryFallback, key)
        ? memoryFallback[key]
        : null;
    }

    try {
      return global.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeRaw(key, value) {
    if (!key) {
      return false;
    }

    if (!canUseLocalStorage) {
      memoryFallback[key] = String(value);
      return true;
    }

    try {
      global.localStorage.setItem(key, String(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeRaw(key) {
    if (!key) {
      return false;
    }

    if (!canUseLocalStorage) {
      delete memoryFallback[key];
      return true;
    }

    try {
      global.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function readJson(key, fallbackValue) {
    const raw = readRaw(key);

    if (!raw) {
      return fallbackValue;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallbackValue;
    }
  }

  function writeJson(key, value) {
    try {
      return writeRaw(key, JSON.stringify(value));
    } catch (error) {
      return false;
    }
  }

  function getActiveRoute() {
    const storedRoute = readRaw(CONFIG.STORAGE_KEYS.activeRoute);

    if (storedRoute && MENU.ConfigService.isValidRoute(storedRoute)) {
      return storedRoute;
    }

    return CONFIG.APP.defaultRoute;
  }

  function saveActiveRoute(routeId) {
    if (!routeId || !MENU.ConfigService.isValidRoute(routeId)) {
      return false;
    }

    return writeRaw(CONFIG.STORAGE_KEYS.activeRoute, routeId);
  }

  function getActiveParent() {
    const storedParent = readRaw(CONFIG.STORAGE_KEYS.activeParent);

    if (storedParent && MENU.ConfigService.isValidRoute(storedParent)) {
      return storedParent;
    }

    return null;
  }

  function saveActiveParent(parentId) {
    if (!parentId) {
      removeRaw(CONFIG.STORAGE_KEYS.activeParent);
      return true;
    }

    if (!MENU.ConfigService.isValidRoute(parentId)) {
      return false;
    }

    return writeRaw(CONFIG.STORAGE_KEYS.activeParent, parentId);
  }

  function getOpenSubmenus() {
    const stored = readJson(CONFIG.STORAGE_KEYS.openSubmenus, {});

    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
      return {};
    }

    return stored;
  }

  function setSubmenuOpen(parentId, isOpen) {
    if (!parentId) {
      return false;
    }

    const submenus = getOpenSubmenus();

    submenus[parentId] = Boolean(isOpen);

    return writeJson(CONFIG.STORAGE_KEYS.openSubmenus, submenus);
  }

  function isSubmenuOpen(parentId) {
    if (!parentId) {
      return false;
    }

    const submenus = getOpenSubmenus();

    return Boolean(submenus[parentId]);
  }

  function getHistory() {
    const stored = readJson(CONFIG.STORAGE_KEYS.routeHistory, []);

    if (!Array.isArray(stored)) {
      return [];
    }

    return stored.filter((entry) => {
      return entry &&
        typeof entry === "object" &&
        typeof entry.routeId === "string";
    });
  }

  function saveHistory(history) {
    const cleanHistory = Array.isArray(history) ? history : [];
    const limited = cleanHistory.slice(-CONFIG.APP.historyLimit);

    return writeJson(CONFIG.STORAGE_KEYS.routeHistory, limited);
  }

  function pushHistory(routeId) {
    if (!routeId || !MENU.ConfigService.isValidRoute(routeId)) {
      return [];
    }

    const history = getHistory();
    const lastEntry = history[history.length - 1];

    if (lastEntry && lastEntry.routeId === routeId) {
      lastEntry.updatedAt = new Date().toISOString();
      saveHistory(history);
      return history;
    }

    history.push({
      routeId,
      createdAt: new Date().toISOString()
    });

    saveHistory(history);

    return history;
  }

  function getPreviousRoute(currentRouteId) {
    const history = getHistory();

    if (!history.length) {
      return null;
    }

    const reversed = history.slice().reverse();

    for (let index = 0; index < reversed.length; index += 1) {
      const entry = reversed[index];

      if (
        entry.routeId &&
        entry.routeId !== currentRouteId &&
        MENU.ConfigService.isValidRoute(entry.routeId)
      ) {
        return entry.routeId;
      }
    }

    return null;
  }

  function saveSnapshot(snapshot) {
    const payload = Object.assign(
      {
        savedAt: new Date().toISOString()
      },
      snapshot || {}
    );

    return writeJson(CONFIG.STORAGE_KEYS.lastSnapshot, payload);
  }

  function getSnapshot() {
    return readJson(CONFIG.STORAGE_KEYS.lastSnapshot, null);
  }

  function clearMenuMemory() {
    removeRaw(CONFIG.STORAGE_KEYS.activeRoute);
    removeRaw(CONFIG.STORAGE_KEYS.activeParent);
    removeRaw(CONFIG.STORAGE_KEYS.openSubmenus);
    removeRaw(CONFIG.STORAGE_KEYS.routeHistory);
    removeRaw(CONFIG.STORAGE_KEYS.lastSnapshot);
  }

  MENU.Storage = {
    readRaw,
    writeRaw,
    removeRaw,
    readJson,
    writeJson,
    getActiveRoute,
    saveActiveRoute,
    getActiveParent,
    saveActiveParent,
    getOpenSubmenus,
    setSubmenuOpen,
    isSubmenuOpen,
    getHistory,
    pushHistory,
    getPreviousRoute,
    saveSnapshot,
    getSnapshot,
    clearMenuMemory
  };
})(window);