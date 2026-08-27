/** Page commande : récapitulatif, formulaire client, envoi et confirmation. */

import { t, lang, money, qtyLabel, onLangChange } from './i18n.js';
import { produceIcon, icon } from './icons.js';
import { createMap, locateMe, DEFAULT_CENTER } from './map.js';
import {
  initShell, api, getConfig, toast, esc,
  getCart, clearCart, cartSummary, lineMedia, pickupAvailable, deliveryTiming,
} from './app.js';
import { totalsMarkup } from './totals.js';

const form = document.getElementById('order-form');
const submitBtn = document.getElementById('submit-btn');
const summaryLines = document.getElementById('summary-lines');
const summaryTotals = document.getElementById('summary-totals');
const govSelect = document.getElementById('governorate');
const checkoutView = document.getElementById('checkout-view');
const successView = document.getElementById('success-view');

let config = null;
/** Mode de remise choisi par le client : livraison à domicile ou retrait. */
let fulfilment = 'delivery';

initShell();

/* ---------------------- Livraison ou retrait --------------------- */

const fulfilmentPanel = document.getElementById('fulfilment-panel');
const fulfilmentChoice = document.getElementById('fulfilment-choice');
const addressPanel = document.getElementById('address-panel');

/**
 * Le choix n'a lieu d'être que si le vendeur propose le retrait ; sinon la
 * commande est livrée et le panneau reste masqué.
 */
function renderFulfilment() {
  const canPickup = pickupAvailable(config);
  fulfilmentPanel.hidden = !canPickup;
  if (!canPickup) fulfilment = 'delivery';

  const pickupMapUrl = config?.fulfilment?.pickupMapUrl || '';

  const options = [
    {
      value: 'delivery',
      label: t('fulfil.delivery'),
      detail: [deliveryTiming(config), config?.fulfilment?.deliveryNote].filter(Boolean).join(' — '),
    },
    {
      value: 'pickup',
      label: t('fulfil.pickup'),
      detail: config?.fulfilment?.pickupPlace || '',
      mapUrl: pickupMapUrl,
    },
  ];

  fulfilmentChoice.innerHTML = options
    .map(
      (o) => `<label class="radio-card">
        <input type="radio" name="fulfilment" value="${o.value}" ${o.value === fulfilment ? 'checked' : ''}>
        <span>
          <strong>${esc(o.label)}</strong>
          ${o.detail ? `<small class="radio-card__detail">${esc(o.detail)}</small>` : ''}
          ${o.mapUrl
            ? `<a class="btn btn--sm btn--ghost" href="${esc(o.mapUrl)}" target="_blank" rel="noopener">
                 ${icon('pin')}<span>${esc(t('fulfil.pickupMap'))}</span>
               </a>`
            : ''}
        </span>
      </label>`
    )
    .join('');

  applyFulfilment();
}

/** L'adresse ne sert qu'à la livraison : on la retire quand le client vient. */
function applyFulfilment() {
  const pickup = fulfilment === 'pickup';
  addressPanel.hidden = pickup;
  // Un champ requis mais masqué bloquerait l'envoi du formulaire.
  document.getElementById('address').required = !pickup;
  document.getElementById('governorate').required = !pickup;
  renderSummary();
}

fulfilmentChoice.addEventListener('change', (event) => {
  const picked = event.target.closest('input[name="fulfilment"]');
  if (!picked) return;
  fulfilment = picked.value;
  applyFulfilment();
});

/**
 * Rappel de livraison affiché même sans choix possible : le client doit savoir
 * quand il sera servi, surtout si le vendeur a coupé la livraison quotidienne.
 */
function deliveryNoticeMarkup() {
  if (fulfilment === 'pickup') {
    return `<div class="notice">${icon('pin')}
      <span>${esc(t('fulfil.pickupAt', { place: config?.fulfilment?.pickupPlace || '' }))}</span></div>`;
  }
  /* Rien à signaler quand la boutique livre normalement : on ne prévient que
   * si le vendeur a groupé les tournées ou laissé un mot. */
  const note = config?.fulfilment?.deliveryNote || '';
  const grouped = config?.fulfilment && !config.fulfilment.dailyDelivery;
  if (!grouped && !note) return '';
  return `<div class="notice">${icon('truck')}
    <span>${esc([grouped ? deliveryTiming(config) : '', note].filter(Boolean).join(' — '))}</span></div>`;
}

/* ------------------------- Récapitulatif ------------------------- */

function renderSummary() {
  const items = getCart();

  if (!items.length) {
    summaryLines.innerHTML = `
      <div class="empty-state">
        ${produceIcon('basket')}
        <p><strong>${esc(t('cart.empty'))}</strong></p>
        <p><a href="/">${esc(t('cart.browse'))}</a></p>
      </div>`;
    summaryTotals.innerHTML = '';
    submitBtn.disabled = true;
    return;
  }

  submitBtn.disabled = false;
  summaryLines.innerHTML = items
    .map(
      (item) => `
      <div class="cart-line">
        <div class="cart-line__icon">${lineMedia(item)}</div>
        <div class="cart-line__main">
          <div class="cart-line__name">${esc(item.name)}</div>
          <div class="cart-line__meta">${esc(qtyLabel(item.qty, item.unit))} × ${esc(money(item.price))}</div>
        </div>
        <strong>${esc(money(Math.round(item.price * item.qty)))}</strong>
      </div>`
    )
    .join('');

  const summary = cartSummary(config);
  // Au retrait, il n'y a pas de frais de livraison à annoncer.
  if (fulfilment === 'pickup') {
    summary.delivery = 0;
    summary.total = summary.subtotal - summary.discount;
  }
  summaryTotals.innerHTML = totalsMarkup(summary, config, { pickup: fulfilment === 'pickup' })
    + deliveryNoticeMarkup();
}

function renderGovernorates() {
  if (!config) return;
  const current = govSelect.value;
  govSelect.innerHTML =
    `<option value="" disabled ${current ? '' : 'selected'}>${esc(t('form.govPh'))}</option>` +
    config.governorates
      .map((g) => `<option value="${esc(g.key)}" ${g.key === current ? 'selected' : ''}>${esc(g[lang] || g.ar)}</option>`)
      .join('');
}

/* ---------------------- Point sur la carte ----------------------- */

const pinOpen = document.getElementById('pin-open');
const pinPicker = document.getElementById('pin-picker');
const pinSummary = document.getElementById('pin-summary');
const pinCoords = document.getElementById('pin-coords');
const pinLat = document.getElementById('pin-lat');
const pinLng = document.getElementById('pin-lng');
const pinLocate = document.getElementById('pin-locate');

let map = null;
/** Position visée par le repère tant que le client n'a pas validé. */
let draftPin = null;
/** Position validée, envoyée avec la commande (null = aucun point). */
let savedPin = null;

/** Coordonnées jointes à la commande — absentes tant que rien n'est validé. */
function pinValues() {
  return savedPin ? { lat: savedPin.lat, lng: savedPin.lng } : {};
}

const formatCoords = (pin) => `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`;

/** Centre correspondant au gouvernorat choisi, ou Tunis par défaut. */
function governorateCenter() {
  const gov = config?.governorates.find((g) => g.key === govSelect.value);
  return gov?.lat ? { lat: gov.lat, lng: gov.lng } : DEFAULT_CENTER;
}

function renderPinState() {
  const has = Boolean(savedPin);
  pinSummary.hidden = !has;
  if (has) pinCoords.textContent = formatCoords(savedPin);
  pinLat.value = has ? String(savedPin.lat) : '';
  pinLng.value = has ? String(savedPin.lng) : '';
  pinOpen.querySelector('span:last-child').textContent = t(has ? 'form.pinChange' : 'form.pinOpen');
}

function openPicker() {
  pinPicker.hidden = false;
  pinOpen.hidden = true;

  if (!map) {
    map = createMap(document.getElementById('pin-map'), {
      onMove: (position) => { draftPin = position; },
    });
    for (const button of pinPicker.querySelectorAll('[data-map-zoom]')) {
      button.addEventListener('click', () => map.zoomBy(Number(button.dataset.mapZoom)));
    }
  }

  const start = savedPin || governorateCenter();
  map.setView(start.lat, start.lng, savedPin ? 17 : DEFAULT_CENTER.zoom);
  // La carte vient d'être révélée : ses dimensions n'étaient pas connues avant.
  requestAnimationFrame(() => map.refresh());
}

function closePicker() {
  pinPicker.hidden = true;
  pinOpen.hidden = false;
  draftPin = null;
}

pinOpen.addEventListener('click', openPicker);

document.getElementById('pin-confirm').addEventListener('click', () => {
  savedPin = draftPin || map?.center() || null;
  renderPinState();
  closePicker();
});

document.getElementById('pin-cancel').addEventListener('click', closePicker);

document.getElementById('pin-clear').addEventListener('click', () => {
  savedPin = null;
  renderPinState();
});

pinLocate.addEventListener('click', async () => {
  const label = pinLocate.querySelector('span:last-child');
  pinLocate.disabled = true;
  label.textContent = t('form.pinLocating');

  const position = await locateMe();

  pinLocate.disabled = false;
  label.textContent = t('form.pinLocate');
  if (!position) {
    toast(t('form.pinDenied'), 'error');
    return;
  }
  map.setView(position.lat, position.lng, 17);
});

// Changer de gouvernorat recentre la carte, tant que rien n'a été validé.
govSelect.addEventListener('change', () => {
  if (savedPin || pinPicker.hidden || !map) return;
  const center = governorateCenter();
  map.setView(center.lat, center.lng, DEFAULT_CENTER.zoom);
});

/* --------------------------- Validation -------------------------- */

function showFieldError(field, messageKey) {
  const wrapper = form.querySelector(`[data-field="${field}"]`);
  if (!wrapper) return;
  wrapper.classList.add('has-error');
  const slot = wrapper.querySelector(`[data-error-for="${field}"]`);
  if (slot) slot.textContent = t(messageKey);
  const input = wrapper.querySelector('input, textarea, select');
  input?.setAttribute('aria-invalid', 'true');
  return input;
}

function clearErrors() {
  for (const wrapper of form.querySelectorAll('.has-error')) {
    wrapper.classList.remove('has-error');
    wrapper.querySelector('[data-error-for]').textContent = '';
    wrapper.querySelector('input, textarea, select')?.removeAttribute('aria-invalid');
  }
}

/** Contrôles côté client — le serveur revalide tout de toute façon. */
function validateLocally(values) {
  if (values.name.trim().length < 3) return { field: 'name', code: 'err.name_too_short' };
  if (!/^[2-579]\d{7}$/.test(values.phone.replace(/\D/g, ''))) return { field: 'phone', code: 'err.phone_invalid' };
  // Au retrait sur place, ni gouvernorat ni adresse ne sont demandés.
  if (values.fulfilment === 'pickup') return null;
  if (!values.governorate) return { field: 'governorate', code: 'err.governorate_invalid' };
  if (values.address.trim().length < 10) return { field: 'address', code: 'err.address_too_short' };
  return null;
}

// Efface l'erreur dès que le client corrige le champ.
form.addEventListener('input', (event) => {
  const wrapper = event.target.closest('.has-error');
  if (!wrapper) return;
  wrapper.classList.remove('has-error');
  wrapper.querySelector('[data-error-for]').textContent = '';
  event.target.removeAttribute('aria-invalid');
});

/* ---------------------------- Envoi ------------------------------ */

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();

  const items = getCart();
  if (!items.length) {
    toast(t('err.cart_empty'), 'error');
    return;
  }

  const data = new FormData(form);
  const values = {
    name: String(data.get('name') || ''),
    phone: String(data.get('phone') || ''),
    governorate: String(data.get('governorate') || ''),
    address: String(data.get('address') || ''),
    ...pinValues(),
    note: String(data.get('note') || ''),
    preferredTime: String(data.get('preferredTime') || 'any'),
    fulfilment,
    lang,
  };

  const localError = validateLocally(values);
  if (localError) {
    const input = showFieldError(localError.field, localError.code);
    input?.focus();
    toast(t(localError.code), 'error');
    return;
  }

  const label = submitBtn.querySelector('span:last-child');
  submitBtn.disabled = true;
  label.textContent = t('form.submitting');

  const res = await api('/api/orders', {
    method: 'POST',
    body: { customer: values, items: items.map((i) => ({ productId: i.productId, qty: i.qty })) },
  });

  submitBtn.disabled = false;
  label.textContent = t('form.submit');

  if (!res.ok) {
    const code = res.data?.error;
    const message = t(`err.${code}`) === `err.${code}` ? t('err.network') : t(`err.${code}`);
    if (res.data?.field) {
      const input = showFieldError(res.data.field, `err.${code}`);
      input?.focus();
    }
    toast(message, 'error');
    return;
  }

  showSuccess(res.data, values.phone.replace(/\D/g, ''));
});

function showSuccess(order, phone) {
  clearCart();
  checkoutView.hidden = true;
  successView.hidden = false;

  document.getElementById('order-ref').textContent = order.reference;
  document.getElementById('success-body').textContent = t('success.body', { phone });
  document.getElementById('track-link').href =
    `/track.html?reference=${encodeURIComponent(order.reference)}&phone=${encodeURIComponent(phone)}`;

  // Conserve la référence pour préremplir la page de suivi plus tard.
  try {
    localStorage.setItem('fallah.lastOrder', JSON.stringify({ reference: order.reference, phone }));
  } catch {
    // Sans stockage, le client garde simplement sa référence sous les yeux.
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  successView.querySelector('h1').setAttribute('tabindex', '-1');
  successView.querySelector('h1').focus();
}

document.getElementById('copy-ref').addEventListener('click', async () => {
  const reference = document.getElementById('order-ref').textContent;
  try {
    await navigator.clipboard.writeText(reference);
    toast(t('success.copied'));
  } catch {
    // Le presse-papiers peut être bloqué : la référence reste lisible à l'écran.
  }
});

onLangChange(() => {
  renderGovernorates();
  renderFulfilment();
  renderPinState();
});

(async () => {
  config = await getConfig();
  renderGovernorates();
  renderFulfilment();
  renderPinState();
})();
