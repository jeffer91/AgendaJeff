/*
  Nombre completo: menu-renderer.js
  Ruta: menu/js/menu-renderer.js

  Función:
    - Dibujar el menú superior inteligente.
    - Dibujar submenús solo cuando correspondan.
    - Marcar la pantalla activa.
    - Actualizar la barra inferior de estado.
    - No crear encabezados adicionales sobre las pantallas internas.
    - No modifica HTML interno de Agendador, Carga Masiva ni conexiones.

  Se conecta con:
    - index.html
    - menu/js/menu-config.js
    - menu/js/menu-storage.js
    - menu/js/menu-router.js
    - menu/js/menu-app.js
*/

(function initMenuRenderer(global) {
  "use strict";

  const MENU = global.MENU = global.MENU || {};
  const CONFIG = MENU.CONFIG;

  function byId(id) {
    return global.document.getElementById(id);
  }

  function createElement(tagName, className, textContent) {
    const element = global.document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (typeof textContent === "string") {
      element.textContent = textContent;
    }

    return element;
  }

  function clearElement(element) {
    if (!element) {
      return;
    }

    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function setButtonActive(button, isActive) {
    if (!button) {
      return;
    }

    button.classList.toggle("menu-nav-btn--active", Boolean(isActive));
    button.classList.toggle("menu-subnav-btn--active", Boolean(isActive));
    button.setAttribute("aria-current", isActive ? "page" : "false");
  }

  function createMainButton(route, activeRouteId, activeParentId) {
    const hasChildren = MENU.ConfigService.getChildren(route.id).length > 0;
    const isActive =
      route.id === activeRouteId ||
      route.id === activeParentId ||
      (hasChildren && activeParentId === route.id);

    const button = createElement("button", "menu-nav-btn");
    button.type = "button";
    button.dataset.menuRoute = route.id;

    if (hasChildren || route.isGroupRoute) {
      button.dataset.menuGroup = route.id;
    }

    if (route.enabled === false) {
      button.disabled = true;
      button.classList.add("menu-nav-btn--disabled");
    }

    const icon = createElement("span", "menu-nav-btn__icon", route.icon || "•");
    const label = createElement("span", "menu-nav-btn__label", route.shortLabel || route.label);

    button.appendChild(icon);
    button.appendChild(label);

    if (hasChildren || route.isGroupRoute) {
      const chevron = createElement("span", "menu-nav-btn__chevron", "▾");
      button.appendChild(chevron);
    }

    button.title = route.description || route.label;

    setButtonActive(button, isActive);

    return button;
  }

  function createSubnavButton(route, activeRouteId) {
    const isActive = route.id === activeRouteId;
    const button = createElement("button", "menu-subnav-btn");

    button.type = "button";
    button.dataset.menuRoute = route.id;
    button.title = route.description || route.label;

    if (route.enabled === false) {
      button.disabled = true;
      button.classList.add("menu-subnav-btn--disabled");
    }

    const icon = createElement("span", "menu-nav-btn__icon", route.icon || "•");
    const label = createElement("span", "menu-subnav-btn__label", route.shortLabel || route.label);

    button.appendChild(icon);
    button.appendChild(label);

    setButtonActive(button, isActive);

    return button;
  }

  function getActiveParentId(activeRoute) {
    if (!activeRoute) {
      return MENU.Storage.getActiveParent();
    }

    if (activeRoute.parent) {
      return activeRoute.parent;
    }

    if (MENU.ConfigService.getChildren(activeRoute.id).length) {
      return activeRoute.id;
    }

    return MENU.Storage.getActiveParent();
  }

  function renderMainNav(activeRoute) {
    const mainNav = byId(CONFIG.DOM_IDS.mainNav);

    if (!mainNav) {
      return;
    }

    clearElement(mainNav);

    const activeRouteId = activeRoute ? activeRoute.id : MENU.Storage.getActiveRoute();
    const activeParentId = getActiveParentId(activeRoute);
    const mainRoutes = MENU.ConfigService.getMainRoutes();

    mainRoutes.forEach((route) => {
      mainNav.appendChild(createMainButton(route, activeRouteId, activeParentId));
    });
  }

  function renderSubnav(parentRouteId, activeRouteId) {
    const subnavArea = byId(CONFIG.DOM_IDS.subnavArea);
    const subnavTitle = byId(CONFIG.DOM_IDS.subnavTitle);
    const subnav = byId(CONFIG.DOM_IDS.subnav);

    if (!subnavArea || !subnavTitle || !subnav) {
      return;
    }

    clearElement(subnav);

    if (!parentRouteId) {
      subnavArea.classList.add("menu-hidden");
      return;
    }

    const parent = MENU.ConfigService.getRouteById(parentRouteId);
    const children = MENU.ConfigService.getChildren(parentRouteId);

    if (!parent || !children.length) {
      subnavArea.classList.add("menu-hidden");
      return;
    }

    subnavTitle.textContent = parent.label || "Submenú";

    children.forEach((child) => {
      subnav.appendChild(createSubnavButton(child, activeRouteId));
    });

    subnavArea.classList.remove("menu-hidden");
  }

  function updateStatus(route) {
    const currentModule = byId(CONFIG.DOM_IDS.currentModule);
    const currentPath = byId(CONFIG.DOM_IDS.currentPath);

    if (!route) {
      if (currentModule) {
        currentModule.textContent = "Inicio";
      }

      if (currentPath) {
        currentPath.textContent = "Memoria lista";
      }

      return;
    }

    const parent = route.parent ? MENU.ConfigService.getRouteById(route.parent) : null;

    if (currentModule) {
      currentModule.textContent = parent
        ? `${parent.label} / ${route.label}`
        : route.label;
    }

    if (currentPath) {
      currentPath.textContent = route.src || "Pantalla interna";
    }
  }

  function updateBackButton() {
    const backButton = byId(CONFIG.DOM_IDS.backButton);
    const activeRouteId = MENU.Storage.getActiveRoute();
    const previousRoute = MENU.Storage.getPreviousRoute(activeRouteId);

    if (!backButton) {
      return;
    }

    backButton.disabled = !previousRoute;
  }

  function render(activeRoute) {
    const route = activeRoute || MENU.Router.getCurrentRoute() || MENU.ConfigService.getRouteById(
      MENU.Storage.getActiveRoute()
    );

    const activeRouteId = route ? route.id : CONFIG.APP.defaultRoute;
    const activeParentId = route && route.parent
      ? route.parent
      : getActiveParentId(route);

    renderMainNav(route);
    renderSubnav(activeParentId, activeRouteId);
    updateStatus(route);
    updateBackButton();
  }

  function setLoading(isLoading) {
    const overlay = byId(CONFIG.DOM_IDS.loadingOverlay);

    if (!overlay) {
      return;
    }

    overlay.classList.toggle("menu-hidden", !isLoading);
  }

  function showFrameError(route) {
    const currentPath = byId(CONFIG.DOM_IDS.currentPath);

    if (currentPath) {
      currentPath.textContent = `No se pudo cargar: ${route && route.src ? route.src : "ruta desconocida"}`;
    }
  }

  MENU.Renderer = {
    render,
    renderMainNav,
    renderSubnav,
    updateStatus,
    updateBackButton,
    setLoading,
    showFrameError
  };
})(window);