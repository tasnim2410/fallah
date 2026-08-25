/** Page commande : récapitulatif, formulaire client, envoi et confirmation. */

import { t, lang, money, qtyLabel, onLangChange } from './i18n.js';
import { produceIcon } from './icons.js';
import { createMap, locateMe, DEFAULT_CENTER } from './map.js';
import {
  initShell, api, getConfig, toast, esc,
  getCart, clearCart, cartSummary, lineMedia,
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

initShell();

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

  summaryTotals.innerHTML = totalsMarkup(cartSummary(config), config);
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
  renderSummary();
  renderPinState();
});

(async () => {
  config = await getConfig();
  renderGovernorates();
  renderSummary();
  renderPinState();
})();
