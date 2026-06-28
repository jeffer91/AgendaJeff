/* dg-render.js */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const diagnostico = root.Diagnostico = root.Diagnostico || {};

  function setStats(stats) {
    const data = stats || {};
    diagnostico.dom.text("dgCountEvents", data.eventos || 0);
    diagnostico.dom.text("dgCountReminders", data.recordatorios || 0);
    diagnostico.dom.text("dgCountPending", data.pendientes || 0);
    diagnostico.dom.text("dgCountSync", data.sync || 0);
    diagnostico.dom.text("dgCountErrors", data.errores || 0);
    diagnostico.dom.text("dgCountQueue", data.queue || 0);
  }

  function clearBox(id, emptyText) {
    const box = diagnostico.dom.el(id);
    if (!box) return null;
    box.textContent = "";
    if (emptyText) {
      const empty = document.createElement("div");
      empty.className = "dg-empty";
      empty.textContent = emptyText;
      box.appendChild(empty);
    }
    return box;
  }

  function pill(ok) {
    const span = document.createElement("span");
    span.className = ok ? "dg-pill is-ok" : "dg-pill is-warning";
    span.textContent = ok ? "OK" : "Revisar";
    return span;
  }

  function renderAreas(areas) {
    const list = Array.isArray(areas) ? areas : [];
    const box = clearBox("dgAreaList", list.length ? "" : "Sin areas revisadas.");
    if (!box || !list.length) return;
    list.forEach(function (item) {
      const card = document.createElement("article");
      card.className = "dg-area";
      const top = document.createElement("div");
      top.className = "dg-area-title";
      const title = document.createElement("strong");
      title.textContent = item.name || "Area";
      const p = document.createElement("p");
      p.textContent = item.message || "";
      top.appendChild(title);
      top.appendChild(pill(Boolean(item.ok)));
      card.appendChild(top);
      card.appendChild(p);
      box.appendChild(card);
    });
  }

  function renderRecent(items) {
    const list = Array.isArray(items) ? items : [];
    const box = clearBox("dgRecentList", list.length ? "" : "Sin registros recientes.");
    if (!box || !list.length) return;
    list.forEach(function (item) {
      const card = document.createElement("article");
      card.className = "dg-recent-item";
      const top = document.createElement("div");
      top.className = "dg-recent-title";
      const title = document.createElement("strong");
      title.textContent = item.titulo || "Sin titulo";
      const meta = document.createElement("p");
      meta.textContent = `${item.fechaInicio || "Sin fecha"} · ${item.estado || "activo"} · ${item.estadoSync || "sin_sync"}`;
      top.appendChild(title);
      top.appendChild(pill(true));
      card.appendChild(top);
      card.appendChild(meta);
      box.appendChild(card);
    });
  }

  function renderReport(report) {
    const data = report || {};
    const output = diagnostico.dom.el("dgOutput");
    const warnings = (data.areas || []).some(function (item) { return !item.ok; });
    setStats(data.stats);
    renderAreas(data.areas);
    renderRecent(data.recent);
    if (output) output.textContent = JSON.stringify(data, null, 2);
    diagnostico.dom.status(warnings ? "Diagnostico con alertas" : "Diagnostico correcto", warnings ? "Hay elementos que requieren revision." : "La revision esta correcta.", warnings ? "Revisar" : "OK", warnings ? "is-warning" : "is-ok");
  }

  diagnostico.render = Object.freeze({ renderReport, setStats, renderAreas, renderRecent });
})(window);
