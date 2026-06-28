/*
  Nombre completo: nt-visual-toast.js
  Ruta: modulos/notificaciones/visual/nt-visual-toast.js

  Función:
    - Mostrar notificaciones internas tipo toast arriba a la derecha.
*/

(function initNtVisualToast(global) {
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
      durationMs: Number(data.durationMs) > 0 ? Number(data.durationMs) : 4500
    };
  }

  function getBorderColor(type) {
    if (type === "success") return "#15803d";
    if (type === "error") return "#b42318";
    if (type === "reminder") return "#b45309";
    return "#2563eb";
  }

  function showToast(payload) {
    const container = visual.Container && visual.Container.ensureToastLayer ? visual.Container.ensureToastLayer() : null;
    const documentRef = global.document || null;
    const data = getSafePayload(payload);

    if (!container || !documentRef) {
      return { ok: false, message: "No se pudo crear el toast interno.", checkedAt: new Date().toISOString() };
    }

    const item = documentRef.createElement("article");
    item.className = "nt-visual-toast-item";
    item.style.pointerEvents = "auto";
    item.style.padding = "14px";
    item.style.borderRadius = "16px";
    item.style.border = "1px solid #d9e2ec";
    item.style.borderLeft = "6px solid " + getBorderColor(data.type);
    item.style.background = "#ffffff";
    item.style.boxShadow = "0 18px 45px rgba(15, 23, 42, 0.16)";
    item.style.color = "#172033";
    item.style.transform = "translateX(12px)";
    item.style.opacity = "0";
    item.style.transition = "opacity 160ms ease, transform 160ms ease";

    const title = documentRef.createElement("strong");
    title.textContent = data.title;
    title.style.display = "block";
    title.style.marginBottom = "6px";

    const body = documentRef.createElement("p");
    body.textContent = data.body;
    body.style.margin = "0";
    body.style.color = "#667085";
    body.style.lineHeight = "1.45";
    body.style.whiteSpace = "pre-wrap";

    item.appendChild(title);
    item.appendChild(body);
    container.appendChild(item);

    global.requestAnimationFrame(function animateIn() {
      item.style.opacity = "1";
      item.style.transform = "translateX(0)";
    });

    global.setTimeout(function removeToast() {
      item.style.opacity = "0";
      item.style.transform = "translateX(12px)";
      global.setTimeout(function removeNode() {
        if (item.parentElement) item.remove();
      }, 180);
    }, data.durationMs);

    return { ok: true, style: "toast", message: "Toast interno mostrado.", checkedAt: new Date().toISOString() };
  }

  visual.Toast = Object.freeze({ showToast });
})(window);