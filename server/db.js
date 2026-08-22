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

addMissingColumns('products', { image_path: `TEXT NOT NULL DEFAULT ''` });
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
  deliveryMillimes: 5000,
  freeDeliveryFromMillimes: 60000,
  maxItemsPerOrder: 20,
};

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
