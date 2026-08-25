import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';

import {
  db, ORDER_STATUSES, PRODUCT_CATEGORIES, PRODUCT_UNITS, PRODUCT_ICONS,
  SHOP, SHOP_LIMITS, TEXT_LIMITS, FULFILMENTS, DELIVERY_DELAY_LIMITS, UPLOADS_DIR,
  nextOrderReference, shopSettings, saveShopSettings, listPromotions, promotionFromRow,
} from './db.js';
import { seedProducts } from './seed.js';
import {
  GOVERNORATES, validateCustomer, validateCartShape, validateProduct, validatePromotion,
  slugify, detectImage,
} from './validate.js';
import {
  computeDiscounts, resolveDelivery, TRIGGER_TYPES, REWARD_TYPES, REWARD_SCOPES,
} from '../public/js/promo.js';

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

/* On ne seed qu'au tout premier démarrage (catalogue vide) : au-delà, un
 * produit supprimé par le vendeur ne doit jamais réapparaître tout seul. */
const { n: existingProductCount } = db.prepare('SELECT COUNT(*) AS n FROM products').get();
if (existingProductCount === 0) seedProducts();

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
  '.webmanifest': 'application/manifest+json; charset=utf-8',
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

/**
 * Coupe la lecture d'un corps trop gros sans casser la connexion : on met le
 * flux en pause pour que la réponse d'erreur parte, puis on ferme proprement.
 */
function stopReading(req, res) {
  req.pause();
  res.on('finish', () => req.destroy());
}

function readJsonBody(req, limitBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('payload_too_large'));
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

/**
 * Le code du site (HTML, JS, CSS, manifeste, service worker) n'a pas de nom
 * versionné : s'il est mis en cache « en dur », le navigateur peut garder un
 * ancien script tout en chargeant la nouvelle page — l'interface se retrouve
 * alors désynchronisée. Ces fichiers sont donc toujours revalidés (304 si rien
 * n'a changé), tandis que les images et polices gardent un vrai cache.
 */
const REVALIDATE_EXTENSIONS = new Set(['.html', '.js', '.css', '.webmanifest', '.json']);

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

  const extension = extname(filePath).toLowerCase();
  const type = MIME[extension] || 'application/octet-stream';
  const stats = statSync(filePath);
  const etag = `W/"${stats.size.toString(16)}-${Math.trunc(stats.mtimeMs).toString(16)}"`;
  const lastModified = stats.mtime.toUTCString();

  const headers = {
    'Content-Type': type,
    'Cache-Control': REVALIDATE_EXTENSIONS.has(extension) ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    ETag: etag,
    'Last-Modified': lastModified,
  };

  // Le fichier n'a pas bougé depuis la copie du navigateur : rien à renvoyer.
  const knownEtag = req.headers['if-none-match'];
  const knownDate = req.headers['if-modified-since'];
  if (knownEtag === etag || (!knownEtag && knownDate === lastModified)) {
    res.writeHead(304, headers);
    return res.end();
  }

  res.writeHead(200, { ...headers, 'Content-Length': stats.size });
  if (req.method === 'HEAD') return res.end();
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
  name: row.name,
  description: row.description,
  farmer: row.farmer,
  region: row.region,
  harvested: row.harvested,
  category: row.category,
  icon: row.icon,
  image: row.image_path || '',
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
      name: i.name,
      unit: i.unit,
      qty: i.qty,
      unitPrice: i.unit_price_millimes,
      lineTotal: i.line_millimes,
    }));

/** Remises figées au moment de la commande (l'historique ne bouge plus après). */
function orderDiscounts(row) {
  try {
    const parsed = JSON.parse(row.discounts_json || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const publicOrder = (row) => ({
  reference: row.reference,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  subtotal: row.subtotal_millimes,
  discount: row.discount_millimes || 0,
  discounts: orderDiscounts(row),
  fulfilment: row.fulfilment || 'delivery',
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
  // Point posé sur la carte : réservé au vendeur, jamais exposé au suivi public.
  lat: row.lat ?? null,
  lng: row.lng ?? null,
  note: row.note,
  adminNote: row.admin_note,
  lang: row.lang,
});

/* ------------------------------------------------------------------ *
 * Routes API
 * ------------------------------------------------------------------ */

/** Nom et unité d'un produit référencé par une promotion (null s'il a disparu). */
function promotionProduct(productId) {
  if (!productId) return null;
  const row = db.prepare('SELECT id, name, unit FROM products WHERE id = ?').get(productId);
  return row ? { id: row.id, name: row.name, unit: row.unit } : null;
}

/** Promotion enrichie des noms de produits, pour être affichée telle quelle. */
const promotionPayload = (promo) => ({
  ...promo,
  triggerProduct: promotionProduct(promo.triggerProductId),
  rewardProducts: promo.rewardProductIds.map(promotionProduct).filter(Boolean),
});

function getConfig(res) {
  const shop = shopSettings();
  const announcementReady = shop.announcementActive && Boolean(shop.announcementTitle || shop.announcementBody);
  sendJson(res, 200, {
    shopPhone: SHOP_PHONE,
    delivery: shop.deliveryMillimes,
    freeDeliveryFrom: shop.freeDeliveryFromMillimes,
    deliveryAlwaysFree: shop.deliveryAlwaysFree,
    maxItemsPerOrder: shop.maxItemsPerOrder,
    governorates: GOVERNORATES,
    statuses: ORDER_STATUSES,
    announcement: announcementReady
      ? { title: shop.announcementTitle, body: shop.announcementBody }
      : null,
    promotions: listPromotions({ activeOnly: true }).map(promotionPayload),
    // Comment le client peut recevoir sa commande.
    fulfilment: {
      dailyDelivery: shop.dailyDelivery,
      deliveryDelayDays: shop.deliveryDelayDays,
      deliveryNote: shop.deliveryNote,
      pickupEnabled: shop.pickupEnabled,
      pickupPlace: shop.pickupPlace,
    },
  });
}

function getProducts(res, url) {
  const category = url.searchParams.get('category');
  const search = (url.searchParams.get('q') || '').trim().toLowerCase();

  let rows = db.prepare('SELECT * FROM products ORDER BY sort_order, id').all();
  if (category && category !== 'all') rows = rows.filter((r) => r.category === category);
  if (search) {
    rows = rows.filter((r) =>
      [r.name, r.farmer, r.region]
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
    if (err.message !== 'payload_too_large') return fail(res, 400, 'invalid_json');
    stopReading(req, res);
    return fail(res, 413, 'payload_too_large');
  }

  /* Mode de remise choisi par le client : le retrait n'est accepté que si le
   * vendeur l'a ouvert et a indiqué où venir chercher la commande. */
  const shopNow = shopSettings();
  const fulfilment = FULFILMENTS.includes(body?.customer?.fulfilment)
    ? body.customer.fulfilment
    : 'delivery';
  if (fulfilment === 'pickup' && !shopNow.pickupEnabled) {
    return fail(res, 409, 'pickup_unavailable', 'fulfilment');
  }

  const customer = validateCustomer(body?.customer, { pickup: fulfilment === 'pickup' });
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

  /* Remises et frais de livraison sortent tous de la base : le client peut
   * afficher ce qu'il veut, seul ce calcul-ci fixe le montant à payer. */
  const shop = shopNow;
  const cartLines = lines.map(({ p, qty, lineTotal }) => ({
    productId: p.id, qty, unitPrice: p.price_millimes, lineTotal,
  }));
  const promo = computeDiscounts(cartLines, listPromotions({ activeOnly: true }));
  const discount = promo.discount;
  // Rien à livrer quand le client vient chercher : pas de frais.
  const delivery = fulfilment === 'pickup'
    ? 0
    : resolveDelivery(
      subtotal,
      {
        alwaysFree: shop.deliveryAlwaysFree,
        freeDeliveryFrom: shop.freeDeliveryFromMillimes,
        delivery: shop.deliveryMillimes,
      },
      promo.freeDelivery
    );
  const total = subtotal - discount + delivery;
  const now = new Date().toISOString();
  const c = customer.value;

  const insertOrder = db.prepare(`
    INSERT INTO orders (reference, customer_name, phone, governorate, address, lat, lng, note, preferred_time,
                        lang, subtotal_millimes, discount_millimes, discounts_json,
                        delivery_millimes, total_millimes, fulfilment, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, name, unit, qty, unit_price_millimes, line_millimes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const decStock = db.prepare('UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?');

  let reference;
  db.exec('BEGIN');
  try {
    reference = nextOrderReference();
    const { lastInsertRowid } = insertOrder.run(
      reference, c.name, c.phone, c.governorate, c.address, c.lat, c.lng, c.note, c.preferredTime,
      c.lang, subtotal, discount, JSON.stringify(promo.applied), delivery, total, fulfilment, now, now
    );
    for (const { p, qty, lineTotal } of lines) {
      insertItem.run(Number(lastInsertRowid), p.id, p.name, p.unit, qty, p.price_millimes, lineTotal);
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
  sendJson(res, 201, {
    reference, status: 'pending', subtotal, discount, discounts: promo.applied,
    delivery, total, fulfilment, shopPhone: SHOP_PHONE,
  });
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

/* ------------------------- Réglages boutique ---------------------- */

const shopPayload = () => {
  const shop = shopSettings();
  return {
    settings: {
      delivery: shop.deliveryMillimes,
      freeDeliveryFrom: shop.freeDeliveryFromMillimes,
      alwaysFree: shop.deliveryAlwaysFree,
      announcementActive: shop.announcementActive,
      announcementTitle: shop.announcementTitle,
      announcementBody: shop.announcementBody,
      dailyDelivery: shop.dailyDelivery,
      deliveryDelayDays: shop.deliveryDelayDays,
      deliveryNote: shop.deliveryNote,
      pickupEnabled: shop.pickupEnabled,
      pickupPlace: shop.pickupPlace,
    },
    limits: {
      delivery: SHOP_LIMITS.deliveryMillimes,
      freeDeliveryFrom: SHOP_LIMITS.freeDeliveryFromMillimes,
      deliveryDelayDays: DELIVERY_DELAY_LIMITS,
    },
  };
};

function adminSettings(res) {
  sendJson(res, 200, shopPayload());
}

/** Millimes : un entier positif, dans les bornes du réglage. */
function checkMillimes(value, limits) {
  return Number.isInteger(value) && value >= limits.min && value <= limits.max;
}

async function adminUpdateSettings(req, res) {
  let body;
  try {
    body = await readJsonBody(req, 4096);
  } catch {
    return fail(res, 400, 'invalid_json');
  }

  const values = {};
  if (body?.delivery !== undefined) {
    const delivery = Number(body.delivery);
    if (!checkMillimes(delivery, SHOP_LIMITS.deliveryMillimes)) {
      return fail(res, 400, 'delivery_invalid', 'delivery');
    }
    values.deliveryMillimes = delivery;
  }
  if (body?.freeDeliveryFrom !== undefined) {
    const threshold = Number(body.freeDeliveryFrom);
    if (!checkMillimes(threshold, SHOP_LIMITS.freeDeliveryFromMillimes)) {
      return fail(res, 400, 'free_delivery_invalid', 'freeDeliveryFrom');
    }
    values.freeDeliveryFromMillimes = threshold;
  }
  if (body?.alwaysFree !== undefined) {
    values.deliveryAlwaysFree = body.alwaysFree ? 1 : 0;
  }
  if (body?.announcementActive !== undefined) {
    values.announcementActive = body.announcementActive ? 1 : 0;
  }
  // L'encart d'annonce est du texte libre : on retire seulement les caracteres
  // de controle et on borne la longueur (les sauts de ligne sont conserves).
  if (body?.announcementTitle !== undefined) {
    values.announcementTitle = cleanAnnouncement(body.announcementTitle, TEXT_LIMITS.announcementTitle, false);
  }
  if (body?.announcementBody !== undefined) {
    values.announcementBody = cleanAnnouncement(body.announcementBody, TEXT_LIMITS.announcementBody, true);
  }
  if (body?.dailyDelivery !== undefined) {
    values.dailyDelivery = body.dailyDelivery ? 1 : 0;
  }
  if (body?.deliveryDelayDays !== undefined) {
    const days = Number(body.deliveryDelayDays);
    if (!Number.isInteger(days) || days < DELIVERY_DELAY_LIMITS.min || days > DELIVERY_DELAY_LIMITS.max) {
      return fail(res, 400, 'delay_days_invalid', 'deliveryDelayDays');
    }
    values.deliveryDelayDays = days;
  }
  if (body?.deliveryNote !== undefined) {
    values.deliveryNote = cleanAnnouncement(body.deliveryNote, TEXT_LIMITS.deliveryNote, true);
  }
  if (body?.pickupPlace !== undefined) {
    values.pickupPlace = cleanAnnouncement(body.pickupPlace, TEXT_LIMITS.pickupPlace, true);
  }
  if (body?.pickupEnabled !== undefined) {
    const wanted = Boolean(body.pickupEnabled);
    // Sans lieu de retrait, l'option n'aurait aucun sens pour le client.
    const place = values.pickupPlace ?? shopSettings().pickupPlace;
    if (wanted && !place.trim()) return fail(res, 400, 'pickup_place_required', 'pickupPlace');
    values.pickupEnabled = wanted ? 1 : 0;
  }

  saveShopSettings(values);
  const payload = shopPayload();
  console.log(`[réglages] livraison : ${(payload.settings.delivery / 1000).toFixed(3)} DT — offerte dès ${(payload.settings.freeDeliveryFrom / 1000).toFixed(3)} DT`);
  sendJson(res, 200, payload);
}

/** Texte d'annonce : sans caracteres de controle, longueur bornee. */
function cleanAnnouncement(value, max, keepLineBreaks) {
  if (typeof value !== 'string') return '';
  const pattern = keepLineBreaks ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return value.replace(pattern, ' ').trim().slice(0, max);
}

/* --------------------------- Promotions --------------------------- */

const PROMO_RULES = {
  triggers: TRIGGER_TYPES, rewards: REWARD_TYPES, scopes: REWARD_SCOPES,
  descriptionMax: TEXT_LIMITS.promotionDescription,
};

/** Colonnes de la table pour chaque champ valide. */
const PROMO_COLUMNS = {
  title: 'title', description: 'description', isActive: 'is_active',
  triggerType: 'trigger_type', triggerProductId: 'trigger_product_id',
  triggerQty: 'trigger_qty', triggerAmount: 'trigger_amount_millimes',
  rewardType: 'reward_type', rewardScope: 'reward_scope', rewardProductIds: 'reward_product_ids',
  rewardPercent: 'reward_percent', rewardAmount: 'reward_amount_millimes', rewardMaxQty: 'reward_max_qty',
};

/** Les listes d'identifiants sont stockées en JSON dans une colonne texte. */
const promoColumnValue = (key, value) => (key === 'rewardProductIds' ? JSON.stringify(value) : value);

const productExists = (id) => Boolean(db.prepare('SELECT 1 FROM products WHERE id = ?').get(id));

function adminPromotions(res) {
  sendJson(res, 200, {
    promotions: listPromotions().map(promotionPayload),
    triggers: TRIGGER_TYPES,
    rewards: REWARD_TYPES,
    scopes: REWARD_SCOPES,
    // Le formulaire propose la liste des produits pour le declencheur et la remise.
    products: db.prepare('SELECT id, name, unit FROM products ORDER BY sort_order, id').all(),
  });
}

/** Controle commun aux deux ecritures : les produits vises doivent exister. */
function checkPromotionProducts(value) {
  if (value.triggerProductId && !productExists(value.triggerProductId)) {
    return { code: 'promo_trigger_product_required', field: 'triggerProductId' };
  }
  if (value.rewardProductIds.some((id) => !productExists(id))) {
    return { code: 'promo_reward_product_required', field: 'rewardProductIds' };
  }
  return null;
}

async function adminCreatePromotion(req, res) {
  let body;
  try {
    body = await readJsonBody(req, 8192);
  } catch {
    return fail(res, 400, 'invalid_json');
  }

  const checked = validatePromotion(body, PROMO_RULES);
  if (!checked.ok) return fail(res, 400, checked.code, checked.field);

  const missing = checkPromotionProducts(checked.value);
  if (missing) return fail(res, 400, missing.code, missing.field);

  const keys = Object.keys(PROMO_COLUMNS);
  const { last } = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS last FROM promotions').get();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO promotions (sort_order, ${keys.map((k) => PROMO_COLUMNS[k]).join(', ')})
       VALUES (?, ${keys.map(() => '?').join(', ')})`
    )
    .run(last + 10, ...keys.map((k) => promoColumnValue(k, checked.value[k])));

  const created = db.prepare('SELECT * FROM promotions WHERE id = ?').get(Number(lastInsertRowid));
  console.log(`[promotions] ajoutee : ${created.title}`);
  sendJson(res, 201, { promotion: promotionPayload(promotionFromRow(created)) });
}

async function adminUpdatePromotion(req, res, id) {
  let body;
  try {
    body = await readJsonBody(req, 8192);
  } catch {
    return fail(res, 400, 'invalid_json');
  }
  const existing = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
  if (!existing) return fail(res, 404, 'promo_not_found');

  /* Bascule rapide depuis la liste : seul « active » change, le reste de la
   * promotion est repris tel quel plutot que revalide a moitie. */
  if (Object.keys(body || {}).length === 1 && body?.active !== undefined) {
    db.prepare('UPDATE promotions SET is_active = ? WHERE id = ?').run(body.active ? 1 : 0, id);
    const toggled = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
    return sendJson(res, 200, { promotion: promotionPayload(promotionFromRow(toggled)) });
  }

  const checked = validatePromotion(body, PROMO_RULES);
  if (!checked.ok) return fail(res, 400, checked.code, checked.field);

  const missing = checkPromotionProducts(checked.value);
  if (missing) return fail(res, 400, missing.code, missing.field);

  const keys = Object.keys(PROMO_COLUMNS);
  db.prepare(`UPDATE promotions SET ${keys.map((k) => `${PROMO_COLUMNS[k]} = ?`).join(', ')} WHERE id = ?`)
    .run(...keys.map((k) => promoColumnValue(k, checked.value[k])), id);

  const saved = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
  sendJson(res, 200, { promotion: promotionPayload(promotionFromRow(saved)) });
}

function adminDeletePromotion(res, id) {
  const existing = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
  if (!existing) return fail(res, 404, 'promo_not_found');
  db.prepare('DELETE FROM promotions WHERE id = ?').run(id);
  console.log(`[promotions] supprimee : ${existing.title}`);
  sendJson(res, 200, { deleted: id });
}

const adminProduct = (row) => ({ ...publicProduct(row), isAvailable: Boolean(row.is_available) });

function adminProducts(res) {
  sendJson(res, 200, {
    products: db.prepare('SELECT * FROM products ORDER BY sort_order, id').all().map(adminProduct),
    units: PRODUCT_UNITS,
    categories: PRODUCT_CATEGORIES,
    icons: PRODUCT_ICONS,
  });
}

const PRODUCT_RULES = { units: PRODUCT_UNITS, categories: PRODUCT_CATEGORIES, icons: PRODUCT_ICONS };

/** Rend le slug unique en ajoutant -2, -3… si besoin. */
function uniqueSlug(base, excludeId = 0) {
  const taken = db.prepare('SELECT slug FROM products WHERE id != ?').all(excludeId).map((r) => r.slug);
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Colonnes de la table pour chaque champ validé. */
const PRODUCT_COLUMNS = {
  name: 'name', description: 'description', farmer: 'farmer', region: 'region', harvested: 'harvested',
  category: 'category', unit: 'unit', icon: 'icon',
  price: 'price_millimes', stock: 'stock_qty', step: 'step_qty', min: 'min_qty', max: 'max_qty',
  isBio: 'is_bio', isAvailable: 'is_available',
};

async function adminCreateProduct(req, res) {
  let body;
  try {
    body = await readJsonBody(req, 16 * 1024);
  } catch {
    return fail(res, 400, 'invalid_json');
  }

  const checked = validateProduct(body, PRODUCT_RULES);
  if (!checked.ok) return fail(res, 400, checked.code, checked.field);

  const v = checked.value;
  const slug = uniqueSlug(slugify(v.name));
  // Le nouveau produit se place en fin de catalogue.
  const { last } = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS last FROM products').get();

  const columns = Object.keys(PRODUCT_COLUMNS).filter((key) => v[key] !== undefined);
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO products (slug, sort_order, ${columns.map((k) => PRODUCT_COLUMNS[k]).join(', ')})
       VALUES (?, ?, ${columns.map(() => '?').join(', ')})`
    )
    .run(slug, last + 10, ...columns.map((k) => v[k]));

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(lastInsertRowid));
  console.log(`[catalogue] produit ajouté : ${created.name} (${slug})`);
  sendJson(res, 201, { product: adminProduct(created) });
}

async function adminUpdateProduct(req, res, id) {
  let body;
  try {
    body = await readJsonBody(req, 16 * 1024);
  } catch {
    return fail(res, 400, 'invalid_json');
  }
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return fail(res, 404, 'product_not_found');

  // `partial` : le tableau de bord peut n'envoyer que le prix ou le stock.
  const checked = validateProduct(body, { ...PRODUCT_RULES, partial: true });
  if (!checked.ok) return fail(res, 400, checked.code, checked.field);

  const v = checked.value;
  // Contrôle croisé quand un seul des deux bornes est modifié.
  const min = v.min ?? product.min_qty;
  const max = v.max ?? product.max_qty;
  if (min > max) return fail(res, 400, 'min_above_max', 'min');

  const columns = Object.keys(PRODUCT_COLUMNS).filter((key) => v[key] !== undefined);
  if (columns.length) {
    const assignments = columns.map((k) => `${PRODUCT_COLUMNS[k]} = ?`).join(', ');
    const slug = v.name !== undefined ? uniqueSlug(slugify(v.name), id) : product.slug;
    db.prepare(`UPDATE products SET ${assignments}, slug = ? WHERE id = ?`)
      .run(...columns.map((k) => v[k]), slug, id);
  }

  sendJson(res, 200, { product: adminProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) });
}

function adminDeleteProduct(res, id) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return fail(res, 404, 'product_not_found');

  // Les commandes gardent leur propre copie du nom et du prix : l'historique
  // reste lisible même après la suppression du produit.
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  cleanPromotionsAfterProductDelete(id);
  if (product.image_path) removeUpload(product.image_path);

  console.log(`[catalogue] produit supprimé : ${product.name} (${product.slug})`);
  sendJson(res, 200, { deleted: id });
}

/**
 * Retire un produit supprimé des promotions : celles qu'il déclenchait n'ont
 * plus de sens, et il sort de la liste des produits remisés. Une promotion qui
 * ne remise plus rien est supprimée à son tour.
 */
function cleanPromotionsAfterProductDelete(productId) {
  let removed = db.prepare('DELETE FROM promotions WHERE trigger_product_id = ?').run(productId).changes;

  const update = db.prepare('UPDATE promotions SET reward_product_ids = ? WHERE id = ?');
  const drop = db.prepare('DELETE FROM promotions WHERE id = ?');
  for (const promo of listPromotions()) {
    if (!promo.rewardProductIds.includes(productId)) continue;
    const kept = promo.rewardProductIds.filter((id) => id !== productId);
    if (kept.length === 0 && promo.rewardScope === 'product') {
      drop.run(promo.id);
      removed += 1;
    } else {
      update.run(JSON.stringify(kept), promo.id);
    }
  }
  if (removed) console.log(`[promotions] ${removed} promotion(s) retirée(s) avec le produit`);
}

/** Supprime une photo du disque, en restant confiné au dossier des envois. */
function removeUpload(imagePath) {
  const name = imagePath.replace('/uploads/', '');
  if (!/^[\w.-]+$/.test(name)) return;
  try {
    unlinkSync(join(UPLOADS_DIR, name));
  } catch {
    // Fichier déjà absent : rien à faire.
  }
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Reçoit la photo brute (corps binaire) et la range dans data/uploads/. */
function readBinaryBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('image_too_large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function adminUploadImage(req, res, id) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return fail(res, 404, 'product_not_found');

  let buffer;
  try {
    buffer = await readBinaryBody(req, MAX_IMAGE_BYTES);
  } catch (err) {
    if (err.message !== 'image_too_large') return fail(res, 400, 'upload_failed');
    stopReading(req, res);
    return fail(res, 413, 'image_too_large', 'image');
  }

  const kind = detectImage(buffer);
  if (!kind) return fail(res, 415, 'image_type_invalid', 'image');

  const name = `${product.slug}-${randomBytes(6).toString('hex')}.${kind.ext}`;
  writeFileSync(join(UPLOADS_DIR, name), buffer);
  if (product.image_path) removeUpload(product.image_path);

  const imagePath = `/uploads/${name}`;
  db.prepare('UPDATE products SET image_path = ? WHERE id = ?').run(imagePath, id);
  sendJson(res, 200, { product: adminProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) });
}

function adminDeleteImage(res, id) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return fail(res, 404, 'product_not_found');
  if (product.image_path) removeUpload(product.image_path);
  db.prepare(`UPDATE products SET image_path = '' WHERE id = ?`).run(id);
  sendJson(res, 200, { product: adminProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) });
}

/** Sert une photo produit depuis data/uploads/ (hors de public/). */
function serveUpload(res, pathname) {
  const name = pathname.slice('/uploads/'.length);
  // Nom de fichier strict : ni chemin, ni caractère spécial.
  if (!/^[\w.-]+$/.test(name) || name.includes('..')) return fail(res, 403, 'forbidden');

  const filePath = join(UPLOADS_DIR, name);
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return fail(res, 404, 'not_found');

  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(filePath).pipe(res);
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
      if (path.startsWith('/uploads/')) return serveUpload(res, path);
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
      if (path === '/api/admin/products' && req.method === 'POST') return await adminCreateProduct(req, res);
      if (path === '/api/admin/settings' && req.method === 'GET') return adminSettings(res);
      if (path === '/api/admin/settings' && req.method === 'PATCH') return await adminUpdateSettings(req, res);
      if (path === '/api/admin/promotions' && req.method === 'GET') return adminPromotions(res);
      if (path === '/api/admin/promotions' && req.method === 'POST') return await adminCreatePromotion(req, res);

      const promoMatch = path.match(/^\/api\/admin\/promotions\/(\d+)$/);
      if (promoMatch && req.method === 'PATCH') return await adminUpdatePromotion(req, res, Number(promoMatch[1]));
      if (promoMatch && req.method === 'DELETE') return adminDeletePromotion(res, Number(promoMatch[1]));

      const orderMatch = path.match(/^\/api\/admin\/orders\/(\d+)$/);
      if (orderMatch && req.method === 'PATCH') return await adminUpdateOrder(req, res, Number(orderMatch[1]));

      const productMatch = path.match(/^\/api\/admin\/products\/(\d+)$/);
      if (productMatch && req.method === 'PATCH') return await adminUpdateProduct(req, res, Number(productMatch[1]));
      if (productMatch && req.method === 'DELETE') return adminDeleteProduct(res, Number(productMatch[1]));

      const imageMatch = path.match(/^\/api\/admin\/products\/(\d+)\/image$/);
      if (imageMatch && req.method === 'POST') return await adminUploadImage(req, res, Number(imageMatch[1]));
      if (imageMatch && req.method === 'DELETE') return adminDeleteImage(res, Number(imageMatch[1]));
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
