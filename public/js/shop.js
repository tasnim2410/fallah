/** Page boutique : catalogue, sélecteur de quantité, panier latéral. */

import { t, money, qtyLabel, onLangChange } from './i18n.js';
import { produceIcon, icon } from './icons.js';
import {
  initShell, api, getConfig, toast, esc,
  getCart, addToCart, setCartQty, removeFromCart, onCartChange,
  cartSubtotal, deliveryFee, lineMedia,
} from './app.js';

const CATEGORIES = ['all', 'vegetables', 'fruits', 'pantry', 'animal'];

const grid = document.getElementById('product-grid');
const chips = document.getElementById('categories');
const searchInput = document.getElementById('search');
const drawer = document.getElementById('cart-drawer');
const backdrop = document.getElementById('cart-backdrop');
const cartBody = document.getElementById('cart-body');
const cartFoot = document.getElementById('cart-foot');
const cartTotals = document.getElementById('cart-totals');

let products = [];
let activeCategory = 'all';
let searchTerm = '';
let config = null;
/** Quantité affichée sur chaque carte, avant ajout au panier. */
const draftQty = new Map();

initShell();
document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('hero-art').innerHTML =
  produceIcon('basket') +
  ['tomato', 'orange', 'oil', 'eggs']
    .map((name) => `<span class="hero__float">${produceIcon(name)}</span>`)
    .join('');

/* --------------------------- Catalogue --------------------------- */

function renderCategories() {
  chips.innerHTML = CATEGORIES.map(
    (key) => `<button type="button" class="chip" data-category="${key}"
                 aria-pressed="${key === activeCategory}">${esc(t(`cat.${key}`))}</button>`
  ).join('');
}

function visibleProducts() {
  const term = searchTerm.trim().toLowerCase();
  return products.filter((p) => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (!term) return true;
    return [p.name, p.farmer, p.region].join(' ').toLowerCase().includes(term);
  });
}

function qtyControl(p, value, { small = false } = {}) {
  const canDown = value > p.min;
  const canUp = value + p.step <= Math.min(p.max, p.stock || p.max);
  return `
    <div class="qty${small ? ' qty--sm' : ''}">
      <button type="button" data-step="-1" ${canDown ? '' : 'disabled'}
              aria-label="−">−</button>
      <span class="qty__value" aria-live="polite">
        ${esc(qtyLabel(value, p.unit))}
        <small>${esc(money(Math.round(p.price * value)))}</small>
      </span>
      <button type="button" data-step="1" ${canUp ? '' : 'disabled'}
              aria-label="+">+</button>
    </div>`;
}

/** Photo du vendeur si elle existe, sinon l'illustration du produit. */
function productMedia(p, alt) {
  return p.image
    ? `<img class="product-card__photo" src="${esc(p.image)}" alt="${esc(alt)}" loading="lazy" decoding="async">`
    : produceIcon(p.icon);
}

function productCard(p) {
  const qty = draftQty.get(p.id) ?? p.min;
  const out = !p.isAvailable;
  return `
    <article class="product-card${out ? ' product-card--out' : ''}" data-product="${p.id}">
      <div class="product-card__media${p.image ? ' product-card__media--photo' : ''}">
        <div class="product-card__badges">
          ${p.isBio ? `<span class="badge badge--bio">${esc(t('product.bio'))}</span>` : ''}
          ${out
            ? `<span class="badge badge--out">${esc(t('product.out'))}</span>`
            : p.harvested
              ? `<span class="badge badge--fresh">${esc(t('product.harvested', { when: p.harvested }))}</span>`
              : ''}
        </div>
        ${productMedia(p, p.name)}
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${esc(p.name)}</h3>
        ${p.farmer || p.region
          ? `<span class="product-card__farmer">
               ${icon('pin')}${p.farmer ? `${esc(t('product.from'))} ${esc(p.farmer)}` : ''}${
                 p.farmer && p.region ? ' · ' : ''
               }${esc(p.region)}
             </span>`
          : ''}
        <p class="product-card__desc">${esc(p.description)}</p>
        <div class="product-card__price">
          ${esc(money(p.price))} <small>/ ${esc(t(`unit.${p.unit}`))}</small>
        </div>
        ${out
          ? `<button type="button" class="btn btn--ghost btn--block" disabled>${esc(t('product.out'))}</button>`
          : `<span class="product-card__stock">${esc(t('product.stock', { qty: qtyLabel(p.stock, p.unit) }))}</span>
             ${qtyControl(p, qty)}
             <button type="button" class="btn btn--block" data-add="${p.id}">
               ${icon('cart')}<span>${esc(t('product.add'))}</span>
             </button>`}
      </div>
    </article>`;
}

function renderProducts() {
  const list = visibleProducts();
  grid.setAttribute('aria-busy', 'false');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1">
      ${produceIcon('leaf')}<p>${esc(t('catalog.empty'))}</p></div>`;
    return;
  }
  grid.innerHTML = list.map(productCard).join('');
}

grid.addEventListener('click', (event) => {
  const card = event.target.closest('[data-product]');
  if (!card) return;
  const product = products.find((p) => p.id === Number(card.dataset.product));
  if (!product) return;

  const stepBtn = event.target.closest('[data-step]');
  if (stepBtn) {
    const current = draftQty.get(product.id) ?? product.min;
    const ceiling = Math.min(product.max, product.stock || product.max);
    const next = Math.min(ceiling, Math.max(product.min, current + Number(stepBtn.dataset.step) * product.step));
    draftQty.set(product.id, Math.round(next * 100) / 100);
    // Ne redessine que la carte concernée pour ne pas perdre la position de défilement.
    card.outerHTML = productCard(product);
    return;
  }

  if (event.target.closest('[data-add]')) {
    const qty = draftQty.get(product.id) ?? product.min;
    addToCart(product, qty);
    toast(t('product.added', { name: product.name }));
    openCart();
  }
});

chips.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-category]');
  if (!chip) return;
  activeCategory = chip.dataset.category;
  renderCategories();
  renderProducts();
});

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTerm = searchInput.value;
    renderProducts();
  }, 180);
});

/* ----------------------------- Panier ---------------------------- */

let lastFocused = null;

function openCart() {
  lastFocused = document.activeElement;
  drawer.hidden = false;
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
  });
  document.getElementById('close-cart').focus();
}

function closeCart() {
  drawer.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  setTimeout(() => {
    drawer.hidden = true;
    backdrop.hidden = true;
  }, 280);
  lastFocused?.focus();
}

document.getElementById('open-cart').addEventListener('click', openCart);
document.getElementById('close-cart').addEventListener('click', closeCart);
backdrop.addEventListener('click', closeCart);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !drawer.hidden) closeCart();
});

function cartLine(item) {
  const product = products.find((p) => p.id === item.productId);
  const bounds = product || { min: item.min, max: item.max, step: item.step, stock: item.max, unit: item.unit, price: item.price };
  return `
    <div class="cart-line" data-line="${item.productId}">
      <div class="cart-line__icon">${lineMedia(item)}</div>
      <div class="cart-line__main">
        <div class="cart-line__name">${esc(item.name)}</div>
        <div class="cart-line__meta">${esc(money(item.price))} / ${esc(t(`unit.${item.unit}`))}</div>
        <div class="cart-line__controls">
          ${qtyControl({ ...bounds, price: item.price, unit: item.unit }, item.qty, { small: true })}
          <button type="button" class="icon-btn" data-remove="${item.productId}"
                  aria-label="${esc(t('cart.remove'))}">${icon('trash')}</button>
        </div>
      </div>
    </div>`;
}

function renderCart() {
  const items = getCart();
  if (!items.length) {
    cartBody.innerHTML = `
      <div class="empty-state">
        ${produceIcon('basket')}
        <p><strong>${esc(t('cart.empty'))}</strong></p>
        <p>${esc(t('cart.emptyHint'))}</p>
      </div>`;
    cartFoot.hidden = true;
    return;
  }

  cartBody.innerHTML = items.map(cartLine).join('');
  cartFoot.hidden = false;

  const subtotal = cartSubtotal();
  const delivery = deliveryFee(subtotal, config);
  const missing = config ? config.freeDeliveryFrom - subtotal : 0;

  cartTotals.innerHTML = `
    <div class="totals__row"><span>${esc(t('cart.subtotal'))}</span><span>${esc(money(subtotal))}</span></div>
    <div class="totals__row"><span>${esc(t('cart.delivery'))}</span>
      <span>${delivery === 0 ? esc(t('cart.deliveryFree')) : esc(money(delivery))}</span></div>
    ${missing > 0 ? `<div class="totals__row totals__row--free"><span>${esc(t('cart.freeHint', { amount: money(missing) }))}</span></div>` : ''}
    <div class="totals__row totals__row--grand"><span>${esc(t('cart.total'))}</span>
      <span>${esc(money(subtotal + delivery))}</span></div>`;
}

cartBody.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('[data-remove]');
  if (removeBtn) {
    removeFromCart(Number(removeBtn.dataset.remove));
    toast(t('cart.removed'));
    return;
  }

  const stepBtn = event.target.closest('[data-step]');
  if (!stepBtn) return;
  const line = stepBtn.closest('[data-line]');
  const productId = Number(line.dataset.line);
  const item = getCart().find((i) => i.productId === productId);
  if (!item) return;

  const product = products.find((p) => p.id === productId);
  const step = product?.step ?? item.step;
  const min = product?.min ?? item.min;
  const ceiling = Math.min(product?.max ?? item.max, product?.stock ?? item.max);
  const next = Math.round((item.qty + Number(stepBtn.dataset.step) * step) * 100) / 100;

  if (next < min) {
    removeFromCart(productId);
    toast(t('cart.removed'));
    return;
  }
  setCartQty(productId, Math.min(ceiling, next));
});

onCartChange(renderCart);
onLangChange(() => {
  renderCategories();
  renderProducts();
  renderCart();
});

/* --------------------------- Démarrage --------------------------- */

async function load() {
  config = await getConfig();
  const res = await api('/api/products');
  if (!res.ok) {
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1">
      ${icon('alert')}<p>${esc(t('err.network'))}</p></div>`;
    return;
  }
  products = res.data.products;
  renderCategories();
  renderProducts();
  renderCart();
}

load();
