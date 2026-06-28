/*
  Nombre completo: in-render.js
  Ruta: modulos/inicio/render/in-render.js

  Función:
    - Renderizar tarjetas, listas y estado visual de la pantalla Inicio.
*/

(function initInicioRender(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const inicio = root.Inicio = root.Inicio || {};

  function labelType(type) {
    return { evento: "Evento", recordatorio: "Recordatorio", pendiente: "Pendiente" }[type] || "Registro";
  }

  function labelTime(item) {
    if (!item || item.todoDia || !item.horaInicio) return "Sin hora";
    return item.horaFin ? `${item.horaInicio} - ${item.horaFin}` : item.horaInicio;
  }

  function renderMiniStats(summary) {
    const data = summary || {};
    inicio.dom.setText("inStatToday", String((data.todayItems || []).length));
    inicio.dom.setText("inStatUpcoming", String((data.upcomingItems || []).length));
    inicio.dom.setText("inStatPending", String((data.pendingItems || []).length));
    inicio.dom.setText("inStatOverdue", String((data.overdueItems || []).length));
    inicio.dom.setText("inStatSync", String((data.syncPendingItems || []).length));
    inicio.dom.setText("inStatErrors", String((data.errorItems || []).length));
  }

  function renderItem(item, options) {
    const opts = options && typeof options === "object" ? options : {};
    const safe = inicio.dom.escapeHtml;
    const id = safe(item.idLocal || "");
    const canComplete = item.estado !== "completado" && item.estado !== "cancelado";
    const showComplete = opts.showComplete !== false && canComplete;

    return `
      <article class="in-item" data-id-local="${id}">
        <div class="in-item-main">
          <div class="in-item-title-row">
            <strong>${safe(item.titulo || "Sin actividad")}</strong>
            <span class="in-pill">${safe(labelType(item.tipo))}</span>
            <span class="in-pill is-state">${safe(item.estado || "activo")}</span>
          </div>
          <p>${safe(item.descripcion || "Sin descripción")}</p>
          <div class="in-item-meta">
            <span>${safe(item.fechaInicio || "Sin fecha")}</span>
            <span>${safe(labelTime(item))}</span>
            <span>${safe(item.categoriaNombre || item.categoriaId || "Otro")}</span>
          </div>
        </div>
        <div class="in-item-actions">
          ${showComplete ? `<button class="in-btn in-btn-small" type="button" data-action="complete" data-id-local="${id}">Completar</button>` : ""}
        </div>
      </article>
    `;
  }

  function renderList(id, items, emptyText, options) {
    const safeItems = Array.isArray(items) ? items : [];

    if (!safeItems.length) {
      inicio.dom.setHtml(id, `<div class="in-empty">${inicio.dom.escapeHtml(emptyText)}</div>`);
      return;
    }

    inicio.dom.setHtml(id, safeItems.slice(0, 10).map(function mapItem(item) {
      return renderItem(item, options);
    }).join(""));
  }

  function renderDashboard(summary) {
    const data = summary || {};
    renderMiniStats(data);

    inicio.dom.setText("inTodayCount", String((data.todayItems || []).length));
    inicio.dom.setText("inUpcomingCount", String((data.upcomingItems || []).length));
    inicio.dom.setText("inPendingCount", String((data.pendingItems || []).length));
    inicio.dom.setText("inOverdueCount", String((data.overdueItems || []).length));

    renderList("inTodayList", data.todayItems, "No hay eventos para hoy.");
    renderList("inUpcomingList", data.upcomingItems, "No hay próximos eventos en los siguientes 7 días.");
    renderList("inPendingList", data.pendingItems, "No hay pendientes activos.");
    renderList("inOverdueList", data.overdueItems, "No hay registros vencidos.");

    inicio.dom.setText("inStatusBadge", "Conectado");
    inicio.dom.setText("inStatusTitle", "Inicio actualizado");
    inicio.dom.setText("inStatusDescription", `Datos locales cargados. Total: ${data.total || 0} registros.`);
    inicio.dom.setText("inLastUpdated", new Date().toLocaleString());
  }

  function renderDisconnected(message) {
    inicio.dom.setText("inStatusBadge", "Modo visual");
    inicio.dom.setText("inStatusTitle", "Sin conexión local");
    inicio.dom.setText("inStatusDescription", message || "Abre la app con Electron para leer la base local JSON.");
    inicio.dom.setText("inLastUpdated", "Sin actualizar");
    renderMiniStats({});
    renderList("inTodayList", [], "Abre AgendaJeff como aplicación instalable para leer datos locales.");
    renderList("inUpcomingList", [], "Sin datos disponibles en modo navegador.");
    renderList("inPendingList", [], "Sin datos disponibles en modo navegador.");
    renderList("inOverdueList", [], "Sin datos disponibles en modo navegador.");
  }

  inicio.render = Object.freeze({ renderDashboard, renderDisconnected, renderList, renderItem });
})(window);
