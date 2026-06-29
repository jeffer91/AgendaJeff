/* cm-review-render.js · Tabla editable de revisión */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  function label(status) {
    return {
      listo: "Listo",
      guardado: "Guardado",
      falta_fecha: "Falta fecha",
      falta_actividad: "Falta actividad",
      posible_duplicado: "Posible duplicado",
      requiere_revision: "Requiere revisión"
    }[status] || "Revisión";
  }

  function fieldValue(item, key) {
    if (key === "actividad") return item.actividad || item.titulo || "";
    return item[key] || "";
  }

  function makeInput(item, field, type) {
    const input = document.createElement(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") input.type = type || "text";
    input.value = fieldValue(item, field);
    input.dataset.id = item.id;
    input.dataset.field = field;
    input.setAttribute("aria-label", field);
    if (type === "textarea") input.rows = 2;
    return input;
  }

  function makeCell(row, child, className) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.appendChild(child);
    row.appendChild(cell);
    return cell;
  }

  function makeButton(text, action, id, danger) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = danger ? "cm-btn cm-btn-small cm-btn-danger" : "cm-btn cm-btn-small";
    button.textContent = text;
    button.dataset.action = action;
    button.dataset.id = id;
    return button;
  }

  function makeRow(item, index) {
    const row = document.createElement("tr");
    row.dataset.id = item.id;
    if (!item.selected) row.classList.add("is-muted");
    if (!["listo", "guardado"].includes(item.status)) row.classList.add("needs-review");

    const selected = document.createElement("input");
    selected.type = "checkbox";
    selected.checked = Boolean(item.selected);
    selected.dataset.action = "select";
    selected.dataset.id = item.id;
    selected.setAttribute("aria-label", `Agregar fila ${index + 1}`);
    makeCell(row, selected, "cm-review-check");

    makeCell(row, makeInput(item, "actividad", "textarea"), "cm-review-activity");
    makeCell(row, makeInput(item, "fechaInicio", "date"), "cm-review-date");
    makeCell(row, makeInput(item, "fechaFin", "date"), "cm-review-date");
    makeCell(row, makeInput(item, "horaInicio", "time"), "cm-review-time");
    makeCell(row, makeInput(item, "horaFin", "time"), "cm-review-time");

    const status = document.createElement("span");
    status.className = `cm-review-status is-${item.status || "revision"}`;
    status.textContent = label(item.status);
    makeCell(row, status, "cm-review-status-cell");

    const actions = document.createElement("div");
    actions.className = "cm-row-actions";
    actions.appendChild(makeButton("Detalle", "detail", item.id, false));
    actions.appendChild(makeButton("Guardar", "save-row", item.id, false));
    actions.appendChild(makeButton("Exportar", "export-row", item.id, false));
    actions.appendChild(makeButton("Eliminar", "remove", item.id, true));
    makeCell(row, actions, "cm-review-actions-cell");

    return row;
  }

  function renderDetail(item) {
    const box = carga.dom.el("cmReviewDetail");
    if (!box) return;
    box.textContent = "";
    const title = document.createElement("h3");
    title.textContent = item ? "Detalle de fila" : "Detalle";
    box.appendChild(title);

    if (!item) {
      const empty = document.createElement("div");
      empty.className = "cm-empty";
      empty.textContent = "Selecciona una fila para ver el origen.";
      box.appendChild(empty);
      return;
    }

    const summary = document.createElement("div");
    summary.className = "cm-detail-summary";
    summary.innerHTML = `
      <strong>${carga.dom.safe(item.actividad || item.titulo || "Sin actividad")}</strong>
      <span>Origen: ${carga.dom.safe(item.sourceName || "")} · Fila: ${carga.dom.safe(item.row || "")}</span>
      <span>Duplicado: ${item.duplicate ? "sí" : "no"} · Estado: ${carga.dom.safe(label(item.status))}</span>
    `;
    box.appendChild(summary);

    const pre = document.createElement("pre");
    pre.textContent = item.origen && item.origen.textoOriginal ? item.origen.textoOriginal : JSON.stringify(item, null, 2);
    box.appendChild(pre);
  }

  function renderReview() {
    const target = carga.dom.el("cmReviewTable");
    const items = carga.state && Array.isArray(carga.state.candidates) ? carga.state.candidates : [];
    carga.dom.text("cmDetectedCount", String(items.length));
    if (!target) return;
    target.textContent = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "cm-empty";
      empty.textContent = "No hay eventos detectados. Puede que todos ya existan o hayan sido depurados como duplicados.";
      target.appendChild(empty);
      renderDetail(null);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "cm-review-table-wrap";
    const table = document.createElement("table");
    table.className = "cm-edit-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Agregar</th>
          <th>Actividad</th>
          <th>Fecha inicio</th>
          <th>Fecha fin</th>
          <th>Hora inicio</th>
          <th>Hora fin</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
    `;
    const body = document.createElement("tbody");
    items.forEach(function eachItem(item, index) { body.appendChild(makeRow(item, index)); });
    table.appendChild(body);
    wrapper.appendChild(table);
    target.appendChild(wrapper);

    const current = items.find(function (item) { return item.id === carga.state.selectedCandidateId; }) || items[0];
    carga.state.selectedCandidateId = current.id;
    renderDetail(current);
  }

  carga.reviewRender = Object.freeze({ renderReview, renderDetail, label });
})(window);