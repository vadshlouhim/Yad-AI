import express from "express";
import wwebjs from "whatsapp-web.js";
const { Client, LocalAuth } = wwebjs;
import qrcode from "qrcode";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// En local, charge le .env du projet (le service lit process.env directement).
// En prod (Railway), les variables sont déjà définies → ce bloc est ignoré.
if (!process.env.WHATSAPP_SERVICE_SECRET) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const envPath of [path.join(here, ".env"), path.join(here, "..", ".env")]) {
    try {
      for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!match || process.env[match[1]]) continue;
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[match[1]] = value;
      }
    } catch {
      /* fichier .env absent : on ignore */
    }
  }
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SECRET = process.env.WHATSAPP_SERVICE_SECRET;

if (!SECRET) {
  console.error("WHATSAPP_SERVICE_SECRET manquant — arrêt.");
  process.exit(1);
}

// Map communityId → SessionEntry
const sessions = new Map();

function auth(req, res, next) {
  if (req.headers["x-service-secret"] !== SECRET) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  next();
}

async function getOrCreateSession(communityId) {
  if (sessions.has(communityId)) return sessions.get(communityId);

  const entry = {
    client: null,
    status: "initializing",
    qrDataUrl: null,
    qrWaiters: [],
  };
  sessions.set(communityId, entry);

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: communityId,
      dataPath: "./sessions",
    }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
    },
  });

  entry.client = client;

  client.on("qr", async (qr) => {
    console.log(`[${communityId}] QR reçu`);
    entry.status = "qr_pending";
    entry.qrDataUrl = await qrcode.toDataURL(qr);
    // Débloquer tous les long-polls en attente
    for (const resolve of entry.qrWaiters) resolve(entry.qrDataUrl);
    entry.qrWaiters = [];
  });

  client.on("authenticated", () => {
    console.log(`[${communityId}] Authentifié`);
    entry.status = "authenticated";
    entry.qrDataUrl = null;
  });

  client.on("ready", () => {
    console.log(`[${communityId}] Prêt`);
    entry.status = "connected";
    entry.qrDataUrl = null;
  });

  // Suit l'état réel de WhatsApp Web : si la session se dégrade (CONFLICT,
  // UNPAIRED, DEPRECATED_VERSION…), on cesse de la considérer comme connectée.
  client.on("change_state", (state) => {
    console.log(`[${communityId}] Changement d'état : ${state}`);
    if (state === "CONNECTED") {
      entry.status = "connected";
    } else if (entry.status === "connected") {
      entry.status = "disconnected";
    }
  });

  client.on("auth_failure", (msg) => {
    console.error(`[${communityId}] Échec auth : ${msg}`);
    entry.status = "auth_failure";
    sessions.delete(communityId);
  });

  client.on("disconnected", (reason) => {
    console.log(`[${communityId}] Déconnecté : ${reason}`);
    entry.status = "disconnected";
    sessions.delete(communityId);
  });

  client.initialize().catch((err) => {
    console.error(`[${communityId}] Erreur init : ${err.message}`);
    entry.status = "error";
    sessions.delete(communityId);
  });

  return entry;
}

// ── POST /session/:id/start ──────────────────────────────────────────────────
// Démarre la session en arrière-plan et retourne immédiatement.
// Le client poll /qr-instant ou /status pour savoir quand le QR est prêt.
app.post("/session/:id/start", auth, async (req, res) => {
  getOrCreateSession(req.params.id); // démarre sans await
  return res.json({ ok: true });
});

// ── GET /session/:id/qr-instant ─────────────────────────────────────────────
// Retourne immédiatement ce qui est disponible : QR ou statut.
// Pas de long-poll — compatible avec les fonctions serverless (timeout 10 s).
app.get("/session/:id/qr-instant", auth, async (req, res) => {
  const entry = sessions.get(req.params.id);

  if (!entry) {
    return res.json({ status: "disconnected" });
  }
  if (entry.status === "connected") {
    return res.json({ status: "connected" });
  }
  if (entry.qrDataUrl) {
    return res.json({ status: "qr_pending", qr: entry.qrDataUrl });
  }
  return res.json({ status: entry.status });
});

// ── GET /session/:id/qr (legacy — long-poll 30 s) ───────────────────────────
app.get("/session/:id/qr", auth, async (req, res) => {
  const entry = await getOrCreateSession(req.params.id);

  if (entry.status === "connected") {
    return res.json({ status: "connected" });
  }

  if (entry.qrDataUrl) {
    return res.json({ status: "qr_pending", qr: entry.qrDataUrl });
  }

  const qr = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 30_000);
    entry.qrWaiters.push((dataUrl) => {
      clearTimeout(timer);
      resolve(dataUrl);
    });
  });

  if (!qr) {
    return res.status(408).json({ error: "QR non disponible, réessayez." });
  }

  return res.json({ status: "qr_pending", qr });
});

// ── GET /session/:id/status ─────────────────────────────────────────────────
app.get("/session/:id/status", auth, (req, res) => {
  const entry = sessions.get(req.params.id);
  if (!entry) return res.json({ status: "disconnected" });
  return res.json({ status: entry.status });
});

// ── DELETE /session/:id ─────────────────────────────────────────────────────
app.delete("/session/:id", auth, async (req, res) => {
  const entry = sessions.get(req.params.id);
  if (!entry) return res.json({ ok: true });
  try {
    await entry.client?.logout();
    await entry.client?.destroy();
  } catch {}
  sessions.delete(req.params.id);
  return res.json({ ok: true });
});

// Détecte une erreur Puppeteer indiquant une session morte (frame détaché,
// contexte d'exécution détruit, page fermée). Dans ces cas, la session doit
// être réinitialisée : le flag en mémoire ne reflète plus la réalité.
function isDeadSessionError(message) {
  if (!message) return false;
  const m = String(message).toLowerCase();
  return (
    m.includes("detached frame") ||
    m.includes("execution context was destroyed") ||
    m.includes("session closed") ||
    m.includes("target closed") ||
    m.includes("protocol error") ||
    m.includes("page has been closed")
  );
}

// Détruit proprement une session morte et la retire de la map.
async function killSession(communityId, entry) {
  try {
    await entry?.client?.destroy();
  } catch {}
  sessions.delete(communityId);
}

// ── POST /send ──────────────────────────────────────────────────────────────
app.post("/send", auth, async (req, res) => {
  const { communityId, phones, text } = req.body;
  if (!communityId || !Array.isArray(phones) || !text) {
    return res.status(400).json({ error: "Paramètres invalides (communityId, phones[], text)." });
  }

  const entry = sessions.get(communityId);
  if (!entry || entry.status !== "connected") {
    return res.status(409).json({
      error: "WhatsApp non connecté. Scannez le QR code d'abord.",
      status: entry?.status ?? "disconnected",
    });
  }

  // Vérifie l'état RÉEL de la session (et pas seulement le flag en mémoire).
  // getState() interroge le client : si le frame Puppeteer est détaché,
  // l'appel échoue → la session est morte, on la nettoie pour forcer un re-scan.
  try {
    const state = await entry.client.getState();
    if (state !== "CONNECTED") {
      await killSession(communityId, entry);
      return res.status(409).json({
        error: "WhatsApp déconnecté. Scannez à nouveau le QR code.",
        status: "disconnected",
      });
    }
  } catch (err) {
    if (isDeadSessionError(err.message)) {
      await killSession(communityId, entry);
      return res.status(409).json({
        error: "La session WhatsApp a expiré. Scannez à nouveau le QR code.",
        status: "disconnected",
      });
    }
    // Erreur transitoire inattendue : on tente quand même l'envoi ci-dessous.
  }

  let sent = 0;
  let failed = 0;
  const errors = [];
  let sessionDied = false;

  for (const phone of phones) {
    const digits = phone.replace(/[^\d]/g, "");
    if (digits.length < 8) {
      failed++;
      continue;
    }
    try {
      const chatId = `${digits}@c.us`;
      await entry.client.sendMessage(chatId, text);
      sent++;
      // Pause légère entre envois pour éviter le spam-détect
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      failed++;
      errors.push(err.message);
      // Si le frame meurt en cours de route, inutile de continuer la boucle :
      // tous les envois suivants échoueraient de la même façon.
      if (isDeadSessionError(err.message)) {
        sessionDied = true;
        break;
      }
    }
  }

  if (sessionDied) {
    await killSession(communityId, entry);
    return res.status(409).json({
      error: "La session WhatsApp a été interrompue. Scannez à nouveau le QR code.",
      status: "disconnected",
      sent,
      failed: phones.length - sent,
      total: phones.length,
    });
  }

  return res.json({
    sent,
    failed,
    total: phones.length,
    errors: [...new Set(errors)].slice(0, 3),
  });
});

// ── Healthcheck ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true, sessions: sessions.size }));

app.listen(PORT, () => {
  console.log(`WhatsApp service démarré sur le port ${PORT}`);
});
