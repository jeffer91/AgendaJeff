/*
  Nombre completo: ag-event.service.js
  Ruta: Agendador/js/servicios/ag-event.service.js

  Función:
    - Crear y normalizar eventos, pendientes y recordatorios.
    - Calcular fechas para próximos, hoy, mañana y pasados.
    - Filtrar registros por estado.
    - Crear resumen del dashboard.
    - Preparar estructura de sincronización para futuros adaptadores.
    - No guarda directamente en localStorage.
    - No pinta interfaz.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../ag-app.js
    - ../ag-ui.js
*/

(function initAgEventService(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function createDateOnly(date) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0
    );
  }

  function formatDateInput(date) {
    const safeDate = date instanceof Date ? date : new Date();

    return [
      safeDate.getFullYear(),
      pad2(safeDate.getMonth() + 1),
      pad2(safeDate.getDate())
    ].join("-");
  }

  function formatTimeInput(date) {
    const safeDate = date instanceof Date ? date : new Date();

    return [
      pad2(safeDate.getHours()),
      pad2(safeDate.getMinutes())
    ].join(":");
  }

  function addDays(date, days) {
    const safeDate = new Date(date.getTime());
    safeDate.setDate(safeDate.getDate() + Number(days || 0));
    return safeDate;
  }

  function addMinutes(date, minutes) {
    const safeDate = new Date(date.getTime());
    safeDate.setMinutes(safeDate.getMinutes() + Number(minutes || 0));
    return safeDate;
  }

  function parseDurationMinutes(value) {
    const duration = Number(value);

    if (!Number.isFinite(duration)) {
      return CONFIG.DEFAULT_DURATION_MINUTES;
    }

    if (duration < 5) {
      return 5;
    }

    if (duration > 1440) {
      return 1440;
    }

    return Math.round(duration);
  }

  function parseLocalDateTime(dateValue, timeValue) {
    const date = normalizeText(dateValue);
    const time = normalizeText(timeValue);

    if (!date) {
      return null;
    }

    const normalizedTime = time || "00:00";
    const parsedDate = new Date(`${date}T${normalizedTime}:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  function getItemDate(item) {
    const safeItem = item || {};
    return parseLocalDateTime(safeItem.date, safeItem.time);
  }

  function isSameDay(firstDate, secondDate) {
    if (!(firstDate instanceof Date) || !(secondDate instanceof Date)) {
      return false;
    }

    return createDateOnly(firstDate).getTime() === createDateOnly(secondDate).getTime();
  }

  function isToday(item) {
    const itemDate = getItemDate(item);

    if (!itemDate) {
      return false;
    }

    return isSameDay(itemDate, new Date());
  }

  function isTomorrow(item) {
    const itemDate = getItemDate(item);

    if (!itemDate) {
      return false;
    }

    return isSameDay(itemDate, addDays(new Date(), 1));
  }

  function isPast(item) {
    const itemDate = getItemDate(item);

    if (!itemDate) {
      return false;
    }

    return itemDate.getTime() < Date.now() &&
      item.status !== CONFIG.STATUS.COMPLETED;
  }

  function isUpcoming(item) {
    const itemDate = getItemDate(item);

    if (!itemDate) {
      return false;
    }

    return itemDate.getTime() >= Date.now() &&
      item.status !== CONFIG.STATUS.COMPLETED;
  }

  function normalizeType(type) {
    const value = normalizeText(type);

    if (
      value === CONFIG.TYPES.EVENT ||
      value === CONFIG.TYPES.PENDING ||
      value === CONFIG.TYPES.REMINDER
    ) {
      return value;
    }

    return CONFIG.TYPES.EVENT;
  }

  function normalizePriority(priority) {
    const value = normalizeText(priority);

    if (
      value === CONFIG.PRIORITIES.LOW ||
      value === CONFIG.PRIORITIES.NORMAL ||
      value === CONFIG.PRIORITIES.HIGH ||
      value === CONFIG.PRIORITIES.URGENT
    ) {
      return value;
    }

    return CONFIG.PRIORITIES.NORMAL;
  }

  function normalizeArray(value, fallback) {
    if (!Array.isArray(value)) {
      return Array.isArray(fallback) ? fallback : [];
    }

    return value.map(normalizeText).filter(Boolean);
  }

  function createSyncStatus(channels) {
    const selectedChannels = normalizeArray(channels, CONFIG.DEFAULT_CHANNELS);
    const syncStatus = {
      local: "saved"
    };

    selectedChannels.forEach((channel) => {
      if (channel === CONFIG.CONNECTIONS.LOCAL) {
        syncStatus[channel] = "saved";
        return;
      }

      syncStatus[channel] = "pendingAdapter";
    });

    return syncStatus;
  }

  function normalizeResponsible(responsible) {
    const safeResponsible = responsible || CONFIG.DEFAULT_RESPONSIBLE;

    return {
      id: normalizeText(safeResponsible.id) || CONFIG.DEFAULT_RESPONSIBLE.id,
      name: normalizeText(safeResponsible.name) || CONFIG.DEFAULT_RESPONSIBLE.name,
      email: normalizeText(safeResponsible.email),
      phone: normalizeText(safeResponsible.phone),
      type: normalizeText(safeResponsible.type) || "internal"
    };
  }

  function validateItemInput(input) {
    const safeInput = input || {};
    const type = normalizeType(safeInput.type);
    const title = normalizeText(safeInput.title);
    const date = normalizeText(safeInput.date);
    const time = normalizeText(safeInput.time);

    if (!title) {
      throw new Error("Escribe un título.");
    }

    if (!date) {
      throw new Error("Selecciona una fecha.");
    }

    if (type !== CONFIG.TYPES.PENDING && !time) {
      throw new Error("Selecciona una hora.");
    }

    if (!parseLocalDateTime(date, time)) {
      throw new Error("La fecha u hora no es válida.");
    }
  }

  function createItem(input, responsible) {
    const safeInput = input || {};
    const type = normalizeType(safeInput.type);
    const title = normalizeText(safeInput.title);
    const date = normalizeText(safeInput.date);
    const time = normalizeText(safeInput.time);
    const durationMinutes = parseDurationMinutes(safeInput.durationMinutes);
    const startDate = parseLocalDateTime(date, time);
    const endDate = type === CONFIG.TYPES.PENDING ? null : addMinutes(startDate, durationMinutes);
    const reminders = normalizeArray(safeInput.reminders, CONFIG.DEFAULT_REMINDERS);
    const channels = normalizeArray(safeInput.channels, CONFIG.DEFAULT_CHANNELS);

    validateItemInput(safeInput);

    return {
      id: AG.Storage.createId("ag-item"),
      type,
      title,
      date,
      time,
      durationMinutes,
      priority: normalizePriority(safeInput.priority),
      responsible: normalizeResponsible(responsible),
      description: normalizeText(safeInput.description),
      reminders,
      channels,
      status: CONFIG.STATUS.ACTIVE,
      syncStatus: createSyncStatus(channels),
      startAt: startDate ? startDate.toISOString() : "",
      endAt: endDate ? endDate.toISOString() : "",
      source: CONFIG.SOURCE,
      createdAt: AG.Storage.nowIso(),
      updatedAt: AG.Storage.nowIso()
    };
  }

  function duplicateItem(item) {
    const safeItem = item || {};
    const title = normalizeText(safeItem.title) || "Registro duplicado";

    return {
      ...safeItem,
      id: AG.Storage.createId("ag-item"),
      title: `${title} - copia`,
      status: CONFIG.STATUS.ACTIVE,
      syncStatus: createSyncStatus(safeItem.channels),
      completedAt: "",
      createdAt: AG.Storage.nowIso(),
      updatedAt: AG.Storage.nowIso()
    };
  }

  function normalizeItemsForRuntime(items) {
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems.map((item) => {
      const safeItem = item || {};
      const type = normalizeType(safeItem.type);
      const status = safeItem.status === CONFIG.STATUS.COMPLETED
        ? CONFIG.STATUS.COMPLETED
        : CONFIG.STATUS.ACTIVE;

      return {
        ...safeItem,
        type,
        status,
        title: normalizeText(safeItem.title) || "Sin título",
        priority: normalizePriority(safeItem.priority),
        responsible: normalizeResponsible(safeItem.responsible),
        reminders: normalizeArray(safeItem.reminders, CONFIG.DEFAULT_REMINDERS),
        channels: normalizeArray(safeItem.channels, CONFIG.DEFAULT_CHANNELS)
      };
    }).sort((firstItem, secondItem) => {
      const firstDate = getItemDate(firstItem);
      const secondDate = getItemDate(secondItem);

      if (!firstDate && !secondDate) {
        return 0;
      }

      if (!firstDate) {
        return 1;
      }

      if (!secondDate) {
        return -1;
      }

      return firstDate.getTime() - secondDate.getTime();
    });
  }

  function filterItems(items, filterName) {
    const safeItems = normalizeItemsForRuntime(items);
    const filter = normalizeText(filterName) || CONFIG.FILTERS.UPCOMING;

    if (filter === CONFIG.FILTERS.ALL) {
      return safeItems;
    }

    if (filter === CONFIG.FILTERS.TODAY) {
      return safeItems.filter(isToday);
    }

    if (filter === CONFIG.FILTERS.PENDING) {
      return safeItems.filter((item) => {
        return item.type === CONFIG.TYPES.PENDING &&
          item.status !== CONFIG.STATUS.COMPLETED;
      });
    }

    if (filter === CONFIG.FILTERS.PAST) {
      return safeItems.filter((item) => {
        return isPast(item) || item.status === CONFIG.STATUS.COMPLETED;
      });
    }

    return safeItems.filter(isUpcoming);
  }

  function findNextItem(items) {
    const upcomingItems = normalizeItemsForRuntime(items)
      .filter(isUpcoming)
      .filter((item) => item.type !== CONFIG.TYPES.PENDING);

    return upcomingItems[0] || null;
  }

  function createDashboardSummary(items) {
    const safeItems = normalizeItemsForRuntime(items);

    return {
      total: safeItems.length,
      nextItem: findNextItem(safeItems),
      todayCount: safeItems.filter(isToday).length,
      tomorrowCount: safeItems.filter(isTomorrow).length,
      pendingCount: safeItems.filter((item) => {
        return item.type === CONFIG.TYPES.PENDING &&
          item.status !== CONFIG.STATUS.COMPLETED;
      }).length,
      pastCount: safeItems.filter(isPast).length
    };
  }

  function createDemoItems(responsible) {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const later = addDays(today, 3);

    return [
      createItem(
        {
          type: CONFIG.TYPES.EVENT,
          title: "Reunión de prueba del Agendador",
          date: formatDateInput(tomorrow),
          time: "09:00",
          durationMinutes: 30,
          priority: CONFIG.PRIORITIES.NORMAL,
          description: "Evento demo guardado localmente.",
          reminders: CONFIG.DEFAULT_REMINDERS,
          channels: CONFIG.DEFAULT_CHANNELS
        },
        responsible
      ),
      createItem(
        {
          type: CONFIG.TYPES.PENDING,
          title: "Revisar pendientes de titulación",
          date: formatDateInput(later),
          time: "",
          durationMinutes: 30,
          priority: CONFIG.PRIORITIES.HIGH,
          description: "Pendiente demo para probar filtros.",
          reminders: ["3d", "1d", "0d"],
          channels: ["local", "telegram", "desktopNotifications"]
        },
        responsible
      ),
      createItem(
        {
          type: CONFIG.TYPES.REMINDER,
          title: "Recordatorio de prueba",
          date: formatDateInput(today),
          time: formatTimeInput(addMinutes(today, 20)),
          durationMinutes: 15,
          priority: CONFIG.PRIORITIES.NORMAL,
          description: "Recordatorio demo para hoy.",
          reminders: ["0d", "30m"],
          channels: ["local", "telegram", "desktopNotifications"]
        },
        responsible
      )
    ];
  }

  AG.EventService = {
    formatDateInput,
    formatTimeInput,
    addDays,
    addMinutes,

    createItem,
    duplicateItem,
    normalizeItemsForRuntime,
    filterItems,
    findNextItem,
    createDashboardSummary,
    createDemoItems,

    isToday,
    isTomorrow,
    isPast,
    isUpcoming,
    getItemDate
  };
})(window);