/** Espace vendeur : connexion, suivi des commandes, prix et stock. */

import { t, pick, money, qtyLabel, dateLabel, onLangChange } from './i18n.js';
import { icon } from './icons.js';
import { initShell, api, getConfig, toast, esc } from './app.js';

const TOKEN_KEY = 'fallah.adminToken';
const STATUSES = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'];
/** Bouton d'avancement proposé pour chaque statut. */
const NEXT_ACTION = {
  pending: { status: 'confirmed', key: 'admin.confirm', icon: 'check' },
  confirmed: { status: 'preparing', key: 'admin.prepare', icon: 'package' },
  preparing: { status: 'on_the_way', key: 'admin.ship', icon: 'truck' },
  on_the_way: { status: 'delivered', key: 'admin.deliver', icon: 'check' },
};

const loginView = document.getElementById('login-view');
const dashView = document.getElementById('dash-view');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout');
const ordersBox = document.getElementById('orders');
const statsBox = document.getElementById('stats');
const filtersBox = document.getElementById('status-filters');
const productsBody = document.getElementById('products-body');
const orderSearch = document.getElementById('order-search');

let token = null;
let config = null;
let orders = [];
let products = [];
let counts = {};
let revenue = 0;
let activeStatus = 'pending';
let searchTerm = '';

initShell();

try {
  token = localStorage.getItem(TOKEN_KEY);
} catch {
  token = null;
}

/* --------------------------- Connexion --------------------------- */

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.getElementById('password').value;
  const res = await api('/api/admin/login', { method: 'POST', body: { password } });

  if (!res.ok) {
    const wrapper = loginForm.querySelector('[data-field="password"]');
    wrapper.classList.add('has-error');
    wrapper.querySelector('[data-error-for="password"]').textContent =
      res.status === 401 ? t('admin.badPassword') : t(`err.${res.data?.error || 'network'}`);
    return;
  }

  token = res.data.token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Sans stockage, la session dure le temps de l'onglet.
  }
  enterDashboard();
});

logoutBtn.addEventListener('click', () => {
  token = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Rien à nettoyer.
  }
  dashView.hidden = true;
  loginView.hidden = false;
  logoutBtn.hidden = true;
});

/** Session expirée ou invalide : on renvoie à l'écran de connexion. */
function requireLogin() {
  token = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Rien à nettoyer.
  }
  loginView.hidden = false;
  dashView.hidden = true;
  logoutBtn.hidden = true;
  toast(t('err.unauthorized'), 'error');
}

/* ---------------------------- Commandes -------------------------- */

function renderFilters() {
  const options = ['all', ...STATUSES];
  filtersBox.innerHTML = options
    .map((status) => {
      const label = status === 'all' ? t('admin.filterAll') : t(`status.${status}`);
      const n = status === 'all'
        ? Object.values(counts).reduce((a, b) => a + b, 0)
        : counts[status] || 0;
      return `<button type="button" class="chip" data-status="${status}"
                aria-pressed="${status === activeStatus}">${esc(label)} (${n})</button>`;
    })
    .join('');
}

function renderStats() {
  const active = (counts.confirmed || 0) + (counts.preparing || 0) + (counts.on_the_way || 0);
  const cards = [
    { value: counts.pending || 0, label: t('admin.statCall'), color: 'var(--warning)' },
    { value: active, label: t('admin.statActive'), color: 'var(--info)' },
    { value: counts.delivered || 0, label: t('admin.statDelivered'), color: 'var(--primary)' },
    { value: money(revenue), label: t('admin.statRevenue'), color: 'var(--accent)' },
  ];
  statsBox.innerHTML = cards
    .map(
      (c) => `<div class="stat">
        <div class="stat__value" style="color:${c.color}">${esc(String(c.value))}</div>
        <div class="stat__label">${esc(c.label)}</div>
      </div>`
    )
    .join('');
}

function governorateLabel(key) {
  const gov = config?.governorates.find((g) => g.key === key);
  return gov ? pick(gov) : key;
}

function orderCard(order) {
  const next = NEXT_ACTION[order.status];
  const closed = order.status === 'delivered' || order.status === 'cancelled';
  return `
    <article class="order-card" data-order="${order.id}">
      <div class="order-card__head">
        <span class="order-card__ref">${esc(order.reference)}</span>
        <span class="status-pill status-${esc(order.status)}">${esc(t(`status.${order.status}`))}</span>
        <span class="order-card__time">${esc(dateLabel(order.createdAt))}</span>
      </div>

      <div class="order-card__grid">
        <div class="order-card__field"><span>${esc(t('admin.customer'))}</span>${esc(order.customerName)}</div>
        <div class="order-card__field"><span>${esc(t('admin.phone'))}</span>
          <a href="tel:+216${esc(order.phone)}" dir="ltr">${esc(order.phone)}</a></div>
        <div class="order-card__field"><span>${esc(t('admin.time'))}</span>${esc(t(`form.time${order.preferredTime[0].toUpperCase()}${order.preferredTime.slice(1)}`))}</div>
        <div class="order-card__field"><span>${esc(t('admin.address'))}</span>
          ${esc(governorateLabel(order.governorate))} — ${esc(order.address)}</div>
        ${order.note ? `<div class="order-card__field"><span>${esc(t('admin.note'))}</span>${esc(order.note)}</div>` : ''}
      </div>

      <ul class="order-items">
        ${order.items
          .map(
            (i) => `<li><span>${esc(pick(i.name))} — ${esc(qtyLabel(i.qty, i.unit))}</span>
                        <span>${esc(money(i.lineTotal))}</span></li>`
          )
          .join('')}
        <li><span>${esc(t('cart.delivery'))}</span>
            <span>${order.delivery === 0 ? esc(t('cart.deliveryFree')) : esc(money(order.delivery))}</span></li>
        <li><strong>${esc(t('cart.total'))}</strong><strong>${esc(money(order.total))}</strong></li>
      </ul>

      <div class="order-card__actions">
        <a class="btn btn--sm" href="tel:+216${esc(order.phone)}">
          ${icon('phone')}<span>${esc(t('admin.call'))}</span>
        </a>
        ${next
          ? `<button type="button" class="btn btn--sm btn--accent" data-set-status="${next.status}">
               ${icon(next.icon)}<span>${esc(t(next.key))}</span>
             </button>`
          : ''}
        ${closed ? '' : `<button type="button" class="btn btn--sm btn--danger" data-cancel>
               ${icon('x')}<span>${esc(t('admin.cancel'))}</span>
             </button>`}
      </div>
    </article>`;
}

function renderOrders() {
  const term = searchTerm.trim().toLowerCase();
  const list = orders.filter((o) => {
    if (activeStatus !== 'all' && o.status !== activeStatus) return false;
    if (!term) return true;
    return `${o.reference} ${o.customerName} ${o.phone} ${o.address}`.toLowerCase().includes(term);
  });

  ordersBox.innerHTML = list.length
    ? list.map(orderCard).join('')
    : `<div class="empty-state">${icon('package')}<p>${esc(t('admin.noOrders'))}</p></div>`;
}

ordersBox.addEventListener('click', async (event) => {
  const card = event.target.closest('[data-order]');
  if (!card) return;
  const id = Number(card.dataset.order);

  const statusBtn = event.target.closest('[data-set-status]');
  const cancelBtn = event.target.closest('[data-cancel]');
  if (!statusBtn && !cancelBtn) return;

  if (cancelBtn && !confirm(t('admin.cancelConfirm'))) return;

  const status = cancelBtn ? 'cancelled' : statusBtn.dataset.setStatus;
  const res = await api(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status }, token });

  if (res.status === 401) return requireLogin();
  if (!res.ok) return toast(t(`err.${res.data?.error || 'network'}`), 'error');

  toast(t('admin.updated'));
  loadOrders();
});

filtersBox.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-status]');
  if (!chip) return;
  activeStatus = chip.dataset.status;
  renderFilters();
  renderOrders();
});

let searchTimer;
orderSearch.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTerm = orderSearch.value;
    renderOrders();
  }, 180);
});

document.getElementById('refresh').addEventListener('click', () => loadOrders());

/* ---------------------------- Produits --------------------------- */

function renderProducts() {
  productsBody.innerHTML = products
    .map(
      (p) => `
      <tr data-product="${p.id}">
        <td>
          <strong>${esc(pick(p.name))}</strong><br>
          <small class="muted">${esc(t(`unit.${p.unit}`))} · ${esc(pick(p.farmer))}</small>
        </td>
        <td><input type="number" data-price value="${p.price}" min="100" max="1000000" step="100"
                   aria-label="${esc(t('admin.pPrice'))}"></td>
        <td><input type="number" data-stock value="${p.stock}" min="0" max="100000" step="0.5"
                   aria-label="${esc(t('admin.pStock'))}"></td>
        <td>
          <label class="switch">
            <input type="checkbox" data-available ${p.isAvailable ? 'checked' : ''}>
            <span class="visually-hidden">${esc(t('admin.pAvailable'))}</span>
          </label>
        </td>
        <td><button type="button" class="btn btn--sm btn--ghost" data-save>${esc(t('admin.save'))}</button></td>
      </tr>`
    )
    .join('');
}

productsBody.addEventListener('click', async (event) => {
  if (!event.target.closest('[data-save]')) return;
  const row = event.target.closest('[data-product]');
  const id = Number(row.dataset.product);

  const res = await api(`/api/admin/products/${id}`, {
    method: 'PATCH',
    token,
    body: {
      price: Number(row.querySelector('[data-price]').value),
      stock: Number(row.querySelector('[data-stock]').value),
      isAvailable: row.querySelector('[data-available]').checked,
    },
  });

  if (res.status === 401) return requireLogin();
  if (!res.ok) return toast(t(`err.${res.data?.error || 'network'}`), 'error');

  const index = products.findIndex((p) => p.id === id);
  if (index >= 0) products[index] = res.data.product;
  toast(t('admin.saved'));
});

/* ----------------------------- Onglets --------------------------- */

for (const tab of document.querySelectorAll('[data-tab]')) {
  tab.addEventListener('click', () => {
    for (const other of document.querySelectorAll('[data-tab]')) {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      document.getElementById(`panel-${other.dataset.tab}`).hidden = !selected;
    }
    if (tab.dataset.tab === 'products') loadProducts();
  });
}

/* ---------------------------- Chargement ------------------------- */

async function loadOrders() {
  const res = await api('/api/admin/orders', { token });
  if (res.status === 401) return requireLogin();
  if (!res.ok) return toast(t('err.network'), 'error');

  orders = res.data.orders;
  counts = res.data.counts;
  revenue = res.data.revenue;
  renderStats();
  renderFilters();
  renderOrders();
}

async function loadProducts() {
  const res = await api('/api/admin/products', { token });
  if (res.status === 401) return requireLogin();
  if (!res.ok) return toast(t('err.network'), 'error');
  products = res.data.products;
  renderProducts();
}

async function enterDashboard() {
  loginView.hidden = true;
  dashView.hidden = false;
  logoutBtn.hidden = false;
  config = await getConfig();
  await loadOrders();
}

onLangChange(() => {
  if (dashView.hidden) return;
  renderStats();
  renderFilters();
  renderOrders();
  if (products.length) renderProducts();
});

if (token) enterDashboard();
