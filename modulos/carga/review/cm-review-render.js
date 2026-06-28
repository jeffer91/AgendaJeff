/* cm-review-render.js */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  function label(status) {
    return {
      listo: "Listo",
      falta_fecha: "Falta fecha",
      falta_hora: "Falta hora",
      falta_actividad: "Falta actividad",
      posible_duplicado: "Posible duplicado",
      requiere_revision: "Requiere revisión"
    }[status] || "Revisión";
  }

  function addField(card, item, key, type) {
    const wrap = document.createElement("label");
    wrap.className = "cm-review-field";
    const span = document.createElement("span");
    span.textContent = key;
    const input = document.createElement("input");
    input.type = type || "text";
    input.value = item[key] || "";
    input.dataset.id = item.id;
    input.dataset.field = key;
    wrap.appendChild(span);
    wrap.appendChild(input);
    card.appendChild(wrap);
  }

  function addButton(parent, text, action, id) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action === "remove" ? "cm-btn cm-btn-small cm-btn-danger" : "cm-btn cm-btn-small";
    button.textContent = text;
    button.dataset.action = action;
    button.dataset.id = id;
    parent.appendChild(button);
  }

  function makeCard(item, index) {
    const card = document.createElement("article");
    card.className = "cm-review-card";
    card.dataset.id = item.id;

    const head = document.createElement("div");
    head.className = "cm-review-card-head";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = Boolean(item.selected);
    check.dataset.action = "select";
    check.dataset.id = item.id;
    const title = document.createElement("strong");
    title.textContent = `${index + 1}. ${label(item.status)}`;
    head.appendChild(check);
    head.appendChild(title);
    card.appendChild(head);

    addField(card, item, "titulo");
    addField(card, item, "descripcion");
    addField(card, item, "fechaInicio", "date");
    addField(card, item, "fechaFin", "date");
    addField(card, item, "horaInicio", "time");
    addField(card, item, "horaFin", "time");

    const meta = document.createElement("div");
    meta.className = "cm-review-meta";
    meta.textContent = `Origen: ${item.sourceName || ""} · Fila: ${item.row || ""} · Duplicado: ${item.duplicate ? "sí" : "no"}`;
    card.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "cm-review-actions";
    addButton(actions, "Detalle", "detail", item.id);
    addButton(actions, "Quitar", "remove", item.id);
    card.appendChild(actions);
    return card;
  }

  function renderDetail(item) {
    const box = carga.dom.el("cmReviewDetail");
    if (!box) return;
    box.textContent = "";
    const pre = document.createElement("pre");
    pre.textContent = item ? JSON.stringify(item, null, 2) : "Selecciona un registro.";
    box.appendChild(pre);
  }

  function renderReview() {
    const list = carga.dom.el("cmReviewTable");
    const items = carga.state && Array.isArray(carga.state.candidates) ? carga.state.candidates : [];
    carga.dom.text("cmDetectedCount", String(items.length));
    if (!list) return;
    list.textContent = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "cm-empty";
      empty.textContent = "No hay eventos detectados.";
      list.appendChild(empty);
      renderDetail(null);
      return;
    }
    items.forEach(function (item, index) { list.appendChild(makeCard(item, index)); });
    const current = items.find(function (item) { return item.id === carga.state.selectedCandidateId; }) || items[0];
    carga.state.selectedCandidateId = current.id;
    renderDetail(current);
  }

  carga.reviewRender = Object.freeze({ renderReview, renderDetail, label });
})(window);
