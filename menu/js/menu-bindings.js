/*
  Nombre completo: menu-bindings.js
  Ruta: menu/js/menu-bindings.js

  Función:
    - Centralizar bindings adicionales del menú superior.
    - Preparar integración limpia para Electron.
    - Escuchar acciones globales sin tocar las pantallas internas.
    - Exponer utilidades de navegación seguras.
    - Complementar menu-app.js sin reemplazarlo.
    - No modifica Agendador, Carga Masiva ni conexiones.

  Se conecta con:
    - index.html
    - menu/js/menu-config.js
    - menu/js/menu-storage.js
    - menu/js/menu-router.js
    - menu/js/menu-renderer.js
    - menu/js/menu-app.js
    - electron/preload.js
*/

(function initMenuBindings(global) {
  "use strict";

  const MENU = global.MENU = global.MENU || {};
  const CONFIG = MENU.CONFIG;

  let initialized = false;

  function isReady() {
    return Boolean(
      CONFIG &&
      MENU.Router &&
      MENU.Storage &&
      MENU.Renderer
    );
  }

  function getElectronBridge() {
    return global.AgendaJeffElectron || null;
  }

  function emit(name, detail) {
    global.dispatchEvent(
      new CustomEvent(name, {
        detail: detail || {}
      })
    );
  }

  function saveSnapshotForElectron(route) {
    const electronBridge = getElectronBridge();

    if (!electronBridge || !electronBridge.menu) {
      return;
    }

    const snapshot = {
      routeId: route ? route.id : MENU.Storage.getActiveRoute(),
      routeLabel: route ? route.label : "",
      activeParent: route && route.parent ? route.parent : MENU.Storage.getActiveParent(),
      savedAt: new Date().toISOString()
    };

    try {
      electronBridge.menu.saveLastSnapshot(snapshot);
    } catch (error) {
      console.warn("No se pudo enviar snapshot a Electron.", error);
    }
  }

  function bindElectronAwareness() {
    const electronBridge = getElectronBridge();

    if (!electronBridge) {
      return;
    }

    global.document.documentElement.classList.add("is-electron");

    electronBridge.app.getInfo()
      .then((info) => {
        emit("menu:electron-ready", info || {});
      })
      .catch((error) => {
        emit("menu:electron-error", {
          message: error.message
        });
      });
  }

  function bindRouteSnapshot() {
    global.addEventListener("menu:route-changed", (event) => {
      const route = event.detail ? event.detail.route : null;

      saveSnapshotForElectron(route);
    });

    global.addEventListener("menu:frame-loaded", (event) => {
      const route = event.detail ? event.detail.route : null;

      saveSnapshotForElectron(route);
    });
  }

  function bindSafePublicApi() {
    global.AgendaJeffMenuBindings = {
      navigate(routeId) {
        return MENU.Router.navigateTo(routeId);
      },

      reload() {
        return MENU.Router.reloadCurrent();
      },

      back() {
        return MENU.Router.goBack();
      },

      current() {
        return MENU.Router.getCurrentRoute();
      },

      memory() {
        return {
          activeRoute: MENU.Storage.getActiveRoute(),
          activeParent: MENU.Storage.getActiveParent(),
          history: MENU.Storage.getHistory(),
          snapshot: MENU.Storage.getSnapshot()
        };
      },

      clearMemory() {
        MENU.Storage.clearMenuMemory();
        MENU.Router.navigateTo(CONFIG.APP.defaultRoute, { force: true });

        return {
          ok: true,
          message: "Memoria del menú limpiada."
        };
      }
    };
  }

  function init() {
    if (initialized) {
      return {
        ok: true,
        skipped: true,
        message: "Bindings del menú ya estaban inicializados."
      };
    }

    if (!isReady()) {
      return {
        ok: false,
        message: "No se pudieron iniciar bindings: faltan servicios del menú."
      };
    }

    initialized = true;

    bindElectronAwareness();
    bindRouteSnapshot();
    bindSafePublicApi();

    return {
      ok: true,
      message: "Bindings del menú iniciados correctamente."
    };
  }

  global.document.addEventListener("DOMContentLoaded", () => {
    init();
  });

  MENU.Bindings = {
    init
  };
})(window);