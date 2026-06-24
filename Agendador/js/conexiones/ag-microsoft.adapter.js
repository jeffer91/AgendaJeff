/*
  Nombre completo: ag-microsoft.adapter.js
  Ruta: Agendador/js/conexiones/ag-microsoft.adapter.js

  Función:
    - Adaptador del Agendador para Microsoft Calendar.
    - Recibe un registro local del Agendador.
    - Lo convierte al formato Microsoft Graph Event.
    - Crea el evento en una o dos cuentas Microsoft conectadas.
    - No depende del HTML de Microsoft Calendar.
    - No presiona botones ni usa IDs de mc-index.html.

  Regla funcional:
    - Microsoft Calendar solo recibe eventos desde Agendador o Carga Masiva.
    - La pantalla microsoft-calendar/mc-index.html no crea eventos.
*/

(function initAgMicrosoftAdapter(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Adapters = AG.Adapters || {};

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function escapeHtml(value) {
    return normalizeText(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
    return Boolean(
      connection &&
      connection.configured &&
      connection.app &&
      normalizeText(connection.app.clientId)
    );
  }

  function getAuthorizedSource(item) {
    const safeItem = item || {};

    if (safeItem.origin === "cargaMasiva" || safeItem.source === "cargaMasiva") {
      return "cargaMasiva";
    }

    return "agendador";
  }

  function getTargetAccounts(connection) {
    const safeConnection = connection || {};
    const accounts = safeConnection.accounts || {};
    const result = [];

    ["account1", "account2"].forEach((slot) => {
      const account = accounts[slot] || {};

      if (account.connected && normalizeText(account.accountEmail)) {
        result.push({ slot, account });
      }
    });

    return result;
  }

  function getCalendarIdFromAccount(account) {
    if (!account) {
      return "";
    }

    if (account.calendarMode === "specific") {
      return normalizeText(account.calendarId);
    }

    return "";
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

  function addMinutes(date, minutes) {
    const safeDate = new Date(date.getTime());
    safeDate.setMinutes(safeDate.getMinutes() + Number(minutes || 30));
    return safeDate;
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
      safeItem.origin === "cargaMasiva" || safeItem.source === "cargaMasiva"
        ? "<b>Creado desde AgendaJeff - Carga Masiva.</b>"
        : "<b>Creado desde AgendaJeff - Agendador.</b>",
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
      event: microsoftEvent,
      source: getAuthorizedSource(item),
      sourceItemId: item && item.id ? item.id : ""
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
    getAuthorizedSource,
    toMicrosoftEvent,
    syncItem,
    testAvailability
  };
})(window);
