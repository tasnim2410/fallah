import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(rootDir, 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'fallah.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    slug           TEXT    NOT NULL UNIQUE,
    name           TEXT    NOT NULL,
    description    TEXT    NOT NULL DEFAULT '',
    category       TEXT    NOT NULL,
    icon           TEXT    NOT NULL DEFAULT 'leaf',
    unit           TEXT    NOT NULL DEFAULT 'kg',
    price_millimes INTEGER NOT NULL,
    sale_price_millimes INTEGER NOT NULL DEFAULT 0,
    step_qty       REAL    NOT NULL DEFAULT 0.5,
    min_qty        REAL    NOT NULL DEFAULT 1,
    max_qty        REAL    NOT NULL DEFAULT 30,
    stock_qty      REAL    NOT NULL DEFAULT 0,
    farmer         TEXT    NOT NULL DEFAULT '',
    region         TEXT    NOT NULL DEFAULT '',
    harvested      TEXT    NOT NULL DEFAULT '',
    is_bio         INTEGER NOT NULL DEFAULT 0,
    is_available   INTEGER NOT NULL DEFAULT 1,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    image_path     TEXT    NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    reference           TEXT    NOT NULL UNIQUE,
    customer_name       TEXT    NOT NULL,
    phone               TEXT    NOT NULL,
    governorate         TEXT    NOT NULL,
    address             TEXT    NOT NULL,
    lat                 REAL,
    lng                 REAL,
    note                TEXT    NOT NULL DEFAULT '',
    preferred_time      TEXT    NOT NULL DEFAULT 'any',
    lang                TEXT    NOT NULL DEFAULT 'ar',
    subtotal_millimes   INTEGER NOT NULL,
    delivery_millimes   INTEGER NOT NULL,
    total_millimes      INTEGER NOT NULL,
    status              TEXT    NOT NULL DEFAULT 'pending',
    admin_note          TEXT    NOT NULL DEFAULT '',
    created_at          TEXT    NOT NULL,
    updated_at          TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id          INTEGER NOT NULL,
    name                TEXT    NOT NULL,
    unit                TEXT    NOT NULL,
    qty                 REAL    NOT NULL,
    unit_price_millimes INTEGER NOT NULL,
    line_millimes       INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS promotions (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    title                  TEXT    NOT NULL,
    description            TEXT    NOT NULL DEFAULT '',
    is_active              INTEGER NOT NULL DEFAULT 1,
    trigger_type           TEXT    NOT NULL DEFAULT 'always',
    trigger_product_id     INTEGER,
    trigger_qty            REAL    NOT NULL DEFAULT 0,
    trigger_amount_millimes INTEGER NOT NULL DEFAULT 0,
    reward_type            TEXT    NOT NULL DEFAULT 'percent',
    reward_scope           TEXT    NOT NULL DEFAULT 'product',
    reward_product_ids     TEXT    NOT NULL DEFAULT '[]',
    reward_percent         REAL    NOT NULL DEFAULT 0,
    reward_amount_millimes INTEGER NOT NULL DEFAULT 0,
    reward_max_qty         REAL    NOT NULL DEFAULT 0,
    sort_order             INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_phone   ON orders(phone);
  CREATE INDEX IF NOT EXISTS idx_items_order    ON order_items(order_id);
`);

/**
 * Migrations : ajoute les colonnes apparues après la première mise en service,
 * pour qu'une base existante continue de fonctionner sans être recréée.
 */
function addMissingColumns(table, columns) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const [name, definition] of Object.entries(columns)) {
    if (!existing.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

/**
 * Fusionne une ancienne paire de colonnes bilingues (arabe/français) en une
 * seule colonne — le catalogue est passé à un texte unique par produit.
 * Ne fait rien sur une base déjà migrée (ou neuve, créée directement avec
 * la colonne unique par le CREATE TABLE ci-dessus).
 */
function mergeBilingualColumn(table, arColumn, frColumn, newColumn) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  if (existing.has(newColumn) || (!existing.has(arColumn) && !existing.has(frColumn))) return;

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${newColumn} TEXT NOT NULL DEFAULT ''`);
  const arExpr = existing.has(arColumn) ? arColumn : `''`;
  const frExpr = existing.has(frColumn) ? frColumn : `''`;
  // Conserve la valeur arabe si elle existe, sinon la française.
  db.exec(`UPDATE ${table} SET ${newColumn} = CASE WHEN ${arExpr} != '' THEN ${arExpr} ELSE ${frExpr} END`);
  if (existing.has(arColumn)) db.exec(`ALTER TABLE ${table} DROP COLUMN ${arColumn}`);
  if (existing.has(frColumn)) db.exec(`ALTER TABLE ${table} DROP COLUMN ${frColumn}`);
}

/**
 * Une promotion ne visait qu'un seul produit ; elle peut désormais en couvrir
 * plusieurs. On recopie l'ancienne colonne dans la nouvelle liste, une fois.
 */
function migrateRewardProductIds() {
  const columns = new Set(db.prepare('PRAGMA table_info(promotions)').all().map((c) => c.name));
  if (!columns.has('reward_product_id')) return;

  const rows = db.prepare(`SELECT id, reward_product_id FROM promotions WHERE reward_product_ids = '[]'`).all();
  const update = db.prepare('UPDATE promotions SET reward_product_ids = ? WHERE id = ?');
  for (const row of rows) {
    if (row.reward_product_id) update.run(JSON.stringify([row.reward_product_id]), row.id);
  }
  db.exec('ALTER TABLE promotions DROP COLUMN reward_product_id');
}

addMissingColumns('products', { image_path: `TEXT NOT NULL DEFAULT ''` });
/* Prix soldé du produit (0 = pas de réduction en cours). */
addMissingColumns('products', { sale_price_millimes: 'INTEGER NOT NULL DEFAULT 0' });
// Point posé sur la carte au moment de la commande (facultatif, donc nullable).
addMissingColumns('orders', { lat: 'REAL', lng: 'REAL' });
addMissingColumns('orders', {
  discount_millimes: 'INTEGER NOT NULL DEFAULT 0',
  discounts_json: `TEXT NOT NULL DEFAULT '[]'`,
  fulfilment: `TEXT NOT NULL DEFAULT 'delivery'`,
});
addMissingColumns('promotions', {
  description: `TEXT NOT NULL DEFAULT ''`,
  reward_product_ids: `TEXT NOT NULL DEFAULT '[]'`,
});
migrateRewardProductIds();
mergeBilingualColumn('products', 'name_ar', 'name_fr', 'name');
mergeBilingualColumn('products', 'desc_ar', 'desc_fr', 'description');
mergeBilingualColumn('products', 'farmer_ar', 'farmer_fr', 'farmer');
mergeBilingualColumn('products', 'region_ar', 'region_fr', 'region');
mergeBilingualColumn('products', 'harvested_ar', 'harvested_fr', 'harvested');
mergeBilingualColumn('order_items', 'name_ar', 'name_fr', 'name');

/** Dossier des photos produits, à l'intérieur de data/ (volume persistant). */
export const UPLOADS_DIR = join(dataDir, 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

/** Order lifecycle, in the sequence the seller walks through. */
export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'];

export const PRODUCT_CATEGORIES = ['vegetables', 'fruits', 'pantry', 'animal'];

/** Unités de vente proposées au vendeur. */
export const PRODUCT_UNITS = ['kg', 'L', 'piece', 'bunch', 'dozen', 'jar'];

/** Illustrations disponibles quand le vendeur ne met pas de photo. */
export const PRODUCT_ICONS = [
  'tomato', 'potato', 'onion', 'carrot', 'pepper', 'zucchini', 'lettuce', 'herb',
  'orange', 'lemon', 'apple', 'dates', 'oil', 'honey', 'eggs', 'milk', 'chicken', 'leaf', 'basket',
];

export const SHOP = {
  shopPhone: '',
  deliveryMillimes: 5000,
  freeDeliveryFromMillimes: 60000,
  deliveryAlwaysFree: 0,
  maxItemsPerOrder: 20,
  announcementActive: 0,
  announcementTitle: '',
  announcementBody: '',
  /* Livraison quotidienne : quand le vendeur la coupe (trop peu de commandes),
   * il annonce la date de la prochaine tournée groupée. */
  dailyDelivery: 1,
  nextDeliveryDate: '',
  deliveryNote: '',
  /* Retrait sur place : le client vient chercher sa commande lui-même. */
  pickupEnabled: 0,
  pickupPlace: '',
  // Point posé sur la carte : sert à générer le bouton « Google Maps » du client.
  pickupLat: null,
  pickupLng: null,
  // Lien Google Maps collé directement par le vendeur ; prioritaire sur le point posé sur la carte.
  pickupMapUrl: '',
};

/** Longueurs maximales des textes libres saisis par le vendeur. */
export const TEXT_LIMITS = {
  announcementTitle: 80,
  announcementBody: 400,
  deliveryNote: 200,
  pickupPlace: 300,
  pickupMapUrl: 300,
  promotionDescription: 200,
};

/** Modes de remise de la commande proposés au client. */
export const FULFILMENTS = ['delivery', 'pickup'];

/** Bornes des réglages modifiables par le vendeur (en millimes). */
export const SHOP_LIMITS = {
  deliveryMillimes: { min: 0, max: 100000 },
  freeDeliveryFromMillimes: { min: 0, max: 1000000 },
};

/** Réglages chiffrés modifiables depuis le tableau de bord. */
const NUMBER_SETTINGS = [
  'deliveryMillimes', 'freeDeliveryFromMillimes', 'deliveryAlwaysFree', 'announcementActive',
  'dailyDelivery', 'pickupEnabled', 'pickupLat', 'pickupLng',
];
/** Réglages en texte libre (annonce, note de livraison, lieu de retrait, date de la prochaine tournée). */
const TEXT_SETTINGS = [
  'shopPhone', 'announcementTitle', 'announcementBody', 'deliveryNote',
  'pickupPlace', 'pickupMapUrl', 'nextDeliveryDate',
];
/** Réglages vrai/faux, exposés comme des booléens. */
const FLAG_SETTINGS = ['deliveryAlwaysFree', 'announcementActive', 'dailyDelivery', 'pickupEnabled'];

/**
 * Réglages en vigueur : les valeurs enregistrées par le vendeur, complétées
 * par les valeurs par défaut de SHOP tant qu'il n'a rien changé.
 */
export function shopSettings() {
  const stored = Object.fromEntries(
    db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, r.value])
  );
  const settings = { ...SHOP };
  for (const key of NUMBER_SETTINGS) {
    const value = Number(stored[key]);
    if (stored[key] !== undefined && Number.isFinite(value)) settings[key] = value;
  }
  for (const key of TEXT_SETTINGS) {
    if (typeof stored[key] === 'string') settings[key] = stored[key];
  }
  for (const key of FLAG_SETTINGS) settings[key] = Boolean(settings[key]);
  // Le retrait n'est proposé que si le vendeur a indiqué où venir chercher.
  settings.pickupEnabled = settings.pickupEnabled && settings.pickupPlace.trim().length > 0;
  return settings;
}

/** Enregistre les réglages fournis (les autres restent inchangés). */
export function saveShopSettings(values) {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  for (const key of [...NUMBER_SETTINGS, ...TEXT_SETTINGS]) {
    if (values[key] !== undefined) upsert.run(key, String(values[key]));
  }
  return shopSettings();
}

/**
 * Promotions telles que les attend le moteur de remises (public/js/promo.js).
 * `activeOnly` sert la boutique ; le tableau de bord veut aussi les inactives.
 */
export function listPromotions({ activeOnly = false } = {}) {
  const rows = db
    .prepare(`SELECT * FROM promotions ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY sort_order, id`)
    .all();
  return rows.map(promotionFromRow);
}

/** Liste d'identifiants stockée en JSON : toujours renvoyée sous forme de tableau. */
function parseIdList(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

export function promotionFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    active: Boolean(row.is_active),
    triggerType: row.trigger_type,
    triggerProductId: row.trigger_product_id,
    triggerQty: row.trigger_qty,
    triggerAmount: row.trigger_amount_millimes,
    rewardType: row.reward_type,
    rewardScope: row.reward_scope,
    rewardProductIds: parseIdList(row.reward_product_ids),
    rewardPercent: row.reward_percent,
    rewardAmount: row.reward_amount_millimes,
    rewardMaxQty: row.reward_max_qty,
  };
}

export function nextOrderReference() {
  const today = new Date();
  const stamp =
    String(today.getFullYear()) +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
  const { n } = db
    .prepare(`SELECT COUNT(*) AS n FROM orders WHERE reference LIKE ?`)
    .get(`FLH-${stamp}-%`);
  return `FLH-${stamp}-${String(n + 1).padStart(3, '0')}`;
}
