/** Socle commun : appels API, panier, toasts, en-tête, animations. */

import { t, lang, applyTranslations, setLang, onLangChange, money, qtyLabel, dayLabel } from './i18n.js';
import { icon, produceIcon } from './icons.js';
import { computeDiscounts, resolveDelivery } from './promo.js';

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
      image: product.image || '',
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

/**
 * Frais de livraison selon la configuration boutique, qu'une promotion
 * « livraison offerte » peut annuler.
 */
export function deliveryFee(subtotal, config, freeDelivery = false) {
  if (!config) return 0;
  return resolveDelivery(subtotal, {
    alwaysFree: config.deliveryAlwaysFree,
    freeDeliveryFrom: config.freeDeliveryFrom,
    delivery: config.delivery,
  }, freeDelivery);
}

/* --------------------------- Promotions --------------------------- */

/** Le panier sous la forme attendue par le moteur de remises. */
const promoLines = () =>
  getCart().map((item) => ({
    productId: item.productId,
    qty: item.qty,
    unitPrice: item.price,
    lineTotal: Math.round(item.price * item.qty),
  }));

/**
 * Remises applicables au panier courant. Le serveur refait exactement le même
 * calcul à la commande : ceci sert uniquement à montrer le montant au client.
 */
export function cartDiscounts(config) {
  return computeDiscounts(promoLines(), config?.promotions || []);
}

/**
 * Récapitulatif complet d'un panier : sous-total, remises, livraison, total.
 * Partagé par la boutique et la page de commande pour qu'elles affichent
 * strictement la même chose.
 */
export function cartSummary(config) {
  const promo = cartDiscounts(config);
  const delivery = deliveryFee(promo.subtotal, config, promo.freeDelivery);
  return {
    subtotal: promo.subtotal,
    discount: promo.discount,
    discounts: promo.applied,
    freeDelivery: promo.freeDelivery,
    delivery,
    total: promo.subtotal - promo.discount + delivery,
  };
}

/** Énumère des noms avec le séparateur de la langue courante. */
const listNames = (products) => products.map((p) => p.name).join(t('promo.listSeparator'));

/**
 * L'avantage seul : « خصم 20% على بصل وثوم ». Sert à la fois à la phrase
 * montrée au client et au récapitulatif du tableau de bord, pour que les deux
 * ne puissent pas diverger.
 */
export function promotionReward(promo) {
  const names = listNames(promo.rewardProducts || []);
  if (promo.rewardType === 'free_delivery') return t('promo.rewardFreeDelivery');
  if (promo.rewardType === 'percent') {
    return promo.rewardScope === 'cart'
      ? t('promo.rewardPercentCart', { percent: promo.rewardPercent })
      : t('promo.rewardPercentProduct', { percent: promo.rewardPercent, product: names });
  }
  return promo.rewardScope === 'cart'
    ? t('promo.rewardAmountCart', { amount: money(promo.rewardAmount) })
    : t('promo.rewardAmountProduct', { amount: money(promo.rewardAmount), product: names });
}

/**
 * Le plafond de quantité change ce que le client reçoit : il doit rester
 * visible. L'unité est celle du premier produit remisé.
 */
export function promotionCap(promo) {
  const first = (promo.rewardProducts || [])[0];
  return promo.rewardType === 'percent' && promo.rewardMaxQty > 0 && first
    ? t('promo.rewardCap', { qty: qtyLabel(promo.rewardMaxQty, first.unit) })
    : '';
}

/**
 * La condition seule, formulée pour le vendeur : « شراء 5 كغ من طماطم ».
 * C'est le produit de référence — celui qu'il faut acheter, pas celui qui est
 * remisé.
 */
export function promotionCondition(promo) {
  if (promo.triggerType === 'contains') {
    if (!promo.triggerProduct) return t('promo.condProductMissing');
    return t('promo.condContains', { product: promo.triggerProduct.name });
  }
  if (promo.triggerType === 'product') {
    if (!promo.triggerProduct) return t('promo.condProductMissing');
    return t('promo.condProduct', {
      qty: qtyLabel(promo.triggerQty, promo.triggerProduct.unit),
      product: promo.triggerProduct.name,
    });
  }
  if (promo.triggerType === 'subtotal') return t('promo.condSubtotal', { amount: money(promo.triggerAmount) });
  return t('promo.condAlways');
}

/**
 * Phrase composée automatiquement à partir des réglages de la promotion :
 * « خصم 20% على الثوم — عند شراء 2 كغ من الطماطم ».
 * La condition n'est mentionnée que lorsqu'il y en a une.
 */
export function autoDescribePromotion(promo) {
  let condition = '';
  if (promo.triggerType === 'contains' && promo.triggerProduct) {
    condition = t('promo.triggerContains', { product: promo.triggerProduct.name });
  } else if (promo.triggerType === 'product' && promo.triggerProduct) {
    condition = t('promo.triggerProduct', {
      qty: qtyLabel(promo.triggerQty, promo.triggerProduct.unit),
      product: promo.triggerProduct.name,
    });
  } else if (promo.triggerType === 'subtotal') {
    condition = t('promo.triggerSubtotal', { amount: money(promo.triggerAmount) });
  }

  return [promotionReward(promo), promotionCap(promo), condition].filter(Boolean).join(' — ');
}

/**
 * Texte montré au client. Le vendeur peut écrire le sien ; sans quoi la phrase
 * est composée à partir des réglages de l'offre.
 */
export function describePromotion(promo) {
  const custom = (promo.description || '').trim();
  return custom || autoDescribePromotion(promo);
}

/* --------------------------- Retrait / livraison ------------------------ */

/** Le retrait sur place n'est proposé que si le vendeur l'a ouvert. */
export const pickupAvailable = (config) =>
  Boolean(config?.fulfilment?.pickupEnabled && config.fulfilment.pickupPlace);

/**
 * Quand le client sera servi, en toutes lettres : le jour même si le vendeur
 * livre tous les jours, sinon le regroupement annoncé.
 */
export function deliveryTiming(config) {
  const f = config?.fulfilment;
  if (!f) return '';
  if (f.dailyDelivery) return t('fulfil.deliveryDaily');
  return f.nextDeliveryDate
    ? t('fulfil.nextDelivery', { date: dayLabel(f.nextDeliveryDate) })
    : t('fulfil.nextDeliveryUnset');
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

/** Enregistre le service worker (mode hors ligne + installation). */
function mountServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker non enregistré :', err.message);
    });
  });
}

/**
 * Bouton « installer l'application ». Le navigateur décide s'il propose
 * l'installation : sans son feu vert, le bouton reste caché.
 */
function mountInstallPrompt() {
  const button = document.querySelector('[data-install]');
  if (!button) return;
  let deferred = null;

  addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    button.hidden = true;
  });

  addEventListener('appinstalled', () => {
    deferred = null;
    button.hidden = true;
  });
}

/** Prévient quand la connexion tombe ou revient. */
function mountNetworkStatus() {
  addEventListener('offline', () => toast(t('net.offline'), 'error'));
  addEventListener('online', () => toast(t('net.online')));
}

export function initShell() {
  applyTranslations();
  mountIcons();
  mountLangSwitch();
  mountReveal();
  updateCartCount();
  mountShopPhone();
  mountServiceWorker();
  mountInstallPrompt();
  mountNetworkStatus();

  onLangChange(() => {
    mountLangSwitch();
    for (const el of document.querySelectorAll('[data-money]')) {
      el.textContent = money(Number(el.dataset.money));
    }
  });
}

/** Vignette d'une ligne de panier : photo du produit si elle existe. */
export function lineMedia(item) {
  return item.image
    ? `<img src="${esc(item.image)}" alt="" loading="lazy">`
    : produceIcon(item.icon);
}

/** Petit utilitaire de gabarit : échappe le texte injecté en HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}
