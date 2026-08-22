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
    name_ar        TEXT    NOT NULL,
    name_fr        TEXT    NOT NULL,
    desc_ar        TEXT    NOT NULL DEFAULT '',
    desc_fr        TEXT    NOT NULL DEFAULT '',
    category       TEXT    NOT NULL,
    icon           TEXT    NOT NULL DEFAULT 'leaf',
    unit           TEXT    NOT NULL DEFAULT 'kg',
    price_millimes INTEGER NOT NULL,
    step_qty       REAL    NOT NULL DEFAULT 0.5,
    min_qty        REAL    NOT NULL DEFAULT 1,
    max_qty        REAL    NOT NULL DEFAULT 30,
    stock_qty      REAL    NOT NULL DEFAULT 0,
    farmer_ar      TEXT    NOT NULL DEFAULT '',
    farmer_fr      TEXT    NOT NULL DEFAULT '',
    region_ar      TEXT    NOT NULL DEFAULT '',
    region_fr      TEXT    NOT NULL DEFAULT '',
    harvested_ar   TEXT    NOT NULL DEFAULT '',
    harvested_fr   TEXT    NOT NULL DEFAULT '',
    is_bio         INTEGER NOT NULL DEFAULT 0,
    is_available   INTEGER NOT NULL DEFAULT 1,
    sort_order     INTEGER NOT NULL DEFAULT 0
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
    name_ar             TEXT    NOT NULL,
    name_fr             TEXT    NOT NULL,
    unit                TEXT    NOT NULL,
    qty                 REAL    NOT NULL,
    unit_price_millimes INTEGER NOT NULL,
    line_millimes       INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_phone   ON orders(phone);
  CREATE INDEX IF NOT EXISTS idx_items_order    ON order_items(order_id);
`);

/** Order lifecycle, in the sequence the seller walks through. */
export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'];

export const PRODUCT_CATEGORIES = ['vegetables', 'fruits', 'pantry', 'animal'];

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
