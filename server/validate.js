/** Gouvernorats livrés. La clé est stockée en base, les libellés servent à l'affichage. */
export const GOVERNORATES = [
  { key: 'tunis', ar: 'تونس', fr: 'Tunis' },
  { key: 'ariana', ar: 'أريانة', fr: 'Ariana' },
  { key: 'ben-arous', ar: 'بن عروس', fr: 'Ben Arous' },
  { key: 'manouba', ar: 'منوبة', fr: 'Manouba' },
  { key: 'nabeul', ar: 'نابل', fr: 'Nabeul' },
  { key: 'bizerte', ar: 'بنزرت', fr: 'Bizerte' },
  { key: 'zaghouan', ar: 'زغوان', fr: 'Zaghouan' },
  { key: 'sousse', ar: 'سوسة', fr: 'Sousse' },
  { key: 'monastir', ar: 'المنستير', fr: 'Monastir' },
  { key: 'mahdia', ar: 'المهدية', fr: 'Mahdia' },
  { key: 'sfax', ar: 'صفاقس', fr: 'Sfax' },
  { key: 'kairouan', ar: 'القيروان', fr: 'Kairouan' },
];

const GOVERNORATE_KEYS = new Set(GOVERNORATES.map((g) => g.key));

export const PREFERRED_TIMES = ['any', 'morning', 'afternoon', 'evening'];

const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');

/**
 * Normalise un numéro tunisien vers la forme locale à 8 chiffres.
 * Accepte 12 345 678, +216 12345678, 00216-12-345-678…
 * @returns {string|null} les 8 chiffres, ou null si le numéro est invalide.
 */
export function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  let digits = raw.replace(/[\s().-]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('216') && digits.length === 11) digits = digits.slice(3);
  // Mobiles et fixes tunisiens : 8 chiffres commençant par 2-5, 7 ou 9.
  return /^[2-579]\d{7}$/.test(digits) ? digits : null;
}

function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  // Neutralise les caractères de contrôle et écrase les espaces multiples.
  return value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Valide le formulaire client. Ne touche pas aux prix : ceux-ci sont
 * toujours recalculés côté serveur depuis la base.
 * @returns {{ok: true, value: object} | {ok: false, field: string, code: string}}
 */
export function validateCustomer(body) {
  const name = cleanText(body?.name, 80);
  if (name.length < 3) return { ok: false, field: 'name', code: 'name_too_short' };

  const phone = normalizePhone(body?.phone);
  if (!phone) return { ok: false, field: 'phone', code: 'phone_invalid' };

  const governorate = typeof body?.governorate === 'string' ? body.governorate : '';
  if (!GOVERNORATE_KEYS.has(governorate)) {
    return { ok: false, field: 'governorate', code: 'governorate_invalid' };
  }

  const address = cleanText(body?.address, 300);
  if (address.length < 10) return { ok: false, field: 'address', code: 'address_too_short' };

  const preferredTime = PREFERRED_TIMES.includes(body?.preferredTime) ? body.preferredTime : 'any';
  const lang = body?.lang === 'fr' ? 'fr' : 'ar';

  return {
    ok: true,
    value: { name, phone, governorate, address, note: cleanText(body?.note, 300), preferredTime, lang },
  };
}

const COMBINING_MARKS = new RegExp('[\\u0300-\\u036F]', 'g');

/** Fabrique un identifiant d'URL à partir du nom français (ou arabe). */
export function slugify(value, fallback = 'produit') {
  const slug = String(value ?? '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')      // enlève les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

const NUMERIC_FIELDS = {
  price: { min: 100, max: 1_000_000 },        // 0,100 DT → 1000 DT
  stock: { min: 0, max: 100_000 },
  step: { min: 0.1, max: 50 },
  min: { min: 0.1, max: 100 },
  max: { min: 0.5, max: 1000 },
};

/**
 * Valide la fiche produit saisie par le vendeur.
 * @param {object} body données du formulaire
 * @param {{units: string[], categories: string[], icons: string[], partial: boolean}} options
 */
export function validateProduct(body, { units, categories, icons, partial = false }) {
  const value = {};
  const text = (key, max, required) => {
    if (body?.[key] === undefined) {
      if (partial) return true;
      if (!required) { value[key] = ''; return true; }
    }
    const cleaned = cleanText(body?.[key], max);
    if (required && cleaned.length < 2) return false;
    value[key] = cleaned;
    return true;
  };

  if (!text('name', 80, true)) return { ok: false, field: 'name', code: 'name_required' };
  text('description', 300, false);
  text('farmer', 80, false);
  text('region', 80, false);
  text('harvested', 60, false);

  if (body?.category !== undefined || !partial) {
    if (!categories.includes(body?.category)) return { ok: false, field: 'category', code: 'category_invalid' };
    value.category = body.category;
  }
  if (body?.unit !== undefined || !partial) {
    if (!units.includes(body?.unit)) return { ok: false, field: 'unit', code: 'unit_invalid' };
    value.unit = body.unit;
  }
  if (body?.icon !== undefined) {
    if (!icons.includes(body.icon)) return { ok: false, field: 'icon', code: 'icon_invalid' };
    value.icon = body.icon;
  } else if (!partial) {
    value.icon = 'leaf';
  }

  for (const [key, bounds] of Object.entries(NUMERIC_FIELDS)) {
    if (body?.[key] === undefined) {
      if (partial) continue;
      return { ok: false, field: key, code: `${key}_invalid` };
    }
    const num = Number(body[key]);
    if (!Number.isFinite(num) || num < bounds.min || num > bounds.max) {
      return { ok: false, field: key, code: `${key}_invalid` };
    }
    value[key] = key === 'price' ? Math.round(num) : Math.round(num * 100) / 100;
  }

  // Une quantité minimale supérieure au maximum rendrait le produit incommandable.
  if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
    return { ok: false, field: 'min', code: 'min_above_max' };
  }

  if (body?.isBio !== undefined) value.isBio = Number(Boolean(body.isBio));
  if (body?.isAvailable !== undefined) value.isAvailable = Number(Boolean(body.isAvailable));

  return { ok: true, value };
}

/** Signatures acceptées pour une photo produit. */
const IMAGE_SIGNATURES = [
  { ext: 'jpg', type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', type: 'image/png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    ext: 'webp',
    type: 'image/webp',
    test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

/**
 * Identifie le format réel d'un fichier envoyé, d'après ses premiers octets —
 * on ne fait pas confiance à l'en-tête Content-Type annoncé par le client.
 */
export function detectImage(buffer) {
  if (!buffer || buffer.length < 12) return null;
  return IMAGE_SIGNATURES.find((sig) => sig.test(buffer)) || null;
}

/**
 * Vérifie la forme du panier reçu. Les quantités sont contrôlées ensuite
 * produit par produit (pas, minimum, stock) au moment de la commande.
 */
export function validateCartShape(items, maxItems) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, field: 'items', code: 'cart_empty' };
  }
  if (items.length > maxItems) {
    return { ok: false, field: 'items', code: 'cart_too_large' };
  }
  const seen = new Set();
  const parsed = [];
  for (const item of items) {
    const productId = Number(item?.productId);
    const qty = Number(item?.qty);
    if (!Number.isInteger(productId) || productId <= 0) {
      return { ok: false, field: 'items', code: 'cart_invalid' };
    }
    if (!Number.isFinite(qty) || qty <= 0 || qty > 1000) {
      return { ok: false, field: 'items', code: 'cart_invalid' };
    }
    if (seen.has(productId)) return { ok: false, field: 'items', code: 'cart_duplicate' };
    seen.add(productId);
    // Deux décimales suffisent (pas minimum : 0,5).
    parsed.push({ productId, qty: Math.round(qty * 100) / 100 });
  }
  return { ok: true, value: parsed };
}
