/** Page de suivi : référence + téléphone → statut de la commande. */

import { t, pick, money, qtyLabel, dateLabel, onLangChange } from './i18n.js';
import { icon } from './icons.js';
import { initShell, api, getConfig, esc } from './app.js';

const form = document.getElementById('track-form');
const result = document.getElementById('result');
const button = document.getElementById('track-btn');
const refInput = document.getElementById('reference');
const phoneInput = document.getElementById('phone');

/** Étapes visibles par le client (l'annulation est traitée à part). */
const FLOW = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'];

let config = null;
let currentOrder = null;

initShell();

function governorateLabel(key) {
  const gov = config?.governorates.find((g) => g.key === key);
  return gov ? pick(gov) : key;
}

function renderOrder(order) {
  currentOrder = order;
  const index = FLOW.indexOf(order.status);

  const timeline =
    order.status === 'cancelled'
      ? `<li class="is-current"><strong>${esc(t('status.cancelled'))}</strong>
           <span>${esc(t('status.cancelled.desc'))}</span></li>`
      : FLOW.map((status, i) => {
          const state = i < index ? 'is-done' : i === index ? 'is-current' : '';
          return `<li class="${state}">
            <strong>${esc(t(`status.${status}`))}</strong>
            <span>${esc(t(`status.${status}.desc`))}</span>
          </li>`;
        }).join('');

  result.innerHTML = `
    <div class="panel" style="margin-block-start: var(--space-5)">
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-3);margin-block-end:var(--space-4)">
        <strong style="font-size:1.2rem;direction:ltr">${esc(order.reference)}</strong>
        <span class="status-pill status-${esc(order.status)}">${esc(t(`status.${order.status}`))}</span>
      </div>

      <div class="order-card__grid">
        <div class="order-card__field">
          <span>${esc(t('track.placedAt'))}</span>${esc(dateLabel(order.createdAt))}
        </div>
        <div class="order-card__field">
          <span>${esc(t('track.deliverTo'))}</span>${esc(governorateLabel(order.governorate))}
        </div>
        <div class="order-card__field">
          <span>${esc(t('cart.total'))}</span><strong>${esc(money(order.total))}</strong>
        </div>
      </div>

      <h3 style="margin-block-start: var(--space-4)">${esc(t('track.items'))}</h3>
      <ul class="order-items">
        ${order.items
          .map(
            (i) => `<li><span>${esc(i.name)} — ${esc(qtyLabel(i.qty, i.unit))}</span>
                        <span>${esc(money(i.lineTotal))}</span></li>`
          )
          .join('')}
        <li><span>${esc(t('cart.delivery'))}</span>
            <span>${order.delivery === 0 ? esc(t('cart.deliveryFree')) : esc(money(order.delivery))}</span></li>
      </ul>

      <h3 style="margin-block-start: var(--space-5)">${esc(t('track.progress'))}</h3>
      <ul class="timeline">${timeline}</ul>

      <div class="notice">
        ${icon('phone')}
        <span>${esc(t('checkout.callNotice'))} <a data-shop-phone href="tel:" dir="ltr"></a></span>
      </div>
    </div>`;

  // Le numéro du vendeur est injecté après coup (il vient de la configuration).
  const phoneLink = result.querySelector('[data-shop-phone]');
  if (phoneLink && config) {
    phoneLink.textContent = config.shopPhone;
    phoneLink.href = `tel:${config.shopPhone}`;
  }
}

function renderNotFound() {
  currentOrder = null;
  result.innerHTML = `
    <div class="notice notice--warn" style="margin-block-start: var(--space-5)">
      ${icon('alert')}<span>${esc(t('track.notFound'))}</span>
    </div>`;
}

async function lookup(reference, phone) {
  const label = button.querySelector('span:last-child');
  button.disabled = true;
  label.textContent = t('track.searching');

  const query = new URLSearchParams({ reference, phone });
  const res = await api(`/api/orders/track?${query}`);

  button.disabled = false;
  label.textContent = t('track.submit');

  if (res.ok) renderOrder(res.data.order);
  else if (res.status === 0) {
    result.innerHTML = `<div class="notice notice--warn" style="margin-block-start: var(--space-5)">
      ${icon('alert')}<span>${esc(t('err.network'))}</span></div>`;
  } else renderNotFound();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const reference = refInput.value.trim().toUpperCase();
  const phone = phoneInput.value.replace(/\D/g, '');
  if (!reference || phone.length < 8) {
    renderNotFound();
    return;
  }
  lookup(reference, phone);
});

onLangChange(() => {
  if (currentOrder) renderOrder(currentOrder);
});

(async () => {
  config = await getConfig();

  // Préremplissage depuis le lien de confirmation, sinon depuis la dernière commande.
  const params = new URLSearchParams(location.search);
  let reference = params.get('reference') || '';
  let phone = params.get('phone') || '';

  if (!reference) {
    try {
      const last = JSON.parse(localStorage.getItem('fallah.lastOrder') || 'null');
      if (last?.reference) ({ reference, phone } = last);
    } catch {
      // Pas de dernière commande mémorisée.
    }
  }

  if (reference) {
    refInput.value = reference;
    phoneInput.value = phone;
    if (phone) lookup(reference.toUpperCase(), phone.replace(/\D/g, ''));
  }
})();
