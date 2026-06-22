/*
  Nombre completo: menu-app.js
  Ruta: menu/js/menu-app.js

  Función:
    - Inicializar la capa externa del menú superior.
    - Conectar botones del menú con el router.
    - Restaurar la última pantalla visitada.
    - Coordinar renderizado, memoria y navegación.
    - Mantener las pantallas existentes intactas.
    - Preparar el comportamiento para navegador y Electron.

  Se conecta con:
    - index.html
    - menu/js/menu-config.js
    - menu/js/menu-storage.js
    - menu/js/menu-router.js
    - menu/js/menu-renderer.js
*/

(function initMenuApp(global) {
  "use strict";

  const MENU = global.MENU = global.MENU || {};
  const CONFIG = MENU.CONFIG;

  let initialized = false;

  function byId(id) {
    return global.document.getElementById(id);
  }

  function isRequiredServiceReady() {
    return Boolean(
      MENU.CONFIG &&
      MENU.ConfigService &&
      MENU.Storage &&
      MENU.Router &&
      MENU.Renderer
    );
  }

  function navigateFromElement(element) {
    if (!element) {
      return;
    }

    const routeId = element.dataset.menuRoute;

    if (!routeId) {
      return;
    }

    const route = MENU.ConfigService.getRouteById(routeId);

    if (!route || route.enabled === false) {
      return;
    }

    MENU.Router.navigateTo(routeId);
  }

  function handleMainNavClick(event) {
    const button = event.target.closest("[data-menu-route]");

    if (!button) {
      return;
    }

    event.preventDefault();
    navigateFromElement(button);
  }

  function handleBackClick(event) {
    event.preventDefault();
    MENU.Router.goBack();
  }

  function handleReloadClick(event) {
    event.preventDefault();
    MENU.Router.reloadCurrent();
  }

  function handleKeyboardShortcuts(event) {
    const isCtrlOrMeta = event.ctrlKey || event.metaKey;

    if (!isCtrlOrMeta) {
      return;
    }

    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      MENU.Router.reloadCurrent();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      MENU.Router.goBack();
    }
  }

  function bindEvents() {
    const mainNav = byId(CONFIG.DOM_IDS.mainNav);
    const subnav = byId(CONFIG.DOM_IDS.subnav);
    const backButton = byId(CONFIG.DOM_IDS.backButton);
    const reloadButton = byId(CONFIG.DOM_IDS.reloadButton);

    if (mainNav) {
      mainNav.addEventListener("click", handleMainNavClick);
    }

    if (subnav) {
      subnav.addEventListener("click", handleMainNavClick);
    }

    if (backButton) {
      backButton.addEventListener("click", handleBackClick);
    }

    if (reloadButton) {
      reloadButton.addEventListener("click", handleReloadClick);
    }

    global.document.addEventListener("keydown", handleKeyboardShortcuts);

    global.addEventListener("menu:route-changed", (event) => {
      const route = event.detail ? event.detail.route : null;
      MENU.Renderer.render(route);
    });

    global.addEventListener("menu:frame-loaded", (event) => {
      const route = event.detail ? event.detail.route : null;
      MENU.Renderer.render(route);
    });

    global.addEventListener("menu:frame-error", (event) => {
      const route = event.detail ? event.detail.route : null;
      MENU.Renderer.showFrameError(route);
      MENU.Renderer.render(route);
    });

    global.addEventListener("menu:navigation-timeout", (event) => {
      const route = event.detail ? event.detail.route : null;
      MENU.Renderer.showFrameError(route);
      MENU.Renderer.render(route);
    });
  }

  function exposeForElectron() {
    global.AgendaJeffMenu = {
      navigateTo: MENU.Router.navigateTo,
      reloadCurrent: MENU.Router.reloadCurrent,
      goBack: MENU.Router.goBack,
      getCurrentRoute: MENU.Router.getCurrentRoute,
      getSnapshot: MENU.Storage.getSnapshot,
      clearMenuMemory: MENU.Storage.clearMenuMemory
    };
  }

  function init() {
    if (initialized) {
      return {
        ok: true,
        skipped: true,
        message: "El menú ya estaba inicializado."
      };
    }

    if (!isRequiredServiceReady()) {
      throw new Error(
        "No se pudo iniciar el menú: falta cargar config, storage, router o renderer."
      );
    }

    initialized = true;

    bindEvents();
    exposeForElectron();

    MENU.Renderer.render();

    const result = MENU.Router.restoreLastRoute();

    return {
      ok: true,
      message: "Menú superior iniciado correctamente.",
      route: result.route || null
    };
  }

  global.document.addEventListener("DOMContentLoaded", () => {
    try {
      init();
    } catch (error) {
      const currentPath = byId(CONFIG.DOM_IDS.currentPath);

      if (currentPath) {
        currentPath.textContent = error.message;
      }

      console.error(error);
    }
  });

  MENU.App = {
    init
  };
})(window);