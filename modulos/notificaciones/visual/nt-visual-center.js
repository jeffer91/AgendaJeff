/*
  Nombre completo: nt-visual-center.js
  Ruta: modulos/notificaciones/visual/nt-visual-center.js

  Función:
    - Mostrar notificaciones internas tipo alerta central.
*/

(function initNtVisualCenter(global) {
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
      durationMs: Number(data.durationMs) > 0 ? Number(data.durationMs) : 6500
    };
  }

  function getAccent(type) {
    if (type === "success") return "#15803d";
    if (type === "error") return "#b42318";
    if (type === "reminder") return "#b45309";
    return "#2563eb";
  }

  function showCenter(payload) {
    const container = visual.Container && visual.Container.ensureCenterLayer ? visual.Container.ensureCenterLayer() : null;
    const documentRef = global.document || null;
    const data = getSafePayload(payload);

    if (!container || !documentRef) {
      return { ok: false, message: "No se pudo crear la alerta central.", checkedAt: new Date().toISOString() };
    }

    container.innerHTML = "";

    const card = documentRef.createElement("article");
    card.className = "nt-visual-center-card";
    card.style.pointerEvents = "auto";
    card.style.width = "min(520px, calc(100vw - 36px))";
    card.style.padding = "24px";
    card.style.borderRadius = "24px";
    card.style.border = "1px solid #d9e2ec";
    card.style.borderTop = "7px solid " + getAccent(data.type);
    card.style.background = "#ffffff";
    card.style.color = "#172033";
    card.style.boxShadow = "0 26px 70px rgba(15, 23, 42, 0.24)";
    card.style.textAlign = "center";
    card.style.transform = "scale(0.96)";
    card.style.opacity = "0";
    card.style.transition = "opacity 180ms ease, transform 180ms ease";

    const label = documentRef.createElement("span");
    label.textContent = "AgendaJeff";
    label.style.display = "inline-flex";
    label.style.marginBottom = "12px";
    label.style.padding = "6px 10px";
    label.style.borderRadius = "999px";
    label.style.background = "#f4f7fb";
    label.style.color = getAccent(data.type);
    label.style.fontSize = "12px";
    label.style.fontWeight = "900";
    label.style.textTransform = "uppercase";

    const title = documentRef.createElement("strong");
    title.textContent = data.title;
    title.style.display = "block";
    title.style.marginBottom = "10px";
    title.style.fontSize = "20px";

    const body = documentRef.createElement("p");
    body.textContent = data.body;
    body.style.margin = "0";
    body.style.color = "#667085";
    body.style.lineHeight = "1.55";
    body.style.whiteSpace = "pre-wrap";

    card.appendChild(label);
    card.appendChild(title);
    card.appendChild(body);
    container.appendChild(card);

    global.requestAnimationFrame(function animateIn() {
      card.style.opacity = "1";
      card.style.transform = "scale(1)";
    });

    global.setTimeout(function removeCenter() {
      card.style.opacity = "0";
      card.style.transform = "scale(0.96)";
      global.setTimeout(function removeNode() {
        if (card.parentElement) card.remove();
      }, 200);
    }, data.durationMs);

    return { ok: true, style: "center", message: "Alerta central mostrada.", checkedAt: new Date().toISOString() };
  }

  visual.Center = Object.freeze({ showCenter });
})(window);