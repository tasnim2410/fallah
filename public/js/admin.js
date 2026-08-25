/** Espace vendeur : connexion, suivi des commandes, prix et stock. */

import { t, pick, money, qtyLabel, dateLabel, onLangChange } from './i18n.js';
import { icon, produceIcon } from './icons.js';
import { initShell, api, getConfig, toast, esc, describePromotion } from './app.js';
import { mapsLink } from './map.js';

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
/** Listes de référence renvoyées par l'API avec le catalogue. */
let productUnits = ['kg'];
let productCategories = ['vegetables'];
let productIcons = ['leaf'];
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
        ${order.lat != null
          ? `<div class="order-card__field"><span>${esc(t('admin.pin'))}</span>
               <a href="${esc(mapsLink(order.lat, order.lng))}" target="_blank" rel="noopener" dir="ltr">
                 ${esc(order.lat.toFixed(5))}, ${esc(order.lng.toFixed(5))}</a></div>`
          : ''}
        ${order.note ? `<div class="order-card__field"><span>${esc(t('admin.note'))}</span>${esc(order.note)}</div>` : ''}
      </div>

      <ul class="order-items">
        ${order.items
          .map(
            (i) => `<li><span>${esc(i.name)} — ${esc(qtyLabel(i.qty, i.unit))}</span>
                        <span>${esc(money(i.lineTotal))}</span></li>`
          )
          .join('')}
        ${(order.discounts || [])
          .map(
            (d) => `<li class="is-discount"><span>${esc(d.title)}</span>
                        <span>${d.freeDelivery ? esc(t('cart.deliveryFree')) : `−${esc(money(d.amount))}`}</span></li>`
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
        ${order.lat != null
          ? `<a class="btn btn--sm" href="${esc(mapsLink(order.lat, order.lng))}" target="_blank" rel="noopener">
               ${icon('pin')}<span>${esc(t('admin.openMap'))}</span>
             </a>`
          : ''}
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

/** Vignette : la photo si elle existe, sinon l'illustration. */
const productThumb = (p) =>
  `<div class="product-thumb">${
    p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : produceIcon(p.icon)
  }</div>`;

function renderProducts() {
  if (!products.length) {
    productsBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">${icon('package')}
      <p>${esc(t('p.empty'))}</p></div></td></tr>`;
    return;
  }

  productsBody.innerHTML = products
    .map(
      (p) => `
      <tr data-product="${p.id}">
        <td>${productThumb(p)}</td>
        <td>
          <strong>${esc(p.name)}</strong><br>
          <small class="muted">${esc(t(`unit.${p.unit}`))} · ${esc(t(`cat.${p.category}`))}${
            p.farmer ? ` · ${esc(p.farmer)}` : ''
          }</small>
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
        <td>
          <div class="row-actions">
            <button type="button" class="btn btn--sm btn--ghost" data-save>${esc(t('admin.save'))}</button>
            <button type="button" class="btn btn--sm btn--ghost" data-edit>${esc(t('p.edit'))}</button>
            <button type="button" class="btn btn--sm btn--danger" data-delete>${esc(t('p.delete'))}</button>
          </div>
        </td>
      </tr>`
    )
    .join('');
}

productsBody.addEventListener('click', async (event) => {
  const row = event.target.closest('[data-product]');
  if (!row) return;
  const id = Number(row.dataset.product);
  const product = products.find((p) => p.id === id);

  if (event.target.closest('[data-edit]')) return openProductDialog(product);

  if (event.target.closest('[data-delete]')) {
    if (!confirm(t('p.deleteConfirm', { name: product.name }))) return;
    const res = await api(`/api/admin/products/${id}`, { method: 'DELETE', token });
    if (res.status === 401) return requireLogin();
    if (!res.ok) return toast(t(`err.${res.data?.error || 'network'}`), 'error');
    products = products.filter((p) => p.id !== id);
    renderProducts();
    toast(t('p.deleted'));
    return;
  }

  if (!event.target.closest('[data-save]')) return;

  // Édition rapide : uniquement le prix, le stock et la mise en vente.
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

/* ------------------- Fiche produit (ajout / édition) ------------------- */

const dialog = document.getElementById('product-dialog');
const productForm = document.getElementById('product-form');
const photoInput = document.getElementById('p-photo');
const photoPreview = document.getElementById('photo-preview');
const photoRemoveBtn = document.getElementById('photo-remove');
const iconPicker = document.getElementById('icon-picker');

/** Produit en cours d'édition (null = création). */
let editing = null;
/** Fichier choisi mais pas encore envoyé. */
let pendingPhoto = null;
/** Le vendeur a demandé la suppression de la photo existante. */
let photoCleared = false;
let chosenIcon = 'leaf';

function fillSelect(id, values, labelKey) {
  const select = document.getElementById(id);
  select.innerHTML = values
    .map((v) => `<option value="${esc(v)}">${esc(t(`${labelKey}.${v}`))}</option>`)
    .join('');
}

function renderIconPicker() {
  iconPicker.innerHTML = productIcons
    .map(
      (name) => `<button type="button" role="radio" data-icon-choice="${esc(name)}"
        aria-checked="${name === chosenIcon}" title="${esc(name)}">${produceIcon(name)}</button>`
    )
    .join('');
}

iconPicker.addEventListener('click', (event) => {
  const button = event.target.closest('[data-icon-choice]');
  if (!button) return;
  chosenIcon = button.dataset.iconChoice;
  renderIconPicker();
  if (!pendingPhoto && (photoCleared || !editing?.image)) renderPhotoPreview();
});

function renderPhotoPreview() {
  let media = produceIcon(chosenIcon);
  if (pendingPhoto) media = `<img src="${URL.createObjectURL(pendingPhoto)}" alt="">`;
  else if (editing?.image && !photoCleared) media = `<img src="${esc(editing.image)}" alt="">`;

  photoPreview.innerHTML = media;
  const hasPhoto = Boolean(pendingPhoto || (editing?.image && !photoCleared));
  photoRemoveBtn.hidden = !hasPhoto;
  document.getElementById('photo-button-label').textContent = t(hasPhoto ? 'p.photoChange' : 'p.photoChoose');
}

photoInput.addEventListener('change', () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    toast(t('err.image_too_large'), 'error');
    photoInput.value = '';
    return;
  }
  pendingPhoto = file;
  photoCleared = false;
  renderPhotoPreview();
});

photoRemoveBtn.addEventListener('click', () => {
  pendingPhoto = null;
  photoInput.value = '';
  photoCleared = true;
  renderPhotoPreview();
});

/** Ouvre la fiche, vide pour un ajout ou pré-remplie pour une modification. */
function openProductDialog(product = null) {
  editing = product;
  pendingPhoto = null;
  photoCleared = false;
  chosenIcon = product?.icon || 'leaf';

  fillSelect('p-category', productCategories, 'cat');
  fillSelect('p-unit', productUnits, 'unit');
  renderIconPicker();
  clearProductErrors();

  document.getElementById('dialog-title').textContent = t(product ? 'p.edit' : 'p.new');
  const f = productForm.elements;
  f.name.value = product?.name || '';
  f.description.value = product?.description || '';
  f.category.value = product?.category || productCategories[0];
  f.unit.value = product?.unit || 'kg';
  f.price.value = product?.price ?? 2000;
  f.stock.value = product?.stock ?? 50;
  f.step.value = product?.step ?? 0.5;
  f.min.value = product?.min ?? 1;
  f.max.value = product?.max ?? 20;
  f.farmer.value = product?.farmer || '';
  f.region.value = product?.region || '';
  f.harvested.value = product?.harvested || '';
  f.isBio.checked = Boolean(product?.isBio);
  f.isAvailable.checked = product ? Boolean(product.isAvailable) : true;

  renderPhotoPreview();
  dialog.showModal();
  f.name.focus();
}

function clearProductErrors() {
  for (const wrapper of productForm.querySelectorAll('.has-error')) {
    wrapper.classList.remove('has-error');
    wrapper.querySelector('[data-error-for]').textContent = '';
  }
}

document.getElementById('add-product').addEventListener('click', () => openProductDialog());
document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
document.getElementById('dialog-cancel').addEventListener('click', () => dialog.close());

/** Envoie la photo choisie sur le produit (déjà créé côté serveur). */
async function uploadPhoto(productId) {
  const res = await fetch(`/api/admin/products/${productId}/image`, {
    method: 'POST',
    headers: { 'Content-Type': pendingPhoto.type || 'application/octet-stream', 'X-Admin-Token': token },
    body: pendingPhoto,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearProductErrors();

  const data = new FormData(productForm);
  const payload = {
    name: data.get('name'), description: data.get('description'),
    farmer: data.get('farmer'), region: data.get('region'), harvested: data.get('harvested'),
    category: data.get('category'), unit: data.get('unit'), icon: chosenIcon,
    price: Number(data.get('price')), stock: Number(data.get('stock')),
    step: Number(data.get('step')), min: Number(data.get('min')), max: Number(data.get('max')),
    isBio: productForm.elements.isBio.checked,
    isAvailable: productForm.elements.isAvailable.checked,
  };

  const saveBtn = document.getElementById('dialog-save');
  const label = saveBtn.querySelector('span:last-child');
  saveBtn.disabled = true;
  label.textContent = t('p.saving');

  const res = editing
    ? await api(`/api/admin/products/${editing.id}`, { method: 'PATCH', token, body: payload })
    : await api('/api/admin/products', { method: 'POST', token, body: payload });

  if (res.status === 401) { saveBtn.disabled = false; label.textContent = t('p.saveProduct'); return requireLogin(); }

  if (!res.ok) {
    saveBtn.disabled = false;
    label.textContent = t('p.saveProduct');
    const code = res.data?.error || 'network';
    const wrapper = res.data?.field && productForm.querySelector(`[data-field="${res.data.field}"]`);
    if (wrapper) {
      wrapper.classList.add('has-error');
      wrapper.querySelector('[data-error-for]').textContent = t(`err.${code}`);
      wrapper.querySelector('input, select, textarea')?.focus();
    }
    toast(t(`err.${code}`), 'error');
    return;
  }

  let saved = res.data.product;

  if (pendingPhoto) {
    label.textContent = t('p.photoUploading');
    const upload = await uploadPhoto(saved.id);
    if (upload.ok) saved = upload.data.product;
    else toast(t(`err.${upload.data?.error || 'upload_failed'}`), 'error');
  } else if (photoCleared && editing?.image) {
    const cleared = await api(`/api/admin/products/${saved.id}/image`, { method: 'DELETE', token });
    if (cleared.ok) saved = cleared.data.product;
  }

  saveBtn.disabled = false;
  label.textContent = t('p.saveProduct');

  const index = products.findIndex((p) => p.id === saved.id);
  if (index >= 0) products[index] = saved;
  else products.push(saved);

  renderProducts();
  dialog.close();
  toast(t(editing ? 'p.updated' : 'p.created'));
});

/* ---------------------------- Réglages --------------------------- */

const settingsForm = document.getElementById('settings-form');
/** Réglages chargés depuis le serveur (null tant qu'ils ne le sont pas). */
let settings = null;

function renderSettings() {
  if (!settings) return;
  settingsForm.elements.delivery.value = settings.delivery;
  settingsForm.elements.freeDeliveryFrom.value = settings.freeDeliveryFrom;
  settingsForm.elements.alwaysFree.checked = Boolean(settings.alwaysFree);
  settingsForm.elements.announcementActive.checked = Boolean(settings.announcementActive);
  settingsForm.elements.announcementTitle.value = settings.announcementTitle || '';
  settingsForm.elements.announcementBody.value = settings.announcementBody || '';
  toggleSettingsFields();
}

/** Le prix et le seuil ne servent plus quand la livraison est toujours offerte. */
function toggleSettingsFields() {
  const alwaysFree = settingsForm.elements.alwaysFree.checked;
  settingsForm.elements.delivery.disabled = alwaysFree;
  settingsForm.elements.freeDeliveryFrom.disabled = alwaysFree;
}

settingsForm.addEventListener('input', () => {
  toggleSettingsFields();
});

function clearSettingsErrors() {
  for (const wrapper of settingsForm.querySelectorAll('.has-error')) {
    wrapper.classList.remove('has-error');
    wrapper.querySelector('[data-error-for]').textContent = '';
  }
}

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearSettingsErrors();

  const saveBtn = document.getElementById('settings-save');
  const label = saveBtn.querySelector('span:last-child');
  saveBtn.disabled = true;
  label.textContent = t('p.saving');

  const res = await api('/api/admin/settings', {
    method: 'PATCH',
    token,
    body: {
      delivery: Number(settingsForm.elements.delivery.value),
      freeDeliveryFrom: Number(settingsForm.elements.freeDeliveryFrom.value),
      alwaysFree: settingsForm.elements.alwaysFree.checked,
      announcementActive: settingsForm.elements.announcementActive.checked,
      announcementTitle: settingsForm.elements.announcementTitle.value,
      announcementBody: settingsForm.elements.announcementBody.value,
    },
  });

  saveBtn.disabled = false;
  label.textContent = t('admin.save');

  if (res.status === 401) return requireLogin();

  if (!res.ok) {
    const code = res.data?.error || 'network';
    const wrapper = res.data?.field && settingsForm.querySelector(`[data-field="${res.data.field}"]`);
    if (wrapper) {
      wrapper.classList.add('has-error');
      wrapper.querySelector('[data-error-for]').textContent = t(`err.${code}`);
      wrapper.querySelector('input')?.focus();
    }
    return toast(t(`err.${code}`), 'error');
  }

  settings = res.data.settings;
  // La boutique lit les mêmes valeurs : on garde l'affichage des commandes juste.
  if (config) {
    config.delivery = settings.delivery;
    config.freeDeliveryFrom = settings.freeDeliveryFrom;
    config.deliveryAlwaysFree = settings.alwaysFree;
  }
  renderSettings();
  toast(t('admin.saved'));
});

async function loadSettings() {
  const res = await api('/api/admin/settings', { token });
  if (res.status === 401) return requireLogin();
  if (!res.ok) return toast(t('err.network'), 'error');
  settings = res.data.settings;
  renderSettings();
}

/* ---------------------------- Offres ----------------------------- */

const promoBody = document.getElementById('promotions-body');
const promoDialog = document.getElementById('promo-dialog');
const promoForm = document.getElementById('promo-form');
const promoPreview = document.getElementById('promo-preview');

let promotions = [];
/** Listes de référence renvoyées avec les offres. */
let promoTriggers = ['always'];
let promoRewards = ['percent'];
let promoScopes = ['product', 'cart'];
/** Produits proposés dans les listes déroulantes de la fiche offre. */
let promoProducts = [];
/** Offre en cours d'édition (null = création). */
let editingPromo = null;

function renderPromotions() {
  if (!promotions.length) {
    promoBody.innerHTML = `<tr><td colspan="4"><div class="empty-state">${icon('tag')}
      <p>${esc(t('promo.empty'))}</p></div></td></tr>`;
    return;
  }

  promoBody.innerHTML = promotions
    .map(
      (promo) => `
      <tr data-promo="${promo.id}">
        <td><strong>${esc(promo.title)}</strong></td>
        <td><small class="muted">${esc(describePromotion(promo))}</small></td>
        <td>
          <label class="switch">
            <input type="checkbox" data-promo-active ${promo.active ? 'checked' : ''}>
            <span class="visually-hidden">${esc(t('promo.colActive'))}</span>
          </label>
        </td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn btn--sm btn--ghost" data-promo-edit>${esc(t('p.edit'))}</button>
            <button type="button" class="btn btn--sm btn--danger" data-promo-delete>${esc(t('p.delete'))}</button>
          </div>
        </td>
      </tr>`
    )
    .join('');
}

promoBody.addEventListener('click', async (event) => {
  const row = event.target.closest('[data-promo]');
  if (!row) return;
  const id = Number(row.dataset.promo);
  const promo = promotions.find((x) => x.id === id);
  if (!promo) return;

  if (event.target.closest('[data-promo-edit]')) return openPromoDialog(promo);

  if (event.target.closest('[data-promo-delete]')) {
    if (!confirm(t('promo.deleteConfirm', { title: promo.title }))) return;
    const res = await api(`/api/admin/promotions/${id}`, { method: 'DELETE', token });
    if (res.status === 401) return requireLogin();
    if (!res.ok) return toast(t(`err.${res.data?.error || 'network'}`), 'error');
    promotions = promotions.filter((x) => x.id !== id);
    renderPromotions();
    toast(t('promo.deleted'));
  }
});

// Bascule active/inactive directement depuis la liste.
promoBody.addEventListener('change', async (event) => {
  const toggle = event.target.closest('[data-promo-active]');
  if (!toggle) return;
  const id = Number(toggle.closest('[data-promo]').dataset.promo);

  const res = await api(`/api/admin/promotions/${id}`, {
    method: 'PATCH', token, body: { active: toggle.checked },
  });
  if (res.status === 401) return requireLogin();
  if (!res.ok) {
    toggle.checked = !toggle.checked;
    return toast(t(`err.${res.data?.error || 'network'}`), 'error');
  }

  const index = promotions.findIndex((x) => x.id === id);
  if (index >= 0) promotions[index] = res.data.promotion;
  toast(t('admin.saved'));
});

/** Remplit une liste déroulante de produits. */
function fillProductSelect(id, selected) {
  const select = document.getElementById(id);
  select.innerHTML = promoProducts
    .map((p) => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${esc(p.name)}</option>`)
    .join('');
}

/** N'affiche que les champs utiles au couple déclencheur / récompense choisi. */
function togglePromoFields() {
  const trigger = promoForm.elements.triggerType.value;
  const reward = promoForm.elements.rewardType.value;
  // La livraison offerte ne vise aucun produit : la portée n'a plus de sens.
  const scope = reward === 'free_delivery' ? '' : promoForm.elements.rewardScope.value;

  for (const field of promoForm.querySelectorAll('[data-when-trigger], [data-when-reward], [data-when-scope]')) {
    const wantsTrigger = field.dataset.whenTrigger;
    const wantsReward = field.dataset.whenReward;
    const wantsScope = field.dataset.whenScope;
    const visible =
      (!wantsTrigger || wantsTrigger.split(' ').includes(trigger)) &&
      (!wantsReward || wantsReward.split(' ').includes(reward)) &&
      (!wantsScope || wantsScope.split(' ').includes(scope));
    field.hidden = !visible;
  }
  renderPromoPreview();
}

/** Phrase que verra le client, mise à jour à chaque frappe. */
function renderPromoPreview() {
  promoPreview.innerHTML = `${icon('tag')}<span>${esc(describePromotion(promoFromForm()))}</span>`;
}

/** Lit le formulaire sous la forme attendue par l'API et par describePromotion. */
function promoFromForm() {
  const f = promoForm.elements;
  const triggerProductId = Number(f.triggerProductId.value) || null;
  const rewardProductId = Number(f.rewardProductId.value) || null;
  const find = (id) => promoProducts.find((p) => p.id === id) || null;

  return {
    title: f.title.value.trim(),
    active: f.active.checked,
    triggerType: f.triggerType.value,
    triggerProductId,
    triggerQty: Number(f.triggerQty.value) || 0,
    triggerAmount: Number(f.triggerAmount.value) || 0,
    rewardType: f.rewardType.value,
    rewardScope: f.rewardScope.value,
    rewardProductId,
    rewardPercent: Number(f.rewardPercent.value) || 0,
    rewardAmount: Number(f.rewardAmount.value) || 0,
    rewardMaxQty: Number(f.rewardMaxQty.value) || 0,
    triggerProduct: find(triggerProductId),
    rewardProduct: find(rewardProductId),
  };
}

function fillPromoSelect(id, values, labelKey, selected) {
  const select = document.getElementById(id);
  select.innerHTML = values
    .map((v) => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(t(`${labelKey}.${v}`))}</option>`)
    .join('');
}

function openPromoDialog(promo = null) {
  editingPromo = promo;
  clearPromoErrors();

  fillPromoSelect('promo-trigger-type', promoTriggers, 'promo.trigger', promo?.triggerType || 'always');
  fillPromoSelect('promo-reward-type', promoRewards, 'promo.reward', promo?.rewardType || 'percent');
  fillPromoSelect('promo-reward-scope', promoScopes, 'promo.scope', promo?.rewardScope || 'product');
  fillProductSelect('promo-trigger-product', promo?.triggerProductId ?? promoProducts[0]?.id);
  fillProductSelect('promo-reward-product', promo?.rewardProductId ?? promoProducts[0]?.id);

  document.getElementById('promo-dialog-title').textContent = t(promo ? 'promo.edit' : 'promo.new');
  const f = promoForm.elements;
  f.title.value = promo?.title || '';
  f.triggerQty.value = promo?.triggerQty || 1;
  f.triggerAmount.value = promo?.triggerAmount ?? 50000;
  f.rewardPercent.value = promo?.rewardPercent || 10;
  f.rewardAmount.value = promo?.rewardAmount || 1000;
  f.rewardMaxQty.value = promo?.rewardMaxQty || 0;
  f.active.checked = promo ? Boolean(promo.active) : true;

  togglePromoFields();
  promoDialog.showModal();
  f.title.focus();
}

function clearPromoErrors() {
  for (const wrapper of promoForm.querySelectorAll('.has-error')) {
    wrapper.classList.remove('has-error');
    wrapper.querySelector('[data-error-for]').textContent = '';
  }
}

promoForm.addEventListener('input', togglePromoFields);
promoForm.addEventListener('change', togglePromoFields);
document.getElementById('add-promotion').addEventListener('click', () => {
  if (!promoProducts.length) return toast(t('promo.needProducts'), 'error');
  openPromoDialog();
});
document.getElementById('promo-close').addEventListener('click', () => promoDialog.close());
document.getElementById('promo-cancel').addEventListener('click', () => promoDialog.close());

promoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearPromoErrors();

  const saveBtn = document.getElementById('promo-save');
  const label = saveBtn.querySelector('span:last-child');
  saveBtn.disabled = true;
  label.textContent = t('p.saving');

  const { triggerProduct, rewardProduct, ...payload } = promoFromForm();
  const res = editingPromo
    ? await api(`/api/admin/promotions/${editingPromo.id}`, { method: 'PATCH', token, body: payload })
    : await api('/api/admin/promotions', { method: 'POST', token, body: payload });

  saveBtn.disabled = false;
  label.textContent = t('promo.save');

  if (res.status === 401) return requireLogin();

  if (!res.ok) {
    const code = res.data?.error || 'network';
    const wrapper = res.data?.field && promoForm.querySelector(`[data-field="${res.data.field}"]`);
    if (wrapper) {
      wrapper.classList.add('has-error');
      wrapper.querySelector('[data-error-for]').textContent = t(`err.${code}`);
      wrapper.querySelector('input, select')?.focus();
    }
    return toast(t(`err.${code}`), 'error');
  }

  const saved = res.data.promotion;
  const index = promotions.findIndex((x) => x.id === saved.id);
  if (index >= 0) promotions[index] = saved;
  else promotions.push(saved);

  renderPromotions();
  promoDialog.close();
  toast(t(editingPromo ? 'promo.updated' : 'promo.created'));
});

async function loadPromotions() {
  const res = await api('/api/admin/promotions', { token });
  if (res.status === 401) return requireLogin();
  if (!res.ok) return toast(t('err.network'), 'error');

  promotions = res.data.promotions;
  promoTriggers = res.data.triggers || promoTriggers;
  promoRewards = res.data.rewards || promoRewards;
  promoScopes = res.data.scopes || promoScopes;
  promoProducts = res.data.products || [];
  renderPromotions();
}

/* ----------------------------- Onglets --------------------------- */

for (const tab of document.querySelectorAll('[data-tab]')) {
  tab.addEventListener('click', () => {
    for (const other of document.querySelectorAll('[data-tab]')) {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      document.getElementById(`panel-${other.dataset.tab}`).hidden = !selected;
    }
    if (tab.dataset.tab === 'products') loadProducts();
    if (tab.dataset.tab === 'promotions') loadPromotions();
    if (tab.dataset.tab === 'settings') loadSettings();
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
  productUnits = res.data.units || productUnits;
  productCategories = res.data.categories || productCategories;
  productIcons = res.data.icons || productIcons;
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
  if (promotions.length) renderPromotions();
  if (settings) renderSettings();
});

if (token) enterDashboard();
