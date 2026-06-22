/*
  Nombre completo: ag-app.js
  Ruta: Agendador/js/ag-app.js

  Función:
    - Coordinar la pantalla del Agendador.
    - Cargar datos iniciales desde base local.
    - Crear registros nuevos.
    - Guardar primero en localStorage.
    - Sincronizar después con adaptadores externos.
    - Aplicar filtros.
    - Actualizar reloj, resumen, lista y estados superiores.
    - Marcar completados, duplicar, sincronizar y eliminar registros.
    - Revisar estado de Google, Microsoft, Telegram, Notificaciones y Firebase.

  Se conecta con:
    - ag-config.js
    - ag-storage.js
    - ag-ui.js
    - servicios/ag-event.service.js
    - servicios/ag-pending.service.js
    - servicios/ag-reminder.service.js
    - servicios/ag-responsible.service.js
    - servicios/ag-filter.service.js
    - servicios/ag-clock.service.js
    - servicios/ag-dashboard.service.js
    - servicios/ag-sync.service.js
    - conexiones/ag-google.adapter.js
    - conexiones/ag-microsoft.adapter.js
    - conexiones/ag-telegram.adapter.js
    - conexiones/ag-notifications.adapter.js
    - conexiones/ag-firebase.adapter.js
    - componentes/ag-header-status.component.js
    - componentes/ag-summary-cards.component.js
    - componentes/ag-event-form.component.js
    - componentes/ag-event-list.component.js
    - componentes/ag-responsible-modal.component.js
    - componentes/ag-toast.component.js
    - ag-bindings.js
*/

(function initAgApp(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  let currentFilter = CONFIG.FILTERS.UPCOMING;

  function toastSuccess(message) {
    if (AG.Components && AG.Components.Toast) {
      AG.Components.Toast.success(message);
      return;
    }

    AG.UI.showToast(message);
  }

  function toastError(message) {
    if (AG.Components && AG.Components.Toast) {
      AG.Components.Toast.error(message);
      return;
    }

    AG.UI.showToast(message);
  }

  function toastWarning(message) {
    if (AG.Components && AG.Components.Toast) {
      AG.Components.Toast.warning(message);
      return;
    }

    AG.UI.showToast(message);
  }

  function toastInfo(message) {
    if (AG.Components && AG.Components.Toast) {
      AG.Components.Toast.info(message);
      return;
    }

    AG.UI.showToast(message);
  }

  function startClock() {
    if (AG.ClockService && typeof AG.ClockService.start === "function") {
      AG.ClockService.start(() => {
        refreshSummaryOnly();
      });
      return;
    }

    AG.UI.setClock(new Date());

    global.setInterval(() => {
      AG.UI.setClock(new Date());
    }, 1000);
  }

  function ensureInitialData() {
    if (
      AG.ResponsibleService &&
      typeof AG.ResponsibleService.ensureDefaultResponsible === "function"
    ) {
      AG.ResponsibleService.ensureDefaultResponsible();
    } else {
      const responsibles = AG.Storage.readResponsibles();

      if (!responsibles.length) {
        AG.Storage.saveResponsibles([CONFIG.DEFAULT_RESPONSIBLE]);
      }
    }

    AG.Storage.setConnectionStatus(
      CONFIG.CONNECTIONS.LOCAL,
      CONFIG.CONNECTION_STATUS.OK,
      "Base local lista."
    );
  }

  function loadResponsibles(selectedId) {
    AG.UI.renderResponsibles(AG.Storage.readResponsibles(), selectedId);
  }

  function refreshConnectionStatus() {
    if (
      AG.Components &&
      AG.Components.HeaderStatus &&
      typeof AG.Components.HeaderStatus.refresh === "function"
    ) {
      AG.Components.HeaderStatus.refresh();
      return;
    }

    AG.UI.renderConnectionStatus(AG.Storage.readConnectionStatus());
  }

  function refreshSummaryOnly() {
    const items = AG.EventService.normalizeItemsForRuntime(AG.Storage.readItems());

    if (
      AG.Components &&
      AG.Components.SummaryCards &&
      typeof AG.Components.SummaryCards.render === "function"
    ) {
      AG.Components.SummaryCards.render(items);
      return;
    }

    const summary = AG.DashboardService
      ? AG.DashboardService.createSummary(items)
      : AG.EventService.createDashboardSummary(items);

    AG.UI.renderSummary(summary);
  }

  function getFilteredItems(items, filterName) {
    if (AG.FilterService && typeof AG.FilterService.applyFilter === "function") {
      return AG.FilterService.applyFilter(items, filterName);
    }

    return AG.EventService.filterItems(items, filterName);
  }

  function renderList(items, filterName) {
    if (
      AG.Components &&
      AG.Components.EventList &&
      typeof AG.Components.EventList.render === "function"
    ) {
      AG.Components.EventList.render(items, filterName);
      return;
    }

    AG.UI.renderItems(items, filterName);
  }

  function refresh() {
    const items = AG.EventService.normalizeItemsForRuntime(AG.Storage.readItems());
    const filteredItems = getFilteredItems(items, currentFilter);

    refreshSummaryOnly();
    renderList(filteredItems, currentFilter);
    refreshConnectionStatus();

    return {
      total: items.length,
      filter: currentFilter,
      filtered: filteredItems.length,
      summary: AG.DashboardService
        ? AG.DashboardService.createSummary(items)
        : AG.EventService.createDashboardSummary(items)
    };
  }

  function setFilter(filterName) {
    currentFilter = AG.FilterService
      ? AG.FilterService.saveActiveFilter(filterName)
      : AG.Storage.saveActiveFilter(filterName || CONFIG.FILTERS.UPCOMING);

    const result = refresh();

    AG.UI.setOutput({
      ok: true,
      message: "Filtro actualizado.",
      filter: currentFilter,
      filtered: result.filtered
    });
  }

  async function syncSavedItem(savedItem) {
    if (!AG.SyncService || typeof AG.SyncService.syncItem !== "function") {
      AG.Storage.setConnectionStatus(
        CONFIG.CONNECTIONS.LOCAL,
        CONFIG.CONNECTION_STATUS.WARNING,
        "Registro guardado localmente. SyncService no está cargado."
      );

      return {
        ok: false,
        skipped: true,
        message: "SyncService no está cargado."
      };
    }

    return AG.SyncService.syncItem(savedItem);
  }

  function getSyncMessage(syncResult) {
    if (!syncResult) {
      return "Registro guardado localmente.";
    }

    const results = Array.isArray(syncResult.results) ? syncResult.results : [];

    if (!results.length) {
      return "Registro guardado localmente.";
    }

    const errors = results.filter((result) => !result.ok && !result.skipped);
    const skipped = results.filter((result) => result.skipped);
    const ok = results.filter((result) => result.ok);

    if (errors.length) {
      return `Guardado local. ${ok.length} canal(es) OK, ${errors.length} con error y ${skipped.length} pendiente(s).`;
    }

    if (skipped.length) {
      return `Guardado local. ${ok.length} canal(es) OK y ${skipped.length} pendiente(s).`;
    }

    return "Registro guardado y sincronizado.";
  }

  async function createItemFromForm(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    let savedItem = null;

    try {
      const formData = AG.Components && AG.Components.EventForm
        ? AG.Components.EventForm.validate(AG.Components.EventForm.read())
        : AG.UI.readForm();

      const responsible = AG.Storage.findResponsibleById(formData.responsibleId);
      const item = AG.EventService.createItem(formData, responsible);

      savedItem = AG.Storage.saveItem(item);

      AG.Storage.setConnectionStatus(
        CONFIG.CONNECTIONS.LOCAL,
        CONFIG.CONNECTION_STATUS.OK,
        "Registro guardado localmente."
      );

      refresh();

      toastInfo("Guardado local. Sincronizando canales...");

      const syncResult = await syncSavedItem(savedItem);
      const syncMessage = getSyncMessage(syncResult);

      refresh();

      if (AG.Components && AG.Components.EventForm) {
        AG.Components.EventForm.reset();
      } else {
        AG.UI.clearForm();
      }

      if (syncResult && syncResult.ok) {
        toastSuccess(syncMessage);
      } else {
        toastWarning(syncMessage);
      }

      AG.UI.setOutput({
        ok: Boolean(syncResult && syncResult.ok),
        message: syncMessage,
        savedItem,
        sync: syncResult
      });
    } catch (error) {
      AG.Storage.setConnectionStatus(
        CONFIG.CONNECTIONS.LOCAL,
        CONFIG.CONNECTION_STATUS.ERROR,
        error.message
      );

      refreshConnectionStatus();
      toastError(error.message);

      AG.UI.setOutput({
        ok: false,
        message: error.message,
        savedItem
      });
    }
  }

  function addResponsibleFromModal() {
    try {
      const responsible = AG.Components && AG.Components.ResponsibleModal
        ? AG.Components.ResponsibleModal.saveFromModal()
        : AG.Storage.createResponsible(AG.UI.readResponsibleModal());

      loadResponsibles(responsible.id);

      if (!(AG.Components && AG.Components.ResponsibleModal)) {
        AG.UI.closeResponsibleModal();
      }

      toastSuccess("Responsable agregado.");

      AG.UI.setOutput({
        ok: true,
        message: "Responsable externo agregado correctamente.",
        responsible
      });
    } catch (error) {
      toastError(error.message);

      AG.UI.setOutput({
        ok: false,
        message: error.message
      });
    }
  }

  async function syncItemById(itemId) {
    try {
      if (!AG.SyncService || typeof AG.SyncService.syncItemById !== "function") {
        throw new Error("El servicio de sincronización no está cargado.");
      }

      toastWarning("Sincronizando registro...");

      const result = await AG.SyncService.syncItemById(itemId);
      const syncMessage = getSyncMessage(result);

      refresh();

      if (result.ok) {
        toastSuccess(syncMessage);
      } else {
        toastWarning(syncMessage);
      }

      AG.UI.setOutput({
        ok: result.ok,
        message: syncMessage,
        result
      });
    } catch (error) {
      refreshConnectionStatus();
      toastError(error.message);

      AG.UI.setOutput({
        ok: false,
        message: error.message
      });
    }
  }

  async function handleItemAction(action, itemId) {
    const safeAction = AG.Storage.normalizeText(action);
    const safeItemId = AG.Storage.normalizeText(itemId);

    if (!safeAction || !safeItemId) {
      return;
    }

    try {
      if (safeAction === "complete") {
        const completedItem = AG.Storage.markCompleted(safeItemId);

        refresh();
        toastSuccess("Registro completado.");

        AG.UI.setOutput({
          ok: true,
          message: "Registro marcado como completado.",
          completedItem
        });

        return;
      }

      if (safeAction === "delete") {
        const deleted = AG.Storage.deleteItem(safeItemId);

        refresh();
        toastSuccess("Registro eliminado.");

        AG.UI.setOutput({
          ok: true,
          message: "Registro eliminado.",
          deleted
        });

        return;
      }

      if (safeAction === "duplicate") {
        const item = AG.Storage.findItemById(safeItemId);

        if (!item) {
          throw new Error("No se encontró el registro para duplicar.");
        }

        const duplicatedItem = AG.EventService.duplicateItem(item);
        const savedItem = AG.Storage.saveItem(duplicatedItem);

        refresh();
        toastSuccess("Registro duplicado.");

        AG.UI.setOutput({
          ok: true,
          message: "Registro duplicado correctamente.",
          savedItem
        });

        return;
      }

      if (safeAction === "sync") {
        await syncItemById(safeItemId);
      }
    } catch (error) {
      toastError(error.message);

      AG.UI.setOutput({
        ok: false,
        message: error.message
      });
    }
  }

  function createDemoItems() {
    try {
      const demoItems = AG.EventService.createDemoItems(
        AG.Storage.findResponsibleById(CONFIG.DEFAULT_RESPONSIBLE.id)
      );

      demoItems.forEach((item) => {
        AG.Storage.saveItem(item);
      });

      refresh();
      toastSuccess("Demo cargada.");

      AG.UI.setOutput({
        ok: true,
        message: "Se crearon registros de demostración.",
        count: demoItems.length
      });
    } catch (error) {
      toastError(error.message);

      AG.UI.setOutput({
        ok: false,
        message: error.message
      });
    }
  }

  function handleTypeChange() {
    if (
      AG.Components &&
      AG.Components.EventForm &&
      typeof AG.Components.EventForm.applyTypeRules === "function"
    ) {
      return AG.Components.EventForm.applyTypeRules();
    }

    const elements = AG.UI.getElements();
    const type = elements.type.value;

    if (type === CONFIG.TYPES.PENDING) {
      elements.time.required = false;
      elements.duration.disabled = true;
    } else {
      elements.time.required = true;
      elements.duration.disabled = false;
    }

    return {
      type
    };
  }

  function resetForm() {
    if (AG.Components && AG.Components.EventForm) {
      AG.Components.EventForm.reset();
    } else {
      AG.UI.clearForm();
    }

    handleTypeChange();

    AG.UI.setOutput({
      ok: true,
      message: "Formulario limpio."
    });
  }

  async function checkAdaptersAvailability() {
    const adapterChecks = [
      {
        channel: CONFIG.CONNECTIONS.GOOGLE,
        adapter: AG.Adapters && AG.Adapters.GoogleAdapter
      },
      {
        channel: CONFIG.CONNECTIONS.MICROSOFT,
        adapter: AG.Adapters && AG.Adapters.MicrosoftAdapter
      },
      {
        channel: CONFIG.CONNECTIONS.TELEGRAM,
        adapter: AG.Adapters && AG.Adapters.TelegramAdapter
      },
      {
        channel: CONFIG.CONNECTIONS.DESKTOP,
        adapter: AG.Adapters && AG.Adapters.NotificationsAdapter
      },
      {
        channel: CONFIG.CONNECTIONS.FIREBASE,
        adapter: AG.Adapters && AG.Adapters.FirebaseAdapter
      }
    ];

    for (const check of adapterChecks) {
      if (!check.adapter || typeof check.adapter.testAvailability !== "function") {
        AG.Storage.setConnectionStatus(
          check.channel,
          CONFIG.CONNECTION_STATUS.WARNING,
          "Adaptador no cargado."
        );
        continue;
      }

      try {
        const result = await check.adapter.testAvailability();

        AG.Storage.setConnectionStatus(
          check.channel,
          result.ok
            ? CONFIG.CONNECTION_STATUS.OK
            : CONFIG.CONNECTION_STATUS.WARNING,
          result.message || "Estado revisado."
        );
      } catch (error) {
        AG.Storage.setConnectionStatus(
          check.channel,
          CONFIG.CONNECTION_STATUS.ERROR,
          error.message
        );
      }
    }

    refreshConnectionStatus();
  }

  function bindComponentsIfNeeded() {
    if (
      AG.Components &&
      AG.Components.ResponsibleModal &&
      typeof AG.Components.ResponsibleModal.renderResponsibles === "function"
    ) {
      AG.Components.ResponsibleModal.renderResponsibles(CONFIG.DEFAULT_RESPONSIBLE.id);
    }
  }

  function start() {
    currentFilter = AG.FilterService
      ? AG.FilterService.readActiveFilter()
      : AG.Storage.readActiveFilter();

    ensureInitialData();

    if (AG.Components && AG.Components.EventForm) {
      AG.Components.EventForm.setDefaultDateTime();
      AG.Components.EventForm.applyTypeRules();
    } else {
      AG.UI.setupInitialInputs();
      handleTypeChange();
    }

    loadResponsibles(CONFIG.DEFAULT_RESPONSIBLE.id);
    bindComponentsIfNeeded();
    startClock();

    const result = refresh();

    AG.UI.setOutput({
      ok: true,
      message: "Agendador iniciado correctamente.",
      mode: "local + adaptadores",
      totalItems: result.total,
      activeFilter: currentFilter,
      note: "El Agendador guarda localmente y luego intenta sincronizar con los canales seleccionados."
    });

    checkAdaptersAvailability();
  }

  AG.App = {
    start,
    refresh,
    refreshSummaryOnly,
    refreshConnectionStatus,
    setFilter,
    createItemFromForm,
    addResponsibleFromModal,
    handleItemAction,
    syncItemById,
    createDemoItems,
    handleTypeChange,
    resetForm,
    checkAdaptersAvailability
  };
})(window);