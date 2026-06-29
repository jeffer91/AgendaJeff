/*
  Nombre completo: in-render.js
  Ruta: modulos/inicio/render/in-render.js

  Función:
    - Renderizar tarjetas, listas y estado visual de la pantalla Inicio.
    - Usar las tarjetas superiores como menú de filtros.
    - Mostrar únicamente el listado activo seleccionado.
    - Abrir pop-up con el detalle completo de cada evento.
*/

(function initInicioRender(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const inicio = root.Inicio = root.Inicio || {};
  let currentItems = [];
  let currentSummary = null;
  let currentFilter = "today";

  const FILTERS = Object.freeze({
    today: {
      title: "Eventos de hoy",
      description: "Eventos, recordatorios y pendientes programados para hoy.",
      listKey: "todayItems",
      empty: "No hay eventos para hoy."
    },
    upcomingAll: {
      title: "Próximos eventos",
      description: "Todos los eventos futuros pendientes de realizarse.",
      listKey: "allUpcomingItems",
      empty: "No hay eventos próximos registrados."
    },
    upcoming7: {
      title: "Próximos 7 días",
      description: "Agenda cercana para anticipar trabajo y recordatorios.",
      listKey: "upcomingItems",
      empty: "No hay próximos eventos en los siguientes 7 días."
    },
    pending: {
      title: "Pendientes activos",
      description: "Pendientes que se mantienen hasta completarse.",
      listKey: "pendingItems",
      empty: "No hay pendientes activos."
    },
    overdue: {
      title: "Vencidos",
      description: "Registros activos con fecha anterior a hoy.",
      listKey: "overdueItems",
      empty: "No hay registros vencidos."
    },
    sync: {
      title: "Por sincronizar",
      description: "Registros pendientes de sincronización local, Firebase o calendario.",
      listKey: "syncPendingItems",
      empty: "No hay registros por sincronizar."
    },
    errors: {
      title: "Errores",
      description: "Registros que necesitan revisión por error de estado o sincronización.",
      listKey: "errorItems",
      empty: "No hay errores registrados."
    }
  });

  function labelType(type) {
    return { evento: "Evento", recordatorio: "Recordatorio", pendiente: "Pendiente" }[type] || "Registro";
  }

  function labelTime(item) {
    if (!item || item.todoDia || !item.horaInicio) return "Sin hora";
    return item.horaFin ? `${item.horaInicio} - ${item.horaFin}` : item.horaInicio;
  }

  function labelDate(item) {
    if (!item || !item.fechaInicio) return "Sin fecha";
    if (item.fechaFin && item.fechaFin !== item.fechaInicio) return `${item.fechaInicio} a ${item.fechaFin}`;
    return item.fechaInicio;
  }

  function rememberItems(items) {
    (Array.isArray(items) ? items : []).forEach(function eachItem(item) {
      if (!item || !item.idLocal) return;
      const exists = currentItems.some(function findExisting(current) { return current.idLocal === item.idLocal; });
      if (!exists) currentItems.push(item);
    });
  }

  function rememberSummaryItems(data) {
    currentItems = [];
    Object.values(FILTERS).forEach(function eachFilter(filter) { rememberItems(data[filter.listKey]); });
  }

  function findItem(idLocal) {
    return currentItems.find(function findCurrent(item) { return item.idLocal === idLocal; }) || null;
  }

  function renderMiniStats(summary) {
    const data = summary || {};
    inicio.dom.setText("inStatToday", String((data.todayItems || []).length));
    inicio.dom.setText("inStatUpcomingAll", String((data.allUpcomingItems || []).length));
    inicio.dom.setText("inStatUpcoming", String((data.upcomingItems || []).length));
    inicio.dom.setText("inStatPending", String((data.pendingItems || []).length));
    inicio.dom.setText("inStatOverdue", String((data.overdueItems || []).length));
    inicio.dom.setText("inStatSync", String((data.syncPendingItems || []).length));
    inicio.dom.setText("inStatErrors", String((data.errorItems || []).length));
  }

  function setActiveFilterButton(filterKey) {
    if (!global.document) return;
    global.document.querySelectorAll(".in-stat-card[data-filter]").forEach(function eachButton(button) {
      button.classList.toggle("is-active", button.dataset.filter === filterKey);
    });
  }

  function renderItem(item) {
    const safe = inicio.dom.escapeHtml;
    const id = safe(item.idLocal || "");

    return `
      <article class="in-item in-item-compact" data-id-local="${id}">
        <div class="in-item-main">
          <strong class="in-item-title">${safe(item.titulo || "Sin actividad")}</strong>
          <span class="in-item-date">${safe(labelDate(item))}</span>
        </div>
        <div class="in-item-actions">
          <button class="in-btn in-btn-small" type="button" data-action="view" data-id-local="${id}">Ver más</button>
        </div>
      </article>
    `;
  }

  function renderList(id, items, emptyText) {
    const safeItems = Array.isArray(items) ? items : [];

    if (!safeItems.length) {
      inicio.dom.setHtml(id, `<div class="in-empty">${inicio.dom.escapeHtml(emptyText)}</div>`);
      return;
    }

    inicio.dom.setHtml(id, safeItems.map(function mapItem(item) {
      return renderItem(item);
    }).join(""));
  }

  function renderActivePanel(filterKey) {
    const key = FILTERS[filterKey] ? filterKey : "today";
    const filter = FILTERS[key];
    const data = currentSummary || {};
    const items = Array.isArray(data[filter.listKey]) ? data[filter.listKey] : [];

    currentFilter = key;
    setActiveFilterButton(key);
    inicio.dom.setText("inActiveTitle", filter.title);
    inicio.dom.setText("inActiveDescription", filter.description);
    inicio.dom.setText("inActiveCount", String(items.length));
    renderList("inActiveList", items, filter.empty);
    return { ok: true, filter: key, total: items.length };
  }

  function ensureDetailPopup() {
    if (!global.document) return null;
    let popup = global.document.getElementById("inEventPopup");
    if (popup) return popup;

    popup = global.document.createElement("section");
    popup.id = "inEventPopup";
    popup.className = "in-popup";
    popup.hidden = true;
    popup.setAttribute("aria-modal", "true");
    popup.setAttribute("role", "dialog");
    popup.innerHTML = `
      <div class="in-popup-backdrop" data-action="closePopup"></div>
      <article class="in-popup-card" role="document">
        <div class="in-popup-header">
          <div>
            <span id="inPopupType" class="in-pill">Evento</span>
            <h3 id="inPopupTitle">Detalle</h3>
          </div>
          <button class="in-popup-close" type="button" data-action="closePopup" aria-label="Cerrar">×</button>
        </div>
        <div id="inPopupBody" class="in-popup-body"></div>
        <div class="in-popup-actions">
          <button id="inPopupComplete" class="in-btn in-btn-primary" type="button" data-action="completeFromPopup">Completar</button>
          <button class="in-btn" type="button" data-action="closePopup">Cerrar</button>
        </div>
      </article>
    `;
    global.document.body.appendChild(popup);
    return popup;
  }

  function detailRow(label, value) {
    const safe = inicio.dom.escapeHtml;
    const finalValue = value === null || value === undefined || value === "" ? "—" : value;
    return `<div class="in-detail-row"><span>${safe(label)}</span><strong>${safe(finalValue)}</strong></div>`;
  }

  function openDetail(idLocal) {
    const item = findItem(idLocal);
    const popup = ensureDetailPopup();
    if (!item || !popup) return false;

    const canComplete = item.estado !== "completado" && item.estado !== "cancelado";
    inicio.dom.setText("inPopupType", labelType(item.tipo));
    inicio.dom.setText("inPopupTitle", item.titulo || "Sin actividad");
    inicio.dom.setHtml("inPopupBody", `
      ${detailRow("Fecha", labelDate(item))}
      ${detailRow("Hora", labelTime(item))}
      ${detailRow("Estado", item.estado || "activo")}
      ${detailRow("Categoría", item.categoriaNombre || item.categoriaId || "Trabajo")}
      ${detailRow("Sincronización", item.estadoSync || "pendiente_sincronizar")}
      <div class="in-detail-description">
        <span>Descripción</span>
        <p>${inicio.dom.escapeHtml(item.descripcion || "Sin descripción")}</p>
      </div>
    `);

    const completeButton = global.document.getElementById("inPopupComplete");
    if (completeButton) {
      completeButton.hidden = !canComplete;
      completeButton.dataset.idLocal = item.idLocal || "";
    }

    popup.hidden = false;
    popup.dataset.idLocal = item.idLocal || "";
    return true;
  }

  function closeDetail() {
    const popup = global.document ? global.document.getElementById("inEventPopup") : null;
    if (popup) popup.hidden = true;
    return true;
  }

  function renderDashboard(summary) {
    const data = summary || {};
    currentSummary = data;
    rememberSummaryItems(data);
    renderMiniStats(data);
    renderActivePanel(currentFilter);

    inicio.dom.setText("inStatusBadge", "Conectado");
    inicio.dom.setText("inStatusTitle", "Inicio actualizado");
    inicio.dom.setText("inStatusDescription", `Datos locales cargados. Total: ${data.total || 0} registros.`);
    inicio.dom.setText("inLastUpdated", new Date().toLocaleString());
  }

  function filterDashboard(filterKey) {
    const result = renderActivePanel(filterKey);
    const filter = FILTERS[result.filter] || FILTERS.today;
    return { ok: true, action: "filterDashboard", message: `${filter.title}: ${result.total} registro(s).` };
  }

  function renderDisconnected(message) {
    currentItems = [];
    currentSummary = {};
    inicio.dom.setText("inStatusBadge", "Modo visual");
    inicio.dom.setText("inStatusTitle", "Sin conexión local");
    inicio.dom.setText("inStatusDescription", message || "Abre la app con Electron para leer la base local JSON.");
    inicio.dom.setText("inLastUpdated", "Sin actualizar");
    renderMiniStats({});
    renderActivePanel(currentFilter);
  }

  inicio.render = Object.freeze({ renderDashboard, renderDisconnected, renderList, renderItem, openDetail, closeDetail, findItem, filterDashboard });
})(window);