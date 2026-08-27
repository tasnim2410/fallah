/**
 * Moteur de remises, partagé par le serveur et la boutique : les deux calculent
 * exactement le même montant, au millime près. Le serveur reste seul juge (il
 * recalcule tout depuis la base au moment de la commande) ; la boutique s'en
 * sert uniquement pour montrer au client ce qu'il va payer.
 *
 * Une promotion = une condition (« déclencheur ») + un avantage (« récompense ») :
 *   always   → toutes les commandes
 *   contains → le panier contient {triggerProductId}, quelle que soit la quantité
 *   product  → le panier contient au moins {triggerQty} de {triggerProductId}
 *   subtotal → le sous-total atteint {triggerAmount}
 * puis :
 *   percent        → X % sur un ou plusieurs produits, ou sur toutes les lignes
 *   amount         → montant fixe sur un ou plusieurs produits, ou sur le total
 *   free_delivery  → livraison offerte
 *
 * Le produit qui déclenche et ceux qui sont remisés sont indépendants : c'est
 * ce qui permet « 5 kg de tomates achetés → 20 % sur l'ail et les oignons ».
 */

export const TRIGGER_TYPES = ['always', 'contains', 'product', 'subtotal'];
export const REWARD_TYPES = ['percent', 'amount', 'free_delivery'];
export const REWARD_SCOPES = ['product', 'cart'];

/** Quantité totale d'un produit dans le panier. */
function qtyOf(lines, productId) {
  return lines.reduce((sum, line) => (line.productId === productId ? sum + line.qty : sum), 0);
}

/** La condition de la promotion est-elle remplie par ce panier ? */
export function promotionApplies(promo, lines, subtotal) {
  if (!promo.active) return false;
  // « Livraison offerte si la commande contient des dattes » : aucune quantité exigée.
  if (promo.triggerType === 'contains') {
    if (!promo.triggerProductId) return false;
    return qtyOf(lines, promo.triggerProductId) > 0;
  }
  if (promo.triggerType === 'product') {
    if (!promo.triggerProductId || promo.triggerQty <= 0) return false;
    return qtyOf(lines, promo.triggerProductId) >= promo.triggerQty;
  }
  if (promo.triggerType === 'subtotal') return subtotal >= promo.triggerAmount;
  return true;
}

/** Remise apportée par une promotion sur une ligne précise (0 si aucune). */
function lineReward(promo, line) {
  if (promo.rewardType === 'percent') {
    // Le vendeur peut plafonner la quantité remisée (0 = tout le panier).
    const covered = promo.rewardMaxQty > 0 ? Math.min(line.qty, promo.rewardMaxQty) : line.qty;
    const base = Math.min(line.lineTotal, Math.round(line.unitPrice * covered));
    return Math.round((base * promo.rewardPercent) / 100);
  }
  if (promo.rewardType === 'amount') return Math.min(line.lineTotal, promo.rewardAmount);
  return 0;
}

/**
 * Applique les promotions à un panier.
 * @param {Array<{productId:number, qty:number, unitPrice:number, lineTotal:number}>} lines
 * @param {Array<object>} promotions
 * @returns {{subtotal:number, discount:number, freeDelivery:boolean,
 *            applied:Array<{id:number, title:string, amount:number, freeDelivery:boolean}>}}
 */
export function computeDiscounts(lines, promotions) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const active = (promotions || []).filter((promo) => promotionApplies(promo, lines, subtotal));

  /* Une seule remise par ligne — la plus avantageuse pour le client. Deux
   * promotions ne se cumulent jamais sur le même produit : le total reste
   * prévisible, et le vendeur ne peut pas brader un produit par accident. */
  const bestByLine = new Map();
  const cartAmounts = [];
  let freeDeliveryPromo = null;

  for (const promo of active) {
    if (promo.rewardType === 'free_delivery') {
      freeDeliveryPromo ??= promo;
      continue;
    }
    if (promo.rewardType === 'amount' && promo.rewardScope === 'cart') {
      cartAmounts.push(promo);
      continue;
    }

    const rewarded = new Set(promo.rewardProductIds || []);
    const targets = promo.rewardScope === 'cart'
      ? lines
      : lines.filter((line) => rewarded.has(line.productId));

    for (const line of targets) {
      const amount = lineReward(promo, line);
      if (amount <= 0) continue;
      const current = bestByLine.get(line.productId);
      if (!current || amount > current.amount) bestByLine.set(line.productId, { amount, promo });
    }
  }

  /** Montant cumulé par promotion, pour l'afficher ligne par ligne. */
  const totals = new Map();
  let discount = 0;

  for (const { amount, promo } of bestByLine.values()) {
    discount += amount;
    totals.set(promo.id, (totals.get(promo.id) || 0) + amount);
  }

  // Remises sur le total : après les lignes, sans jamais dépasser le sous-total.
  for (const promo of cartAmounts) {
    const amount = Math.min(promo.rewardAmount, subtotal - discount);
    if (amount <= 0) continue;
    discount += amount;
    totals.set(promo.id, (totals.get(promo.id) || 0) + amount);
  }

  const applied = active
    .filter((promo) => totals.has(promo.id) || promo === freeDeliveryPromo)
    .map((promo) => ({
      id: promo.id,
      title: promo.title,
      amount: totals.get(promo.id) || 0,
      freeDelivery: promo === freeDeliveryPromo,
    }));

  return { subtotal, discount, freeDelivery: Boolean(freeDeliveryPromo), applied };
}

/**
 * Frais de livraison finaux : les réglages boutique, qu'une promotion peut
 * annuler. Le seuil de gratuité se juge sur le sous-total avant remise, pour
 * ne pas retirer au client une livraison offerte qu'il vient de gagner.
 */
export function resolveDelivery(subtotal, shop, freeDelivery) {
  if (shop.alwaysFree || freeDelivery) return 0;
  return subtotal >= shop.freeDeliveryFrom ? 0 : shop.delivery;
}
