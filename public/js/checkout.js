/** Page commande : récapitulatif, formulaire client, envoi et confirmation. */

import { t, lang, pick, money, qtyLabel, onLangChange } from './i18n.js';
import { produceIcon } from './icons.js';
import {
  initShell, api, getConfig, toast, esc,
  getCart, clearCart, cartSubtotal, deliveryFee,
} from './app.js';

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
        <div class="cart-line__icon">${produceIcon(item.icon)}</div>
        <div class="cart-line__main">
          <div class="cart-line__name">${esc(pick(item.name))}</div>
          <div class="cart-line__meta">${esc(qtyLabel(item.qty, item.unit))} × ${esc(money(item.price))}</div>
        </div>
        <strong>${esc(money(Math.round(item.price * item.qty)))}</strong>
      </div>`
    )
    .join('');

  const subtotal = cartSubtotal();
  const delivery = deliveryFee(subtotal, config);
  summaryTotals.innerHTML = `
    <div class="totals__row"><span>${esc(t('cart.subtotal'))}</span><span>${esc(money(subtotal))}</span></div>
    <div class="totals__row"><span>${esc(t('cart.delivery'))}</span>
      <span>${delivery === 0 ? esc(t('cart.deliveryFree')) : esc(money(delivery))}</span></div>
    <div class="totals__row totals__row--grand"><span>${esc(t('cart.total'))}</span>
      <span>${esc(money(subtotal + delivery))}</span></div>`;
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
});

(async () => {
  config = await getConfig();
  renderGovernorates();
  renderSummary();
})();
