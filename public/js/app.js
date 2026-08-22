/** Socle commun : appels API, panier, toasts, en-tête, animations. */

import { t, lang, applyTranslations, setLang, onLangChange, money } from './i18n.js';
import { icon } from './icons.js';

/* ------------------------------ API ------------------------------ */

/**
 * Appelle l'API et renvoie toujours un objet exploitable.
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Admin-Token'] = token;
  try {
    const res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'network' } };
  }
}

/** Message lisible pour un code d'erreur renvoyé par l'API. */
export const errorMessage = (data) => t(`err.${data?.error || 'network'}`);

/* ----------------------------- Toasts ---------------------------- */

function toastHost() {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
  }
  return host;
}

export function toast(message, variant = 'ok') {
  const el = document.createElement('div');
  el.className = `toast${variant === 'error' ? ' toast--error' : ''}`;
  el.innerHTML = `${icon(variant === 'error' ? 'alert' : 'check')}<span></span>`;
  el.querySelector('span').textContent = message;
  toastHost().append(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

/* ------------------------------ Panier --------------------------- */

const CART_KEY = 'fallah.cart';
const cartListeners = new Set();

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCart() {
  try {
    return safeParse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Stockage indisponible : le panier ne survivra pas au rechargement.
  }
  for (const fn of cartListeners) fn(items);
  updateCartCount();
}

export const onCartChange = (fn) => cartListeners.add(fn);

/** Ajoute une quantité (ou la cumule si le produit est déjà là). */
export function addToCart(product, qty) {
  const items = getCart();
  const existing = items.find((i) => i.productId === product.id);
  if (existing) {
    existing.qty = Math.min(product.max, Math.round((existing.qty + qty) * 100) / 100);
  } else {
    items.push({
      productId: product.id,
      qty,
      slug: product.slug,
      name: product.name,
      unit: product.unit,
      price: product.price,
      icon: product.icon,
      step: product.step,
      min: product.min,
      max: product.max,
    });
  }
  saveCart(items);
}

export function setCartQty(productId, qty) {
  const items = getCart();
  const line = items.find((i) => i.productId === productId);
  if (!line) return;
  line.qty = Math.round(qty * 100) / 100;
  saveCart(items);
}

export function removeFromCart(productId) {
  saveCart(getCart().filter((i) => i.productId !== productId));
}

export function clearCart() {
  saveCart([]);
}

export const cartCount = () => getCart().length;
export const cartSubtotal = () =>
  getCart().reduce((sum, i) => sum + Math.round(i.price * i.qty), 0);

/** Frais de livraison selon la configuration boutique. */
export function deliveryFee(subtotal, config) {
  if (!config) return 0;
  return subtotal >= config.freeDeliveryFrom ? 0 : config.delivery;
}

function updateCartCount() {
  const n = cartCount();
  for (const el of document.querySelectorAll('[data-cart-count]')) {
    el.textContent = String(n);
    el.hidden = n === 0;
  }
}

/* --------------------------- Configuration ----------------------- */

let configPromise;
/** Configuration boutique (mise en cache pour la page). */
export function getConfig() {
  configPromise ??= api('/api/config').then((r) => (r.ok ? r.data : null));
  return configPromise;
}

/* ------------------------- En-tête et divers --------------------- */

function mountLangSwitch() {
  for (const box of document.querySelectorAll('[data-lang-switch]')) {
    box.innerHTML = `
      <button type="button" data-set-lang="ar" lang="ar">ع</button>
      <button type="button" data-set-lang="fr" lang="fr">FR</button>`;
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', t('lang.switch'));
    for (const btn of box.querySelectorAll('button')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.setLang === lang));
      btn.addEventListener('click', () => setLang(btn.dataset.setLang));
    }
  }
}

function mountIcons() {
  // <span data-icon="cart"></span> → SVG inline.
  for (const el of document.querySelectorAll('[data-icon]')) {
    el.innerHTML = icon(el.dataset.icon);
  }
}

function mountReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) {
    for (const el of targets) el.classList.add('is-visible');
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px' }
  );
  for (const el of targets) observer.observe(el);
}

/** Affiche le numéro du vendeur partout où il est référencé. */
async function mountShopPhone() {
  const nodes = document.querySelectorAll('[data-shop-phone]');
  if (!nodes.length) return;
  const config = await getConfig();
  if (!config) return;
  for (const el of nodes) {
    el.textContent = config.shopPhone;
    if (el.tagName === 'A') el.href = `tel:${config.shopPhone}`;
  }
}

export function initShell() {
  applyTranslations();
  mountIcons();
  mountLangSwitch();
  mountReveal();
  updateCartCount();
  mountShopPhone();

  onLangChange(() => {
    mountLangSwitch();
    for (const el of document.querySelectorAll('[data-money]')) {
      el.textContent = money(Number(el.dataset.money));
    }
  });
}

/** Petit utilitaire de gabarit : échappe le texte injecté en HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}
