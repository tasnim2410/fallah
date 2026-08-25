/**
 * Bloc « sous-total / remises / livraison / total ».
 * La boutique et la page de commande l'utilisent toutes les deux, à partir du
 * même récapitulatif calculé par cartSummary() : le client voit exactement le
 * même détail avant et après avoir cliqué sur « متابعة الطلب ».
 */

import { t, money } from './i18n.js';
import { esc } from './app.js';

export function totalsMarkup(summary, config) {
  /* Le rappel « encore X pour la livraison offerte » n'a de sens que si la
   * livraison est encore payante — sinon le client l'a déjà gagnée. */
  const missing =
    config && !config.deliveryAlwaysFree && !summary.freeDelivery && summary.delivery > 0
      ? config.freeDeliveryFrom - summary.subtotal
      : 0;

  const discountRows = summary.discounts
    .map(
      (d) => `<div class="totals__row totals__row--discount">
        <span>${esc(d.title)}</span>
        <span>${d.freeDelivery ? esc(t('cart.deliveryFree')) : `−${esc(money(d.amount))}`}</span>
      </div>`
    )
    .join('');

  return `
    <div class="totals__row"><span>${esc(t('cart.subtotal'))}</span><span>${esc(money(summary.subtotal))}</span></div>
    ${discountRows}
    <div class="totals__row"><span>${esc(t('cart.delivery'))}</span>
      <span>${summary.delivery === 0 ? esc(t('cart.deliveryFree')) : esc(money(summary.delivery))}</span></div>
    ${missing > 0 ? `<div class="totals__row totals__row--free"><span>${esc(t('cart.freeHint', { amount: money(missing) }))}</span></div>` : ''}
    <div class="totals__row totals__row--grand"><span>${esc(t('cart.total'))}</span>
      <span>${esc(money(summary.total))}</span></div>
    ${summary.discount > 0
      ? `<div class="totals__row totals__row--saved"><span>${esc(t('cart.saved', { amount: money(summary.discount) }))}</span></div>`
      : ''}`;
}
