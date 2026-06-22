/*
  Nombre completo: menu-router.js
  Ruta: menu/js/menu-router.js

  Función:
    - Manejar la navegación entre pantallas existentes.
    - Cargar pantallas dentro del iframe principal.
    - Recordar la pantalla abierta usando menu-storage.js.
    - Resolver rutas principales, submenús y grupos.
    - Evitar encabezados dobles porque no genera encabezados externos por pantalla.
    - Mantener intactas las carpetas internas de cada módulo.

  Se conecta con:
    - index.html
    - menu/js/menu-config.js
    - menu/js/menu-storage.js
    - menu/js/menu-renderer.js
    - menu/js/menu-app.js
*/

(function initMenuRouter(global) {
  "use strict";

  const MENU = global.MENU = global.MENU || {};
  const CONFIG = MENU.CONFIG;

  let currentRoute = null;
  let isNavigating = false;
  let loadingTimer = null;

  function byId(id) {
    return global.document.getElementById(id);
  }

  function cloneRoute(route) {
    return route ? Object.assign({}, route) : null;
  }

  function emit(eventName, detail) {
    global.dispatchEvent(
      new CustomEvent(eventName, {
        detail: detail || {}
      })
    );
  }

  function getFrame() {
    return byId(CONFIG.DOM_IDS.frame);
  }

  function getHomePanel() {
    return byId(CONFIG.DOM_IDS.homePanel);
  }

  function getFramePanel() {
    return byId(CONFIG.DOM_IDS.framePanel);
  }

  function getLoadingOverlay() {
    return byId(CONFIG.DOM_IDS.loadingOverlay);
  }

  function clearLoadingTimer() {
    if (loadingTimer) {
      global.clearTimeout(loadingTimer);
      loadingTimer = null;
    }
  }

  function showLoading() {
    const overlay = getLoadingOverlay();

    if (overlay) {
      overlay.classList.remove("menu-hidden");
    }
  }

  function hideLoading() {
    const overlay = getLoadingOverlay();

    if (overlay) {
      overlay.classList.add("menu-hidden");
    }

    clearLoadingTimer();
  }

  function showHomePanel() {
    const homePanel = getHomePanel();
    const framePanel = getFramePanel();

    if (framePanel) {
      framePanel.classList.add("menu-hidden");
    }

    if (homePanel) {
      homePanel.classList.remove("menu-hidden");
    }
  }

  function showFramePanel() {
    const homePanel = getHomePanel();
    const framePanel = getFramePanel();

    if (homePanel) {
      homePanel.classList.add("menu-hidden");
    }

    if (framePanel) {
      framePanel.classList.remove("menu-hidden");
    }
  }

  function normalizeRouteId(routeId) {
    if (routeId && MENU.ConfigService.isValidRoute(routeId)) {
      return routeId;
    }

    return CONFIG.APP.fallbackRoute || CONFIG.APP.defaultRoute;
  }

  function resolveRoute(routeId) {
    const safeRouteId = normalizeRouteId(routeId);
    const route = MENU.ConfigService.getRouteById(safeRouteId);

    if (!route) {
      return MENU.ConfigService.getRouteById(CONFIG.APP.fallbackRoute || CONFIG.APP.defaultRoute);
    }

    if (route.isGroupRoute) {
      const defaultChild = MENU.ConfigService.getDefaultChild(route.id);
      return defaultChild || route;
    }

    return route;
  }

  function saveRouteMemory(route, options) {
    const shouldRemember = !options || options.remember !== false;

    if (!route || !shouldRemember) {
      return;
    }

    const parentRoute = route.parent
      ? MENU.ConfigService.getRouteById(route.parent)
      : null;

    if (route.remember !== false) {
      MENU.Storage.saveActiveRoute(route.id);
      MENU.Storage.pushHistory(route.id);
    }

    if (parentRoute) {
      MENU.Storage.saveActiveParent(parentRoute.id);
      MENU.Storage.setSubmenuOpen(parentRoute.id, true);
    } else {
      MENU.Storage.saveActiveParent(route.id);
    }

    MENU.Storage.saveSnapshot({
      activeRoute: route.id,
      activeParent: parentRoute ? parentRoute.id : route.id,
      label: route.label,
      src: route.src || null,
      type: route.type
    });
  }

  function renderRoute(route) {
    if (MENU.Renderer && typeof MENU.Renderer.render === "function") {
      MENU.Renderer.render(route);
    }
  }

  function showFrameLoadError(route) {
    hideLoading();
    isNavigating = false;

    if (MENU.Renderer && typeof MENU.Renderer.showFrameError === "function") {
      MENU.Renderer.showFrameError(route);
    }

    emit("menu:navigation-error", {
      route
    });
  }

  function setFrameSource(route, options) {
    const frame = getFrame();

    if (!frame || !route || !route.src) {
      return false;
    }

    const force = Boolean(options && options.force);

    showFramePanel();
    showLoading();
    clearLoadingTimer();

    isNavigating = true;

    frame.onload = function handleFrameLoad() {
      hideLoading();
      isNavigating = false;

      emit("menu:navigation-loaded", {
        route
      });
    };

    frame.onerror = function handleFrameError() {
      showFrameLoadError(route);
    };

    loadingTimer = global.setTimeout(() => {
      hideLoading();
      isNavigating = false;

      emit("menu:navigation-timeout", {
        route
      });
    }, CONFIG.APP.loadingTimeoutMs || 9000);

    if (force && frame.getAttribute("src") === route.src) {
      frame.setAttribute("src", "about:blank");

      global.setTimeout(() => {
        frame.setAttribute("src", route.src);
      }, CONFIG.APP.loadDelayMs || 80);

      return true;
    }

    frame.setAttribute("src", route.src);
    return true;
  }

  function clearFrameSource() {
    const frame = getFrame();

    if (!frame) {
      return;
    }

    frame.onload = null;
    frame.onerror = null;

    if (frame.getAttribute("src") !== "about:blank") {
      frame.setAttribute("src", "about:blank");
    }
  }

  function isInternalRoute(route) {
    if (!route) {
      return false;
    }

    if (CONFIG.ROUTE_TYPES && route.type === CONFIG.ROUTE_TYPES.INTERNAL) {
      return true;
    }

    return route.type === "internal" || !route.src;
  }

  function navigateTo(routeId, options) {
    const safeOptions = options || {};
    const route = resolveRoute(routeId);

    if (!route) {
      return {
        ok: false,
        message: "No se encontró la ruta solicitada.",
        route: null
      };
    }

    if (route.enabled === false) {
      return {
        ok: false,
        message: "La ruta está deshabilitada.",
        route
      };
    }

    if (
      currentRoute &&
      currentRoute.id === route.id &&
      !safeOptions.force
    ) {
      renderRoute(currentRoute);

      return {
        ok: true,
        message: "La pantalla ya está abierta.",
        route: cloneRoute(currentRoute)
      };
    }

    emit("menu:navigation-start", {
      route
    });

    currentRoute = cloneRoute(route);
    saveRouteMemory(route, safeOptions);

    if (isInternalRoute(route)) {
      hideLoading();
      clearFrameSource();
      showHomePanel();
      renderRoute(route);

      emit("menu:navigation-done", {
        route
      });

      return {
        ok: true,
        message: "Pantalla interna abierta.",
        route: cloneRoute(route)
      };
    }

    const loaded = setFrameSource(route, safeOptions);

    if (!loaded) {
      showFrameLoadError(route);

      return {
        ok: false,
        message: "No se pudo cargar el iframe.",
        route: cloneRoute(route)
      };
    }

    renderRoute(route);

    emit("menu:navigation-done", {
      route
    });

    return {
      ok: true,
      message: "Pantalla cargada.",
      route: cloneRoute(route)
    };
  }

  function reloadCurrent() {
    if (!currentRoute) {
      const storedRoute = MENU.Storage.getActiveRoute();

      return navigateTo(storedRoute || CONFIG.APP.defaultRoute, {
        force: true
      });
    }

    if (isInternalRoute(currentRoute)) {
      return navigateTo(currentRoute.id, {
        force: true
      });
    }

    const frame = getFrame();

    if (frame && currentRoute.src) {
      showLoading();
      clearLoadingTimer();

      loadingTimer = global.setTimeout(() => {
        hideLoading();
      }, CONFIG.APP.loadingTimeoutMs || 9000);

      try {
        if (frame.contentWindow && frame.contentWindow.location) {
          frame.contentWindow.location.reload();
        } else {
          frame.setAttribute("src", currentRoute.src);
        }
      } catch (error) {
        frame.setAttribute("src", currentRoute.src);
      }

      return {
        ok: true,
        message: "Pantalla recargada.",
        route: cloneRoute(currentRoute)
      };
    }

    return {
      ok: false,
      message: "No hay pantalla para recargar.",
      route: cloneRoute(currentRoute)
    };
  }

  function goBack() {
    const currentRouteId = currentRoute
      ? currentRoute.id
      : MENU.Storage.getActiveRoute();

    const previousRoute = MENU.Storage.getPreviousRoute(currentRouteId);

    if (!previousRoute) {
      return navigateTo(CONFIG.APP.defaultRoute);
    }

    return navigateTo(previousRoute);
  }

  function getCurrentRoute() {
    return cloneRoute(currentRoute);
  }

  function getIsNavigating() {
    return isNavigating;
  }

  function restoreLastRoute() {
    const storedRoute = MENU.Storage.getActiveRoute();

    return navigateTo(storedRoute || CONFIG.APP.defaultRoute, {
      force: true
    });
  }

  MENU.Router = {
    navigateTo,
    reloadCurrent,
    goBack,
    getCurrentRoute,
    getIsNavigating,
    restoreLastRoute,
    resolveRoute
  };
})(window);