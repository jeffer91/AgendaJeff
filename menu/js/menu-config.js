/*
  Nombre completo: menu-config.js
  Ruta: menu/js/menu-config.js

  Función:
    - Configurar el menú superior inteligente de AgendaJeff.
    - Definir rutas principales y subrutas.
    - Decidir qué pantalla entra como menú principal y qué pantalla entra como submenú.
    - Evitar encabezados dobles mediante reglas de visualización.
    - Mantener rutas externas sin modificar las carpetas funcionales existentes.
    - Centralizar IDs del DOM, claves de memoria y parámetros del menú.
*/

(function initMenuConfig(global) {
  "use strict";

  const MENU = global.MENU = global.MENU || {};

  const CONFIG = {
    APP: {
      name: "AgendaJeff",
      version: "1.1.0",
      defaultRoute: "inicio",
      fallbackRoute: "inicio",
      iframeTarget: "menuScreenFrame",
      loadDelayMs: 120,
      loadingTimeoutMs: 9000,
      historyLimit: 30
    },

    DOM_IDS: {
      root: "menuAppRoot",
      mainNav: "menuMainNav",
      subnavArea: "menuSubnavArea",
      subnavTitle: "menuSubnavTitle",
      subnav: "menuSubnav",
      homePanel: "menuHomePanel",
      framePanel: "menuFramePanel",
      frame: "menuScreenFrame",
      loadingOverlay: "menuLoadingOverlay",
      backButton: "menuBackBtn",
      reloadButton: "menuReloadBtn",
      currentModule: "menuCurrentModule",
      currentPath: "menuCurrentPath"
    },

    STORAGE_KEYS: {
      activeRoute: "agendajeff.menu.activeRoute",
      activeParent: "agendajeff.menu.activeParent",
      openSubmenus: "agendajeff.menu.openSubmenus",
      routeHistory: "agendajeff.menu.routeHistory",
      lastSnapshot: "agendajeff.menu.lastSnapshot"
    },

    ROUTE_TYPES: {
      INTERNAL: "internal",
      IFRAME: "iframe"
    },

    GROUPS: {
      PRINCIPAL: {
        id: "principal",
        label: "Principal",
        order: 10
      },

      CONEXIONES: {
        id: "conexiones",
        label: "Conexiones",
        order: 20
      }
    },

    ROUTES: [
      {
        id: "inicio",
        type: "internal",
        label: "Inicio",
        shortLabel: "Inicio",
        icon: "⌂",
        description: "Panel inicial de AgendaJeff.",
        group: "principal",
        parent: null,
        order: 10,
        visible: true,
        enabled: true,
        remember: true,
        showInMainMenu: true,
        showInSubmenu: false,
        avoidExternalHeader: true,
        src: null
      },

      {
        id: "agendador",
        type: "iframe",
        label: "Agendador",
        shortLabel: "Agenda",
        icon: "📅",
        description: "Crear y revisar eventos, pendientes y recordatorios.",
        group: "principal",
        parent: null,
        order: 20,
        visible: true,
        enabled: true,
        remember: true,
        showInMainMenu: true,
        showInSubmenu: false,
        avoidExternalHeader: true,
        src: "./Agendador/ag-index.html"
      },

      {
        id: "carga-masiva",
        type: "iframe",
        label: "Carga Masiva",
        shortLabel: "Carga",
        icon: "⇪",
        description: "Importar eventos desde texto, archivos o tablas.",
        group: "principal",
        parent: null,
        order: 30,
        visible: true,
        enabled: true,
        remember: true,
        showInMainMenu: true,
        showInSubmenu: false,
        avoidExternalHeader: true,
        src: "./carga-masiva/cm-index.html"
      },

      {
        id: "herramientas",
        type: "iframe",
        label: "Herramientas",
        shortLabel: "Herramientas",
        icon: "🧰",
        description: "Backup, restauración, reportes, prueba completa y deshacer carga.",
        group: "principal",
        parent: null,
        order: 35,
        visible: true,
        enabled: true,
        remember: true,
        showInMainMenu: true,
        showInSubmenu: false,
        avoidExternalHeader: true,
        src: "./herramientas/herramientas-index.html"
      },

      {
        id: "conexiones",
        type: "internal",
        label: "Conexiones",
        shortLabel: "Conexiones",
        icon: "🔗",
        description: "Accesos a servicios conectados.",
        group: "principal",
        parent: null,
        order: 40,
        visible: true,
        enabled: true,
        remember: false,
        showInMainMenu: true,
        showInSubmenu: false,
        avoidExternalHeader: true,
        isGroupRoute: true,
        defaultChild: "google-calendar",
        src: null
      },

      {
        id: "google-calendar",
        type: "iframe",
        label: "Google Calendar",
        shortLabel: "Google",
        icon: "G",
        description: "Pantalla de conexión con Google Calendar.",
        group: "conexiones",
        parent: "conexiones",
        order: 10,
        visible: true,
        enabled: true,
        remember: true,
        showInMainMenu: false,
        showInSubmenu: true,
        avoidExternalHeader: true,
        src: "./google-calendar/gc-index.html"
      },

      {
        id: "microsoft-calendar",
        type: "iframe",
        label: "Microsoft Calendar",
        shortLabel: "Microsoft",
        icon: "M",
        description: "Pantalla de conexión con Microsoft Calendar.",
        group: "conexiones",
        parent: "conexiones",
        order: 20,
        visible: true,
        enabled: true,
        remember: true,
        showInMainMenu: false,
        showInSubmenu: true,
        avoidExternalHeader: true,
        src: "./microsoft-calendar/mc-index.html"
      },

      {
        id: "telegram",
        type: "iframe",
        label: "Telegram",
        shortLabel: "Telegram",
        icon: "✈",
        description: "Pantalla de conexión con Telegram.",
        group: "conexiones",
        parent: "conexiones",
        order: 30,
        visible: true,
        enabled: true,
        remember: true,
        showInMainMenu: false,
        showInSubmenu: true,
        avoidExternalHeader: true,
        src: "./telegram/tl-index.html"
      },

      {
        id: "notificaciones-desktop",
        type: "iframe",
        label: "Notificaciones Desktop",
        shortLabel: "Notificaciones",
        icon: "🔔",
        description: "Pantalla de notificaciones de escritorio.",
        group: "conexiones",
        parent: "conexiones",
        order: 40,
        visible: true,
        enabled: true,
        remember: true,
        showInMainMenu: false,
        showInSubmenu: true,
        avoidExternalHeader: true,
        src: "./notificaciones-desktop/nt-index.html"
      }
    ]
  };

  function cloneRoute(route) {
    return Object.assign({}, route);
  }

  function sortByOrder(a, b) {
    const orderA = Number.isFinite(a.order) ? a.order : 999;
    const orderB = Number.isFinite(b.order) ? b.order : 999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return String(a.label || "").localeCompare(String(b.label || ""));
  }

  function getRoutes() {
    return CONFIG.ROUTES
      .filter((route) => route && route.visible !== false)
      .map(cloneRoute)
      .sort(sortByOrder);
  }

  function getRouteById(routeId) {
    const found = CONFIG.ROUTES.find((route) => route.id === routeId);
    return found ? cloneRoute(found) : null;
  }

  function getMainRoutes() {
    return getRoutes()
      .filter((route) => route.showInMainMenu === true)
      .sort(sortByOrder);
  }

  function getChildren(parentId) {
    return getRoutes()
      .filter((route) => route.parent === parentId && route.showInSubmenu === true)
      .sort(sortByOrder);
  }

  function getParentRoute(routeId) {
    const route = getRouteById(routeId);

    if (!route || !route.parent) {
      return null;
    }

    return getRouteById(route.parent);
  }

  function getDefaultChild(parentId) {
    const parent = getRouteById(parentId);

    if (parent && parent.defaultChild) {
      const child = getRouteById(parent.defaultChild);

      if (child && child.enabled !== false) {
        return child;
      }
    }

    const children = getChildren(parentId).filter((child) => child.enabled !== false);
    return children.length ? children[0] : null;
  }

  function isValidRoute(routeId) {
    const route = getRouteById(routeId);
    return Boolean(route && route.enabled !== false);
  }

  MENU.CONFIG = CONFIG;

  MENU.ConfigService = {
    getRoutes,
    getRouteById,
    getMainRoutes,
    getChildren,
    getParentRoute,
    getDefaultChild,
    isValidRoute
  };
})(window);
