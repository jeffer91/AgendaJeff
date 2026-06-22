/*
  Nombre completo: ag-sync.service.js
  Ruta: Agendador/js/servicios/ag-sync.service.js

  Función:
    - Coordinar sincronización del Agendador con adaptadores externos.
    - Enviar un registro a los canales seleccionados.
    - Actualizar estado por conexión.
    - No conoce detalles internos de Google, Microsoft, Telegram o Notificaciones.
    - Solo llama adaptadores registrados en AG.Adapters.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ag-reminder.service.js
    - ../conexiones/ag-google.adapter.js
    - ../conexiones/ag-microsoft.adapter.js
    - ../conexiones/ag-telegram.adapter.js
    - ../conexiones/ag-notifications.adapter.js
    - ../conexiones/ag-firebase.adapter.js
*/

(function initAgSyncService(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Adapters = AG.Adapters || {};

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function getSelectedChannels(item) {
    const safeItem = item || {};
    const channels = Array.isArray(safeItem.channels)
      ? safeItem.channels
      : CONFIG.DEFAULT_CHANNELS;

    return channels.filter(Boolean);
  }

  function getAdapterByChannel(channel) {
    const adapterMap = {
      local: AG.Adapters.LocalAdapter,
      firebase: AG.Adapters.FirebaseAdapter,
      telegram: AG.Adapters.TelegramAdapter,
      googleCalendar: AG.Adapters.GoogleAdapter,
      microsoftCalendar: AG.Adapters.MicrosoftAdapter,
      desktopNotifications: AG.Adapters.NotificationsAdapter
    };

    return adapterMap[channel] || null;
  }

  function createSkippedResult(channel, reason) {
    return {
      channel,
      ok: false,
      skipped: true,
      status: "skipped",
      message: reason || "Canal omitido.",
      syncedAt: new Date().toISOString()
    };
  }

  async function syncWithAdapter(channel, item) {
    const adapter = getAdapterByChannel(channel);

    if (channel === CONFIG.CONNECTIONS.LOCAL) {
      return {
        channel,
        ok: true,
        status: "saved",
        message: "Guardado en base local.",
        syncedAt: new Date().toISOString()
      };
    }

    if (!adapter || typeof adapter.syncItem !== "function") {
      return createSkippedResult(channel, "Adaptador todavía no creado o no cargado.");
    }

    try {
      const result = await adapter.syncItem(item);

      return {
        channel,
        ok: Boolean(result && result.ok),
        status: result && result.status ? result.status : "done",
        message: result && result.message ? result.message : "Sincronización ejecutada.",
        data: result && result.data ? result.data : null,
        syncedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        channel,
        ok: false,
        status: "error",
        message: error.message,
        syncedAt: new Date().toISOString()
      };
    }
  }

  function updateConnectionStatusFromResult(result) {
    if (!result || !result.channel) {
      return;
    }

    if (result.skipped) {
      AG.Storage.setConnectionStatus(
        result.channel,
        CONFIG.CONNECTION_STATUS.WARNING,
        result.message
      );
      return;
    }

    if (result.ok) {
      AG.Storage.setConnectionStatus(
        result.channel,
        CONFIG.CONNECTION_STATUS.OK,
        result.message
      );
      return;
    }

    AG.Storage.setConnectionStatus(
      result.channel,
      CONFIG.CONNECTION_STATUS.ERROR,
      result.message
    );
  }

  function createSyncStatusFromResults(results) {
    const safeResults = Array.isArray(results) ? results : {};
    const syncStatus = {};

    safeResults.forEach((result) => {
      syncStatus[result.channel] = result.status || "unknown";
    });

    return syncStatus;
  }

  async function syncItem(item) {
    const safeItem = item || {};
    const itemId = normalizeText(safeItem.id);

    if (!itemId) {
      throw new Error("No se puede sincronizar un registro sin ID.");
    }

    const channels = getSelectedChannels(safeItem);
    const results = [];

    for (const channel of channels) {
      const result = await syncWithAdapter(channel, safeItem);
      results.push(result);
      updateConnectionStatusFromResult(result);
    }

    const syncStatus = createSyncStatusFromResults(results);

    AG.Storage.updateItem(itemId, {
      syncStatus,
      lastSyncedAt: new Date().toISOString(),
      lastSyncResults: results
    });

    return {
      ok: results.every((result) => result.ok || result.skipped),
      itemId,
      channels,
      syncStatus,
      results
    };
  }

  async function syncItemById(itemId) {
    const item = AG.Storage.findItemById(itemId);

    if (!item) {
      throw new Error("No se encontró el registro para sincronizar.");
    }

    return syncItem(item);
  }

  async function syncPendingItems() {
    const items = AG.Storage.readItems();
    const pendingItems = items.filter((item) => {
      const syncStatus = item.syncStatus || {};
      const channels = getSelectedChannels(item);

      return channels.some((channel) => {
        return syncStatus[channel] === "pendingAdapter" ||
          syncStatus[channel] === "pending" ||
          syncStatus[channel] === "error";
      });
    });

    const results = [];

    for (const item of pendingItems) {
      const result = await syncItem(item);
      results.push(result);
    }

    return {
      ok: true,
      total: pendingItems.length,
      results
    };
  }

  function getSyncSummary(items) {
    const safeItems = Array.isArray(items) ? items : [];
    const summary = {
      total: safeItems.length,
      pending: 0,
      synced: 0,
      error: 0,
      skipped: 0
    };

    safeItems.forEach((item) => {
      const syncStatus = item.syncStatus || {};
      const statuses = Object.values(syncStatus);

      if (statuses.some((status) => status === "error")) {
        summary.error += 1;
        return;
      }

      if (statuses.some((status) => status === "pendingAdapter" || status === "pending")) {
        summary.pending += 1;
        return;
      }

      if (statuses.some((status) => status === "skipped")) {
        summary.skipped += 1;
        return;
      }

      summary.synced += 1;
    });

    return summary;
  }

  AG.SyncService = {
    getSelectedChannels,
    getAdapterByChannel,
    syncWithAdapter,
    syncItem,
    syncItemById,
    syncPendingItems,
    getSyncSummary
  };
})(window);