import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';

import { db, ORDER_STATUSES, SHOP, nextOrderReference } from './db.js';
import { seedProducts } from './seed.js';
import { GOVERNORATES, validateCustomer, validateCartShape } from './validate.js';

try {
  process.loadEnvFile();
} catch {
  // Pas de fichier .env : on utilise les valeurs par défaut.
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
/** Port choisi explicitement : on ne se rabattra pas sur un autre. */
const PORT_IS_EXPLICIT = Boolean(process.env.PORT);
const ADMIN_PASSWORD = process.env.FALLAH_ADMIN_PASSWORD || 'fallah2026';
const SHOP_PHONE = process.env.FALLAH_SHOP_PHONE || '+21600000000';

seedProducts();

/* ------------------------------------------------------------------ *
 * Utilitaires HTTP
 * ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const fail = (res, status, code, field) => sendJson(res, status, { error: code, field });

function readJsonBody(req, limitBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('invalid_json'));
      }
    });
    req.on('error', reject);
  });
}

const isFile = (path) => existsSync(path) && statSync(path).isFile();

/**
 * Résout l'URL demandée vers un fichier de public/.
 * Accepte les adresses écrites à la main sans extension : /admin, /admin/,
 * /track… renvoient bien admin.html, track.html.
 */
function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/\/+$/, '') || '/index.html';
  const candidates = extname(clean) ? [clean] : [clean, `${clean}.html`, `${clean}/index.html`];

  for (const candidate of candidates) {
    const filePath = normalize(join(PUBLIC_DIR, candidate));
    // Empêche toute sortie du dossier public/ (../../).
    if (!filePath.startsWith(PUBLIC_DIR)) return { forbidden: true };
    if (isFile(filePath)) return { filePath };
  }
  return {};
}

function serveStatic(req, res, pathname) {
  const { filePath, forbidden } = resolveFile(pathname);
  if (forbidden) return fail(res, 403, 'forbidden');

  if (!filePath) {
    const notFoundPage = join(PUBLIC_DIR, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    if (isFile(notFoundPage)) return createReadStream(notFoundPage).pipe(res);
    res.end('<!doctype html><meta charset="utf-8"><h1>404</h1><p><a href="/">←</a></p>');
    return;
  }

  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
  const isHtml = type.startsWith('text/html');
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(filePath).pipe(res);
}

/* ------------------------------------------------------------------ *
 * Limitation de débit (mémoire) pour la création de commandes
 * ------------------------------------------------------------------ */

const orderHits = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 8;

/** Vrai si la clé a dépassé son quota sur la fenêtre glissante. */
function rateLimited(key) {
  const now = Date.now();
  const hits = (orderHits.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  orderHits.set(key, hits);
  return hits.length >= RATE_MAX;
}

/**
 * Comptabilise une tentative. On n'enregistre que les commandes réellement
 * créées (et les échecs de connexion) : un client qui corrige une faute de
 * frappe dans son formulaire ne doit pas se retrouver bloqué.
 */
function recordHit(key) {
  const hits = orderHits.get(key) || [];
  hits.push(Date.now());
  orderHits.set(key, hits);
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, hits] of orderHits) {
    const kept = hits.filter((t) => now - t < RATE_WINDOW_MS);
    if (kept.length === 0) orderHits.delete(ip);
    else orderHits.set(ip, kept);
  }
}, RATE_WINDOW_MS).unref();

/* ------------------------------------------------------------------ *
 * Session vendeur (jeton en mémoire, expire au bout de 8 h)
 * ------------------------------------------------------------------ */

const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function passwordMatches(candidate) {
  if (typeof candidate !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(ADMIN_PASSWORD);
  // Longueurs différentes : on compare quand même pour garder un temps constant.
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

function createSession() {
  const token = randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function isAdmin(req) {
  const token = req.headers['x-admin-token'];
  if (typeof token !== 'string') return false;
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (expiry < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ *
 * Mise en forme des données
 * ------------------------------------------------------------------ */

const publicProduct = (row) => ({
  id: row.id,
  slug: row.slug,
  name: { ar: row.name_ar, fr: row.name_fr },
  description: { ar: row.desc_ar, fr: row.desc_fr },
  farmer: { ar: row.farmer_ar, fr: row.farmer_fr },
  region: { ar: row.region_ar, fr: row.region_fr },
  harvested: { ar: row.harvested_ar, fr: row.harvested_fr },
  category: row.category,
  icon: row.icon,
  unit: row.unit,
  price: row.price_millimes,
  step: row.step_qty,
  min: row.min_qty,
  max: row.max_qty,
  stock: row.stock_qty,
  isBio: Boolean(row.is_bio),
  isAvailable: Boolean(row.is_available) && row.stock_qty > 0,
});

const orderItems = (orderId) =>
  db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')
    .all(orderId)
    .map((i) => ({
      productId: i.product_id,
      name: { ar: i.name_ar, fr: i.name_fr },
      unit: i.unit,
      qty: i.qty,
      unitPrice: i.unit_price_millimes,
      lineTotal: i.line_millimes,
    }));

const publicOrder = (row) => ({
  reference: row.reference,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  subtotal: row.subtotal_millimes,
  delivery: row.delivery_millimes,
  total: row.total_millimes,
  governorate: row.governorate,
  preferredTime: row.preferred_time,
  items: orderItems(row.id),
});

const adminOrder = (row) => ({
  ...publicOrder(row),
  id: row.id,
  customerName: row.customer_name,
  phone: row.phone,
  address: row.address,
  note: row.note,
  adminNote: row.admin_note,
  lang: row.lang,
});

/* ------------------------------------------------------------------ *
 * Routes API
 * ------------------------------------------------------------------ */

function getConfig(res) {
  sendJson(res, 200, {
    shopPhone: SHOP_PHONE,
    delivery: SHOP.deliveryMillimes,
    freeDeliveryFrom: SHOP.freeDeliveryFromMillimes,
    maxItemsPerOrder: SHOP.maxItemsPerOrder,
    governorates: GOVERNORATES,
    statuses: ORDER_STATUSES,
  });
}

function getProducts(res, url) {
  const category = url.searchParams.get('category');
  const search = (url.searchParams.get('q') || '').trim().toLowerCase();

  let rows = db.prepare('SELECT * FROM products ORDER BY sort_order, id').all();
  if (category && category !== 'all') rows = rows.filter((r) => r.category === category);
  if (search) {
    rows = rows.filter((r) =>
      [r.name_ar, r.name_fr, r.farmer_ar, r.farmer_fr, r.region_ar, r.region_fr]
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }
  sendJson(res, 200, { products: rows.map(publicProduct) });
}

async function createOrder(req, res, ip) {
  if (rateLimited(ip)) return fail(res, 429, 'too_many_orders');

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return fail(res, 400, err.message === 'payload_too_large' ? 'payload_too_large' : 'invalid_json');
  }

  const customer = validateCustomer(body?.customer);
  if (!customer.ok) return fail(res, 400, customer.code, customer.field);

  const cart = validateCartShape(body?.items, SHOP.maxItemsPerOrder);
  if (!cart.ok) return fail(res, 400, cart.code, cart.field);

  // Les prix, le stock et les paliers viennent tous de la base, jamais du client.
  const lines = [];
  let subtotal = 0;
  for (const { productId, qty } of cart.value) {
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!p) return sendJson(res, 400, { error: 'product_missing', productId });
    if (!p.is_available) return sendJson(res, 409, { error: 'product_unavailable', productId });
    if (qty < p.min_qty) return sendJson(res, 400, { error: 'qty_below_min', productId, min: p.min_qty });
    if (qty > p.max_qty) return sendJson(res, 400, { error: 'qty_above_max', productId, max: p.max_qty });
    if (qty > p.stock_qty) return sendJson(res, 409, { error: 'qty_above_stock', productId, stock: p.stock_qty });
    // Le pas est respecté à 0,01 près (arrondis en virgule flottante).
    const steps = qty / p.step_qty;
    if (Math.abs(steps - Math.round(steps)) > 0.01) {
      return sendJson(res, 400, { error: 'qty_step_invalid', productId, step: p.step_qty });
    }
    const lineTotal = Math.round(p.price_millimes * qty);
    subtotal += lineTotal;
    lines.push({ p, qty, lineTotal });
  }

  const delivery = subtotal >= SHOP.freeDeliveryFromMillimes ? 0 : SHOP.deliveryMillimes;
  const total = subtotal + delivery;
  const now = new Date().toISOString();
  const c = customer.value;

  const insertOrder = db.prepare(`
    INSERT INTO orders (reference, customer_name, phone, governorate, address, note, preferred_time,
                        lang, subtotal_millimes, delivery_millimes, total_millimes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, name_ar, name_fr, unit, qty, unit_price_millimes, line_millimes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const decStock = db.prepare('UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?');

  let reference;
  db.exec('BEGIN');
  try {
    reference = nextOrderReference();
    const { lastInsertRowid } = insertOrder.run(
      reference, c.name, c.phone, c.governorate, c.address, c.note, c.preferredTime,
      c.lang, subtotal, delivery, total, now, now
    );
    for (const { p, qty, lineTotal } of lines) {
      insertItem.run(Number(lastInsertRowid), p.id, p.name_ar, p.name_fr, p.unit, qty, p.price_millimes, lineTotal);
      decStock.run(qty, p.id);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[commande] échec :', err);
    return fail(res, 500, 'order_failed');
  }

  recordHit(ip);
  console.log(`[commande] ${reference} — ${c.name} (${c.phone}) — ${(total / 1000).toFixed(3)} DT — à confirmer par téléphone`);
  sendJson(res, 201, { reference, status: 'pending', subtotal, delivery, total, shopPhone: SHOP_PHONE });
}

function trackOrder(res, url) {
  const reference = (url.searchParams.get('reference') || '').trim().toUpperCase();
  const phoneRaw = (url.searchParams.get('phone') || '').replace(/\D/g, '').slice(-8);
  if (!reference || phoneRaw.length !== 8) return fail(res, 400, 'track_missing_fields');

  // Le couple référence + téléphone tient lieu d'authentification côté client.
  const row = db.prepare('SELECT * FROM orders WHERE reference = ? AND phone = ?').get(reference, phoneRaw);
  if (!row) return fail(res, 404, 'order_not_found');
  sendJson(res, 200, { order: publicOrder(row) });
}

async function adminLogin(req, res, ip) {
  if (rateLimited(`login:${ip}`)) return fail(res, 429, 'too_many_attempts');
  let body;
  try {
    body = await readJsonBody(req, 4096);
  } catch {
    return fail(res, 400, 'invalid_json');
  }
  if (!passwordMatches(body?.password)) {
    recordHit(`login:${ip}`);
    return fail(res, 401, 'bad_password');
  }
  sendJson(res, 200, { token: createSession(), expiresIn: SESSION_TTL_MS });
}

function adminOrders(res, url) {
  const status = url.searchParams.get('status');
  const search = (url.searchParams.get('q') || '').trim().toLowerCase();

  let rows = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 500').all();
  if (status && status !== 'all') rows = rows.filter((r) => r.status === status);
  if (search) {
    rows = rows.filter((r) =>
      `${r.reference} ${r.customer_name} ${r.phone} ${r.address}`.toLowerCase().includes(search)
    );
  }

  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all()) {
    counts[r.status] = r.n;
  }
  const revenue = db
    .prepare(`SELECT COALESCE(SUM(total_millimes), 0) AS t FROM orders WHERE status = 'delivered'`)
    .get().t;

  sendJson(res, 200, { orders: rows.map(adminOrder), counts, revenue });
}

async function adminUpdateOrder(req, res, id) {
  let body;
  try {
    body = await readJsonBody(req, 8192);
  } catch {
    return fail(res, 400, 'invalid_json');
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return fail(res, 404, 'order_not_found');

  const status = body?.status ?? order.status;
  if (!ORDER_STATUSES.includes(status)) return fail(res, 400, 'status_invalid');
  const adminNote = typeof body?.adminNote === 'string' ? body.adminNote.slice(0, 300) : order.admin_note;

  // Une commande annulée remet sa marchandise en stock (une seule fois).
  if (status === 'cancelled' && order.status !== 'cancelled') {
    const restock = db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?');
    for (const item of db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(id)) {
      restock.run(item.qty, item.product_id);
    }
  }

  db.prepare('UPDATE orders SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?')
    .run(status, adminNote, new Date().toISOString(), id);

  sendJson(res, 200, { order: adminOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)) });
}

function adminProducts(res) {
  sendJson(res, 200, {
    products: db.prepare('SELECT * FROM products ORDER BY sort_order, id').all().map((row) => ({
      ...publicProduct(row),
      isAvailable: Boolean(row.is_available),
    })),
  });
}

async function adminUpdateProduct(req, res, id) {
  let body;
  try {
    body = await readJsonBody(req, 8192);
  } catch {
    return fail(res, 400, 'invalid_json');
  }
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return fail(res, 404, 'product_not_found');

  const price = body?.price === undefined ? product.price_millimes : Math.round(Number(body.price));
  const stock = body?.stock === undefined ? product.stock_qty : Number(body.stock);
  const available = body?.isAvailable === undefined ? product.is_available : Number(Boolean(body.isAvailable));

  if (!Number.isFinite(price) || price < 100 || price > 1_000_000) return fail(res, 400, 'price_invalid', 'price');
  if (!Number.isFinite(stock) || stock < 0 || stock > 100_000) return fail(res, 400, 'stock_invalid', 'stock');

  db.prepare('UPDATE products SET price_millimes = ?, stock_qty = ?, is_available = ? WHERE id = ?')
    .run(price, stock, available, id);

  sendJson(res, 200, {
    product: {
      ...publicProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)),
      isAvailable: Boolean(available),
    },
  });
}

/* ------------------------------------------------------------------ *
 * Routeur
 * ------------------------------------------------------------------ */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  const ip = req.socket.remoteAddress || 'unknown';

  try {
    if (!path.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'method_not_allowed');
      return serveStatic(req, res, path);
    }

    // --- Public ---
    if (path === '/api/config' && req.method === 'GET') return getConfig(res);
    if (path === '/api/products' && req.method === 'GET') return getProducts(res, url);
    if (path === '/api/orders' && req.method === 'POST') return await createOrder(req, res, ip);
    if (path === '/api/orders/track' && req.method === 'GET') return trackOrder(res, url);

    // --- Vendeur ---
    if (path === '/api/admin/login' && req.method === 'POST') return await adminLogin(req, res, ip);

    if (path.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return fail(res, 401, 'unauthorized');

      if (path === '/api/admin/orders' && req.method === 'GET') return adminOrders(res, url);
      if (path === '/api/admin/products' && req.method === 'GET') return adminProducts(res);

      const orderMatch = path.match(/^\/api\/admin\/orders\/(\d+)$/);
      if (orderMatch && req.method === 'PATCH') return await adminUpdateOrder(req, res, Number(orderMatch[1]));

      const productMatch = path.match(/^\/api\/admin\/products\/(\d+)$/);
      if (productMatch && req.method === 'PATCH') return await adminUpdateProduct(req, res, Number(productMatch[1]));
    }

    return fail(res, 404, 'not_found');
  } catch (err) {
    console.error('[serveur] erreur inattendue :', err);
    if (!res.headersSent) fail(res, 500, 'server_error');
    else res.end();
  }
});

/** Nombre de ports essayés après le port par défaut (3000 → 3004). */
const PORT_FALLBACK_TRIES = 4;
let portAttempt = 0;

/**
 * Un autre programme occupe souvent le port 3000 sur une machine de développement.
 * Sans port imposé, on glisse simplement au port suivant plutôt que de planter.
 */
server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;

  if (!PORT_IS_EXPLICIT && portAttempt < PORT_FALLBACK_TRIES) {
    console.log(`  Port ${PORT + portAttempt} déjà occupé, essai sur ${PORT + portAttempt + 1}…`);
    portAttempt += 1;
    server.listen(PORT + portAttempt);
    return;
  }

  console.error(`\n  ✖ Le port ${PORT + portAttempt} est déjà utilisé par un autre programme.`);
  console.error(`    Lancez la boutique sur un autre port :`);
  console.error(`      PowerShell : $env:PORT=3100; npm start`);
  console.error(`      bash       : PORT=3100 npm start`);
  console.error(`    Ou définissez PORT dans le fichier .env.\n`);
  process.exit(1);
});

/**
 * Arrêt propre (Ctrl+C, redéploiement de l'hébergeur) : on replie le journal WAL
 * dans fallah.db, sinon les dernières commandes ne vivent que dans le fichier -wal.
 */
function shutdown(signal) {
  console.log(`\n  ${signal} — fermeture de la base…`);
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    db.close();
  } catch (err) {
    console.error('  Fermeture de la base impossible :', err.message);
  }
  server.close(() => process.exit(0));
  // Filet de sécurité si des connexions traînent.
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(PORT, () => {
  const port = server.address().port;
  console.log(`\n  🌿 Fallah — متجر المنتجات الطازجة`);
  console.log(`  Boutique : http://localhost:${port}`);
  console.log(`  Vendeur  : http://localhost:${port}/admin.html`);
  if (ADMIN_PASSWORD === 'fallah2026') {
    console.log(`  ⚠  Mot de passe vendeur par défaut « fallah2026 » — à changer via FALLAH_ADMIN_PASSWORD.`);
  }
  console.log('');
});
