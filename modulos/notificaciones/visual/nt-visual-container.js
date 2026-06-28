/*
  Nombre completo: nt-visual-container.js
  Ruta: modulos/notificaciones/visual/nt-visual-container.js

  Función:
    - Crear y reutilizar contenedores visuales internos para Notificaciones.
    - Mantener las notificaciones internas separadas de la notificación nativa de Windows.
*/

(function initNtVisualContainer(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const visual = nt.Visual = nt.Visual || {};

  const IDS = Object.freeze({
    root: "ntVisualRoot",
    toast: "ntVisualToastLayer",
    banner: "ntVisualBannerLayer",
    center: "ntVisualCenterLayer"
  });

  function getDocument() {
    return global.document || null;
  }

  function setBaseLayerStyles(element) {
    element.style.boxSizing = "border-box";
    element.style.fontFamily = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    element.style.pointerEvents = "none";
    element.style.zIndex = "9999";
  }

  function createElement(tagName, id, className) {
    const documentRef = getDocument();
    if (!documentRef) return null;

    let element = documentRef.getElementById(id);
    if (element) return element;

    element = documentRef.createElement(tagName);
    element.id = id;
    element.className = className || "";
    return element;
  }

  function ensureRoot() {
    const documentRef = getDocument();
    if (!documentRef || !documentRef.body) return null;

    const rootElement = createElement("section", IDS.root, "nt-visual-root");
    rootElement.setAttribute("aria-live", "polite");
    rootElement.setAttribute("aria-label", "Notificaciones internas de AgendaJeff");
    rootElement.style.position = "fixed";
    rootElement.style.inset = "0";
    rootElement.style.width = "100%";
    rootElement.style.height = "100%";
    setBaseLayerStyles(rootElement);

    if (!rootElement.parentElement) {
      documentRef.body.appendChild(rootElement);
    }

    return rootElement;
  }

  function ensureToastLayer() {
    const rootElement = ensureRoot();
    if (!rootElement) return null;

    const layer = createElement("div", IDS.toast, "nt-visual-toast-layer");
    layer.style.position = "absolute";
    layer.style.top = "18px";
    layer.style.right = "18px";
    layer.style.display = "grid";
    layer.style.gap = "10px";
    layer.style.width = "min(360px, calc(100vw - 36px))";
    setBaseLayerStyles(layer);

    if (!layer.parentElement) rootElement.appendChild(layer);
    return layer;
  }

  function ensureBannerLayer() {
    const rootElement = ensureRoot();
    if (!rootElement) return null;

    const layer = createElement("div", IDS.banner, "nt-visual-banner-layer");
    layer.style.position = "absolute";
    layer.style.top = "0";
    layer.style.left = "0";
    layer.style.width = "100%";
    layer.style.display = "grid";
    layer.style.justifyItems = "center";
    layer.style.padding = "12px";
    setBaseLayerStyles(layer);

    if (!layer.parentElement) rootElement.appendChild(layer);
    return layer;
  }

  function ensureCenterLayer() {
    const rootElement = ensureRoot();
    if (!rootElement) return null;

    const layer = createElement("div", IDS.center, "nt-visual-center-layer");
    layer.style.position = "absolute";
    layer.style.inset = "0";
    layer.style.display = "grid";
    layer.style.placeItems = "center";
    layer.style.padding = "18px";
    setBaseLayerStyles(layer);

    if (!layer.parentElement) rootElement.appendChild(layer);
    return layer;
  }

  function clearVisuals() {
    const documentRef = getDocument();
    const rootElement = documentRef ? documentRef.getElementById(IDS.root) : null;
    if (rootElement) rootElement.remove();
    return { ok: true, message: "Notificaciones visuales internas limpiadas.", checkedAt: new Date().toISOString() };
  }

  visual.Container = Object.freeze({
    IDS,
    ensureRoot,
    ensureToastLayer,
    ensureBannerLayer,
    ensureCenterLayer,
    clearVisuals
  });
})(window);