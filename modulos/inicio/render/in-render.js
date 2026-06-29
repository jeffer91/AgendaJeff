/*
  Nombre completo: in-render.js
  Ruta: modulos/inicio/render/in-render.js

  Función:
    - Renderizar tarjetas, listas y estado visual de la pantalla Inicio.
    - Mostrar tarjetas compactas: título, fecha y botón Ver más.
    - Abrir pop-up con el detalle completo de cada evento.
*/

(function initInicioRender(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const inicio = root.Inicio = root.Inicio || {};
  let currentItems = [];

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

  function findItem(idLocal) {
    return currentItems.find(function findCurrent(item) { return item.idLocal === idLocal; }) || null;
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
    currentItems = [];
    rememberItems(data.todayItems);
    rememberItems(data.upcomingItems);
    rememberItems(data.pendingItems);
    rememberItems(data.overdueItems);
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
    currentItems = [];
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

  inicio.render = Object.freeze({ renderDashboard, renderDisconnected, renderList, renderItem, openDetail, closeDetail, findItem });
})(window);