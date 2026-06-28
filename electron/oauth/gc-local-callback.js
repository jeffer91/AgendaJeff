"use strict";

const http = require("http");

const HOST = "127.0.0.1";
const PORT = 53682;
const PATH = "/oauth/google/callback";

let server = null;
let latest = null;

function redirectUri() {
  return `http://${HOST}:${PORT}${PATH}`;
}

function page(title, text) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Arial;padding:40px;background:#f4f7fb;color:#172033"><main style="background:white;border-radius:18px;padding:24px;max-width:720px"><h1>${title}</h1><p>${text}</p></main></body></html>`;
}

function start() {
  if (server) {
    return Promise.resolve({ ok: true, redirectUri: redirectUri(), alreadyRunning: true });
  }

  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, redirectUri());

      if (url.pathname !== PATH) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(page("Ruta no encontrada", "Vuelve a AgendaJeff."));
        return;
      }

      latest = {
        ok: !url.searchParams.get("error") && Boolean(url.searchParams.get("code")),
        provider: "googleCalendar",
        code: url.searchParams.get("code") || "",
        state: url.searchParams.get("state") || "",
        scope: url.searchParams.get("scope") || "",
        error: url.searchParams.get("error") || "",
        errorDescription: url.searchParams.get("error_description") || "",
        receivedAt: new Date().toISOString()
      };

      res.writeHead(latest.ok ? 200 : 400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(latest.ok
        ? page("AgendaJeff conectado", "La autorización fue recibida. Puedes cerrar esta pestaña y volver a AgendaJeff.")
        : page("Autorización incompleta", latest.errorDescription || latest.error || "No se recibió autorización."));
    });

    server.once("error", (error) => {
      server = null;
      resolve({ ok: false, redirectUri: redirectUri(), message: error.message, code: error.code || "" });
    });

    server.listen(PORT, HOST, () => {
      resolve({ ok: true, redirectUri: redirectUri(), host: HOST, port: PORT, path: PATH });
    });
  });
}

function getLatest(expectedState) {
  if (!latest) {
    return { ok: false, found: false };
  }

  if (expectedState && latest.state && expectedState !== latest.state) {
    return { ok: false, found: false, message: "State diferente." };
  }

  return { ok: latest.ok, found: true, callback: latest };
}

function clear() {
  latest = null;
  return { ok: true };
}

function stop() {
  return new Promise((resolve) => {
    if (!server) {
      resolve({ ok: true, stopped: false });
      return;
    }

    const active = server;
    server = null;
    active.close(() => resolve({ ok: true, stopped: true }));
  });
}

module.exports = { redirectUri, start, getLatest, clear, stop };
