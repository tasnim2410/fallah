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
