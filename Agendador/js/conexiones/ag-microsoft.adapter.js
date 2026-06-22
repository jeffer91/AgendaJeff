/*
  Nombre completo: ag-microsoft.adapter.js
  Ruta: Agendador/js/conexiones/ag-microsoft.adapter.js

  Función:
    - Adaptador del Agendador para Microsoft Calendar.
    - Recibe un registro local del Agendador.
    - Lo convierte al formato de Microsoft Graph.
    - Crea el evento en una o dos cuentas Microsoft conectadas.
    - Usa el módulo Microsoft Calendar existente si está cargado.
    - No depende del HTML de mc-index.html.
    - No presiona botones de Microsoft Calendar.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../servicios/ag-reminder.service.js
    - ../../microsoft-calendar/js/mc-config.js
    - ../../microsoft-calendar/js/mc-storage.js
    - ../../microsoft-calendar/js/mc-token.service.js
    - ../../microsoft-calendar/js/mc-microsoft-api.js

  Requisitos para funcionar:
    - Cargar antes los scripts necesarios del módulo Microsoft Calendar.
    - Tener Client ID / redirect configurado desde microsoft-calendar/mc-index.html.
    - Tener cuenta Microsoft 1 y/o 2 conectada.
*/

(function initAgMicrosoftAdapter(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Adapters = AG.Adapters || {};

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function isMicrosoftModuleAvailable() {
    return Boolean(
      global.MC &&
      global.MC.Storage &&
      global.MC.TokenService &&
      global.MC.MicrosoftApi &&
      global.MC.Utils
    );
  }

  function readMicrosoftConnection() {
    if (!isMicrosoftModuleAvailable()) {
      return null;
    }

    if (typeof global.MC.Storage.readConnection !== "function") {
      return null;
    }

    return global.MC.Storage.readConnection();
  }

  function hasBasicMicrosoftConfig(connection) {
    if (!connection || !connection.app) {
      return false;
    }

    if (global.MC.Storage && typeof global.MC.Storage.hasBasicAppConfig === "function") {
      return global.MC.Storage.hasBasicAppConfig();
    }

    return Boolean(connection.app.clientId);
  }

  function getCalendarIdFromAccount(account) {
    const safeAccount = account || {};

    if (global.MC.Utils && typeof global.MC.Utils.getAccountCalendarId === "function") {
      return global.MC.Utils.getAccountCalendarId(safeAccount);
    }

    return normalizeText(safeAccount.calendarId);
  }

  function getTargetAccounts(connection) {
    const safeConnection = connection || {};
    const accounts = safeConnection.accounts || {};
    const slots = ["account1", "account2"];

    return slots
      .map((slot) => {
        const account = accounts[slot] || null;

        return {
          slot,
          account
        };
      })
      .filter((entry) => {
        if (!entry.account) {
          return false;
        }

        const enabled = entry.account.enabled !== false;
        const connected = Boolean(entry.account.connected);
        const hasEmail = Boolean(normalizeText(entry.account.accountEmail));

        return enabled && (connected || hasEmail);
      });
  }

  function getBrowserTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ||
        CONFIG.DEFAULT_TIMEZONE;
    } catch (error) {
      return CONFIG.DEFAULT_TIMEZONE;
    }
  }

  function parseItemStartDate(item) {
    const safeItem = item || {};
    const date = normalizeText(safeItem.date);
    const time = normalizeText(safeItem.time) || "08:00";

    if (!date) {
      return null;
    }

    const parsedDate = new Date(`${date}T${time}:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatMicrosoftDateTime(date) {
    if (!(date instanceof Date)) {
      return "";
    }

    return [
      date.getFullYear(),
      pad2(date.getMonth() + 1),
      pad2(date.getDate())
    ].join("-") + "T" + [
      pad2(date.getHours()),
      pad2(date.getMinutes()),
      pad2(date.getSeconds())
    ].join(":");
  }

  function addMinutes(date, minutes) {
    const safeDate = new Date(date.getTime());
    safeDate.setMinutes(safeDate.getMinutes() + Number(minutes || 30));
    return safeDate;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getTypeLabel(itemType) {
    return CONFIG.TYPE_LABELS[itemType] || "Registro";
  }

  function createHtmlBody(item) {
    const safeItem = item || {};
    const responsible = safeItem.responsible || CONFIG.DEFAULT_RESPONSIBLE;
    const reminders = AG.ReminderService
      ? AG.ReminderService.buildReminderSchedule(safeItem)
      : [];

    const lines = [
      escapeHtml(normalizeText(safeItem.description) || "Sin descripción."),
      "",
      "<b>Creado desde AgendaJeff - Agendador.</b>",
      `Tipo: ${escapeHtml(getTypeLabel(safeItem.type))}`,
      `Responsable: ${escapeHtml(responsible.name || "Yo")}`,
      responsible.email ? `Correo responsable: ${escapeHtml(responsible.email)}` : "",
      reminders.length
        ? `Recordatorios configurados: ${escapeHtml(reminders.map((reminder) => reminder.label).join(", "))}`
        : "",
      `ID local Agendador: ${escapeHtml(safeItem.id || "")}`
    ].filter(Boolean);

    return lines.join("<br>");
  }

  function toMicrosoftEvent(item) {
    const safeItem = item || {};
    const startDate = parseItemStartDate(safeItem);

    if (!startDate) {
      throw new Error("Microsoft Calendar no puede crear el evento porque falta fecha válida.");
    }

    const durationMinutes = Number(safeItem.durationMinutes || CONFIG.DEFAULT_DURATION_MINUTES);
    const endDate = addMinutes(startDate, durationMinutes);
    const timeZone = getBrowserTimeZone();
    const subjectPrefix = `[${getTypeLabel(safeItem.type)}]`;

    return {
      subject: `${subjectPrefix} ${safeItem.title || "Sin título"}`,
      body: {
        contentType: "HTML",
        content: createHtmlBody(safeItem)
      },
      start: {
        dateTime: formatMicrosoftDateTime(startDate),
        timeZone
      },
      end: {
        dateTime: formatMicrosoftDateTime(endDate),
        timeZone
      },
      isReminderOn: true,
      reminderMinutesBeforeStart: safeItem.type === CONFIG.TYPES.PENDING ? 1440 : 30
    };
  }

  async function syncAccount(entry, connection, item) {
    const slot = entry.slot;
    const account = entry.account;
    const calendarId = getCalendarIdFromAccount(account);
    const tokenInfo = await global.MC.TokenService.ensureToken(slot, connection);
    const microsoftEvent = toMicrosoftEvent(item);

    const createdEvent = await global.MC.MicrosoftApi.insertEvent({
      accessToken: tokenInfo.accessToken,
      calendarId,
      event: microsoftEvent
    });

    if (global.MC.Storage && typeof global.MC.Storage.saveCreatedEvent === "function") {
      try {
        global.MC.Storage.saveCreatedEvent(slot, {
          eventId: createdEvent.id,
          webLink: createdEvent.webLink,
          subject: createdEvent.subject || createdEvent.title || item.title
        });
      } catch (error) {
        // La sincronización principal ya fue realizada. No detenemos el flujo por el histórico local.
      }
    }

    return {
      accountSlot: slot,
      accountEmail: account.accountEmail || "",
      calendarId: calendarId || "default",
      createdEvent
    };
  }

  async function syncItem(item) {
    if (!Array.isArray(item.channels) || !item.channels.includes(CONFIG.CONNECTIONS.MICROSOFT)) {
      return {
        ok: true,
        status: "skipped",
        message: "Microsoft Calendar no está seleccionado para este registro."
      };
    }

    if (!isMicrosoftModuleAvailable()) {
      return {
        ok: false,
        status: "missingAdapterDependency",
        message: "El módulo Microsoft Calendar no está cargado en esta pantalla."
      };
    }

    const connection = readMicrosoftConnection();

    if (!hasBasicMicrosoftConfig(connection)) {
      return {
        ok: false,
        status: "notConfigured",
        message: "Microsoft Calendar no tiene configuración principal guardada."
      };
    }

    const targetAccounts = getTargetAccounts(connection);

    if (!targetAccounts.length) {
      return {
        ok: false,
        status: "noConnectedAccounts",
        message: "No hay cuentas Microsoft conectadas para recibir el evento."
      };
    }

    const results = [];

    for (const entry of targetAccounts) {
      const result = await syncAccount(entry, connection, item);
      results.push(result);
    }

    return {
      ok: true,
      status: "created",
      message: `Evento creado en Microsoft Calendar para ${results.length} cuenta(s).`,
      data: {
        accounts: results
      }
    };
  }

  async function testAvailability() {
    if (!isMicrosoftModuleAvailable()) {
      return {
        ok: false,
        status: "missing",
        message: "Microsoft Calendar no está cargado."
      };
    }

    const connection = readMicrosoftConnection();

    if (!hasBasicMicrosoftConfig(connection)) {
      return {
        ok: false,
        status: "notConfigured",
        message: "Microsoft Calendar no está configurado."
      };
    }

    const targetAccounts = getTargetAccounts(connection);

    return {
      ok: targetAccounts.length > 0,
      status: targetAccounts.length > 0 ? "ready" : "noConnectedAccounts",
      message: targetAccounts.length > 0
        ? `Microsoft Calendar listo con ${targetAccounts.length} cuenta(s).`
        : "Microsoft Calendar está configurado, pero no hay cuentas conectadas.",
      data: {
        accounts: targetAccounts.map((entry) => ({
          slot: entry.slot,
          email: entry.account.accountEmail || "",
          calendarId: getCalendarIdFromAccount(entry.account) || "default"
        }))
      }
    };
  }

  AG.Adapters.MicrosoftAdapter = {
    isMicrosoftModuleAvailable,
    readMicrosoftConnection,
    toMicrosoftEvent,
    syncItem,
    testAvailability
  };
})(window);