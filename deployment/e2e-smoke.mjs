#!/usr/bin/env node
/**
 * Test e2e smoke : login → /me → /trade/offers via reverse proxy (port 3000).
 *
 * Usage :
 *   node deployment/e2e-smoke.mjs                   # via proxy (http://localhost:3000)
 *   node deployment/e2e-smoke.mjs --direct           # direct sans proxy (8080/8081)
 *
 * Prérequis :
 *   - Boutique (8080) + Marketplace (8081) démarrés
 *   - Proxy Caddy (3000) démarré (sauf en mode --direct)
 *   - Un utilisateur admin@boulevardtcg.com / Admin123! dans la DB Boutique
 */

const direct = process.argv.includes("--direct");

const PROXY   = "http://localhost:3000";
const SHOP    = direct ? "http://localhost:8080" : PROXY;
const MARKET  = direct ? "http://localhost:8081" : PROXY;

const LOGIN_URL   = direct ? `${SHOP}/api/auth/login`          : `${PROXY}/api/auth/login`;
const REFRESH_URL = direct ? `${SHOP}/api/auth/refresh`         : `${PROXY}/api/auth/refresh`;
const LOGOUT_URL  = direct ? `${SHOP}/api/auth/logout`          : `${PROXY}/api/auth/logout`;
const ME_URL      = direct ? `${MARKET}/me`                     : `${PROXY}/market/me`;
const TRADE_URL   = direct ? `${MARKET}/trade/offers?type=received&limit=1` : `${PROXY}/market/trade/offers?type=received&limit=1`;

const results = [];
let cookies = "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSetCookie(res) {
  const h = res.headers;
  if (typeof h.getSetCookie === "function") {
    const arr = h.getSetCookie();
    return arr && arr.length ? arr.join("\n") : "";
  }
  return h.get("set-cookie") || "";
}

function extractSetCookie(res) {
  const raw = getSetCookie(res);
  if (!raw) return "";
  return raw
    .split("\n")
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function safeJson(res) {
  const text = await res.text();
  if (!text) return { __empty: true, raw: "" };
  try {
    return JSON.parse(text);
  } catch (e) {
    const preview = text.length > 300 ? text.slice(0, 300) + "…" : text;
    throw new Error(`Invalid JSON (status ${res.status}) body="${preview}"`);
  }
}

function withClose(headers = {}) {
  return { ...headers, Connection: "close" };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function step(name, fn) {
  try {
    const ok = await fn();
    results.push({ step: name, ok });
    console.log(ok ? `  ✓ ${name}` : `  ✗ ${name}`);
  } catch (e) {
    results.push({ step: name, ok: false, error: e.message });
    console.log(`  ✗ ${name} — ${e.message}`);
  }
}

console.log(`\n  Mode : ${direct ? "direct (8080/8081)" : "proxy (3000)"}\n`);

let accessToken = null;

// 1. Login
await step("POST /api/auth/login → 200 + accessToken + Set-Cookie refreshToken", async () => {
  const res = await fetch(LOGIN_URL, {
    method: "POST",
    headers: withClose({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email: "admin@boulevardtcg.com", password: "Admin123!" }),
    redirect: "manual",
  });

  const sc = extractSetCookie(res);
  if (sc) cookies = sc;

  const data = await safeJson(res);
  if (data.__empty) throw new Error(`Empty JSON body (status ${res.status})`);

  accessToken = data.accessToken;
  const hasCookie = sc.includes("refreshToken=");
  if (!hasCookie) console.log("    ⚠ Pas de Set-Cookie refreshToken (mode direct sans cookie-parser ?)");

  return res.status === 200 && !!accessToken;
});

// 2. GET /me (Marketplace)
await step("GET /market/me → 200", async () => {
  const res = await fetch(ME_URL, {
    headers: withClose({ Authorization: `Bearer ${accessToken}` }),
  });
  const data = await safeJson(res);
  if (data.__empty && res.status !== 200) throw new Error(`Empty body (status ${res.status})`);
  if (res.status === 200) console.log(`    user: ${data.data?.username ?? data.username}`);
  return res.status === 200;
});

// 3. GET /trade/offers
await step("GET /market/trade/offers → 200", async () => {
  const res = await fetch(TRADE_URL, {
    headers: withClose({ Authorization: `Bearer ${accessToken}` }),
  });
  return res.status === 200;
});

// 4. POST /refresh (cookie)
await step("POST /api/auth/refresh (cookie) → 200 + new accessToken", async () => {
  const res = await fetch(REFRESH_URL, {
    method: "POST",
    headers: withClose({
      "Content-Type": "application/json",
      ...(cookies ? { Cookie: cookies } : {}),
    }),
  });
  if (res.status !== 200) return false;
  const data = await safeJson(res);
  if (data.__empty) return false;
  return !!data.accessToken;
});

// 5. Rejet token HS256 bidon
await step("GET /market/me avec token HS256 bidon → 401", async () => {
  // Token HS256 bidon (signé avec 'fake')
  const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIn0.abc123";
  const res = await fetch(ME_URL, {
    headers: withClose({ Authorization: `Bearer ${fakeToken}` }),
  });
  return res.status === 401;
});

// 6. Logout
await step("POST /api/auth/logout → 200", async () => {
  const res = await fetch(LOGOUT_URL, {
    method: "POST",
    headers: withClose({
      "Content-Type": "application/json",
      ...(cookies ? { Cookie: cookies } : {}),
    }),
  });
  return res.status === 200;
});

// ---------------------------------------------------------------------------
// Résumé
// ---------------------------------------------------------------------------
const allOk = results.every((r) => r.ok);
console.log(`\n  ${allOk ? "✓ Tous les tests passent" : "✗ Certains tests ont échoué"}\n`);

// Pas de process.exit() brutal → évite UV_HANDLE_CLOSING sur Windows
process.exitCode = allOk ? 0 : 1;
setTimeout(() => {}, 50);
