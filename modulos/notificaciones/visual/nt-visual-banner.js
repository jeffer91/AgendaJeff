/*
  Nombre completo: nt-visual-banner.js
  Ruta: modulos/notificaciones/visual/nt-visual-banner.js

  Función:
    - Mostrar notificaciones internas tipo banner superior.
*/

(function initNtVisualBanner(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const nt = root.Notificaciones = root.Notificaciones || {};
  const visual = nt.Visual = nt.Visual || {};

  function getSafePayload(payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    return {
      title: data.title || "AgendaJeff",
      body: data.body || data.message || "notificaciones prueba",
      type: data.type || "normal",
      durationMs: Number(data.durationMs) > 0 ? Number(data.durationMs) : 5000
    };
  }

  function getBackground(type) {
    if (type === "success") return "#ecfdf3";
    if (type === "error") return "#fef3f2";
    if (type === "reminder") return "#fff7ed";
    return "#dbeafe";
  }

  function getTextColor(type) {
    if (type === "success") return "#15803d";
    if (type === "error") return "#b42318";
    if (type === "reminder") return "#b45309";
    return "#1d4ed8";
  }

  function showBanner(payload) {
    const container = visual.Container && visual.Container.ensureBannerLayer ? visual.Container.ensureBannerLayer() : null;
    const documentRef = global.document || null;
    const data = getSafePayload(payload);

    if (!container || !documentRef) {
      return { ok: false, message: "No se pudo crear el banner interno.", checkedAt: new Date().toISOString() };
    }

    container.innerHTML = "";

    const banner = documentRef.createElement("article");
    banner.className = "nt-visual-banner-item";
    banner.style.pointerEvents = "auto";
    banner.style.width = "min(920px, calc(100vw - 32px))";
    banner.style.padding = "14px 18px";
    banner.style.borderRadius = "16px";
    banner.style.border = "1px solid #d9e2ec";
    banner.style.background = getBackground(data.type);
    banner.style.color = getTextColor(data.type);
    banner.style.boxShadow = "0 18px 45px rgba(15, 23, 42, 0.12)";
    banner.style.transform = "translateY(-12px)";
    banner.style.opacity = "0";
    banner.style.transition = "opacity 160ms ease, transform 160ms ease";

    const title = documentRef.createElement("strong");
    title.textContent = data.title;
    title.style.display = "block";
    title.style.marginBottom = "4px";

    const body = documentRef.createElement("span");
    body.textContent = data.body;
    body.style.display = "block";
    body.style.lineHeight = "1.45";
    body.style.whiteSpace = "pre-wrap";

    banner.appendChild(title);
    banner.appendChild(body);
    container.appendChild(banner);

    global.requestAnimationFrame(function animateIn() {
      banner.style.opacity = "1";
      banner.style.transform = "translateY(0)";
    });

    global.setTimeout(function removeBanner() {
      banner.style.opacity = "0";
      banner.style.transform = "translateY(-12px)";
      global.setTimeout(function removeNode() {
        if (banner.parentElement) banner.remove();
      }, 180);
    }, data.durationMs);

    return { ok: true, style: "banner", message: "Banner superior mostrado.", checkedAt: new Date().toISOString() };
  }

  visual.Banner = Object.freeze({ showBanner });
})(window);