/* AgendaJeff Firebase adapter */
(function initAgendaJeffFirebaseAdapter(global) {
  "use strict";

  const core = global.AgendaJeffCore = global.AgendaJeffCore || {};
  const integrations = core.Integrations = core.Integrations || {};
  const COLLECTION_NAME = "agendaJeff_eventos";

  function result(input) {
    const data = input && typeof input === "object" ? input : {};
    return {
      ok: Boolean(data.ok),
      status: data.status || (data.ok ? "ready" : "pending"),
      action: data.action || "firebaseSave",
      source: "agenda-firebase-adapter",
      message: data.message || "",
      data: data.data || null,
      error: data.error || null,
      checkedAt: new Date().toISOString()
    };
  }

  function clean(value) {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === "object") {
      const output = {};
      Object.keys(value).forEach(function eachKey(key) {
        if (value[key] !== undefined) output[key] = clean(value[key]);
      });
      return output;
    }
    return value === undefined ? null : value;
  }

  async function getDb() {
    const services = core.Services || {};
    if (!services.getServiceWindow) return result({ ok: false, message: "Servicios no disponibles." });
    if (services.start) services.start();
    if (services.waitForConnector) await services.waitForConnector("telegram", "sendMessage", 9000);

    const serviceWindow = services.getServiceWindow("telegram");
    const sdk = serviceWindow ? serviceWindow.firebase : null;
    const telegram = serviceWindow && serviceWindow.AgendaJeffModules ? serviceWindow.AgendaJeffModules.Telegram : null;

    if (telegram && telegram.Firebase && typeof telegram.Firebase.initializeFirebase === "function") {
      telegram.Firebase.initializeFirebase();
    }

    if (!sdk || typeof sdk.firestore !== "function") return result({ ok: false, message: "SDK Firebase no disponible." });

    try {
      return result({ ok: true, message: "Firestore listo.", data: { db: sdk.firestore() } });
    } catch (error) {
      return result({ ok: false, status: "error", message: "Firestore no disponible.", error: { message: error && error.message ? error.message : String(error) } });
    }
  }

  async function saveItem(item, actionName) {
    const data = item && typeof item === "object" ? item : {};
    const idLocal = data.idLocal || "";
    if (!idLocal) return result({ ok: false, status: "error", message: "Falta idLocal." });

    const dbResult = await getDb();
    if (!dbResult.ok || !dbResult.data || !dbResult.data.db) return result({ ok: false, message: "Firebase pendiente.", data: { dbResult } });

    const payload = clean({
      ...data,
      idLocal,
      ultimaAccionFirebase: actionName || "upsert",
      actualizadoEnFirebase: new Date().toISOString()
    });

    try {
      await dbResult.data.db.collection(COLLECTION_NAME).doc(idLocal).set(payload, { merge: true });
      return result({ ok: true, message: "Registro guardado en Firebase.", data: { collection: COLLECTION_NAME, idLocal } });
    } catch (error) {
      return result({ ok: false, status: "error", message: "No se pudo guardar en Firebase.", error: { message: error && error.message ? error.message : String(error) } });
    }
  }

  integrations.Firebase = Object.freeze({ saveItem, getDb });
})(window);
