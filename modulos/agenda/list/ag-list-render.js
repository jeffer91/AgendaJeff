/*
  Nombre completo: ag-list-render.js
  Ruta: modulos/agenda/list/ag-list-render.js

  Función:
    - Renderizar registros locales de AgendaJeff en la pantalla Agenda.
*/

(function initAgendaListRender(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const agenda = root.Agenda = root.Agenda || {};

  function labelTipo(tipo) {
    return { evento: "Evento", recordatorio: "Recordatorio", pendiente: "Pendiente" }[tipo] || "Registro";
  }

  function labelHora(item) {
    if (!item || item.todoDia || !item.horaInicio) return "Todo el día / sin hora";
    return item.horaFin ? `${item.horaInicio} - ${item.horaFin}` : item.horaInicio;
  }

  function renderItem(item) {
    const safe = agenda.dom.escapeHtml;
    const id = safe(item.idLocal);
    const isDone = item.estado === "completado";

    return `
      <article class="ag-list-item ${isDone ? "is-completed" : ""}" data-id-local="${id}">
        <div class="ag-list-main">
          <div class="ag-list-title-row">
            <strong>${safe(item.titulo || "Sin actividad")}</strong>
            <span class="ag-pill">${safe(labelTipo(item.tipo))}</span>
            <span class="ag-pill is-state">${safe(item.estado || "activo")}</span>
          </div>
          <p>${safe(item.descripcion || "Sin descripción")}</p>
          <div class="ag-list-meta">
            <span>${safe(item.fechaInicio || "Sin fecha")}</span>
            <span>${safe(labelHora(item))}</span>
            <span>${safe(item.categoriaNombre || item.categoriaId || "Otro")}</span>
            <span>${safe(item.estadoSync || "pendiente_sincronizar")}</span>
          </div>
        </div>
        <div class="ag-list-actions">
          <button class="ag-btn ag-btn-small" type="button" data-action="edit" data-id-local="${id}">Editar</button>
          <button class="ag-btn ag-btn-small" type="button" data-action="complete" data-id-local="${id}">Completar</button>
          <button class="ag-btn ag-btn-small ag-btn-danger" type="button" data-action="remove" data-id-local="${id}">Eliminar</button>
        </div>
      </article>
    `;
  }

  function renderList(items) {
    const list = agenda.dom.getElement("agListBox");
    const count = agenda.dom.getElement("agListCount");
    const safeItems = Array.isArray(items) ? items : [];

    if (count) count.textContent = String(safeItems.length);
    if (!list) return;

    if (!safeItems.length) {
      list.innerHTML = '<div class="ag-empty">Todavía no hay registros para este filtro.</div>';
      return;
    }

    list.innerHTML = safeItems.map(renderItem).join("");
  }

  agenda.listRender = Object.freeze({ renderList, renderItem });
})(window);
