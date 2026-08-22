import { pathToFileURL } from 'node:url';
import { db } from './db.js';

/**
 * Catalogue de départ. Les prix sont en millimes (1 DT = 1000 millimes).
 * Le vendeur peut ensuite modifier prix / stock / disponibilité depuis /admin.html.
 */
const PRODUCTS = [
  // --- Légumes ---
  {
    slug: 'tomate', name: 'طماطم',
    description: 'طماطم حمراء ناضجة، قُطفت صباح اليوم.',
    category: 'vegetables', icon: 'tomato', unit: 'kg', price_millimes: 2500,
    step_qty: 0.5, min_qty: 1, max_qty: 20, stock_qty: 120,
    farmer: 'عمّ صالح', region: 'قليبية، نابل', harvested: 'اليوم', is_bio: 1, sort_order: 10,
  },
  {
    slug: 'pomme-de-terre', name: 'بطاطس',
    description: 'بطاطس محلية صالحة للقلي والطهي.',
    category: 'vegetables', icon: 'potato', unit: 'kg', price_millimes: 1800,
    step_qty: 1, min_qty: 2, max_qty: 40, stock_qty: 300,
    farmer: 'عائلة بن عمار', region: 'سيدي بوزيد', harvested: 'أمس', is_bio: 0, sort_order: 20,
  },
  {
    slug: 'oignon', name: 'بصل',
    description: 'بصل محلي مجفّف طبيعيًا.',
    category: 'vegetables', icon: 'onion', unit: 'kg', price_millimes: 2200,
    step_qty: 0.5, min_qty: 1, max_qty: 25, stock_qty: 180,
    farmer: 'عائلة بن عمار', region: 'سيدي بوزيد', harvested: 'هذا الأسبوع', is_bio: 0, sort_order: 30,
  },
  {
    slug: 'carotte', name: 'جزر',
    description: 'جزر حلو المذاق، مغسول وجاهز للطهي.',
    category: 'vegetables', icon: 'carrot', unit: 'kg', price_millimes: 1900,
    step_qty: 0.5, min_qty: 1, max_qty: 20, stock_qty: 140,
    farmer: 'عمّ صالح', region: 'قليبية، نابل', harvested: 'اليوم', is_bio: 1, sort_order: 40,
  },
  {
    slug: 'poivron', name: 'فلفل',
    description: 'فلفل أخضر حلو، للسلطة أو الشيّ.',
    category: 'vegetables', icon: 'pepper', unit: 'kg', price_millimes: 3200,
    step_qty: 0.5, min_qty: 1, max_qty: 15, stock_qty: 90,
    farmer: 'عمّ صالح', region: 'قليبية، نابل', harvested: 'اليوم', is_bio: 1, sort_order: 50,
  },
  {
    slug: 'courgette', name: 'كوسة',
    description: 'كوسة صغيرة طريّة.',
    category: 'vegetables', icon: 'zucchini', unit: 'kg', price_millimes: 2400,
    step_qty: 0.5, min_qty: 1, max_qty: 15, stock_qty: 70,
    farmer: 'منية الحاجة', region: 'جمال، المنستير', harvested: 'اليوم', is_bio: 0, sort_order: 60,
  },
  {
    slug: 'salade', name: 'خس',
    description: 'رأس خسّ طازج قُطف اليوم.',
    category: 'vegetables', icon: 'lettuce', unit: 'piece', price_millimes: 1200,
    step_qty: 1, min_qty: 1, max_qty: 10, stock_qty: 60,
    farmer: 'منية الحاجة', region: 'جمال، المنستير', harvested: 'اليوم', is_bio: 1, sort_order: 70,
  },
  {
    slug: 'persil', name: 'بقدونس',
    description: 'حزمة بقدونس عطرية.',
    category: 'vegetables', icon: 'herb', unit: 'bunch', price_millimes: 800,
    step_qty: 1, min_qty: 1, max_qty: 10, stock_qty: 50,
    farmer: 'منية الحاجة', region: 'جمال، المنستير', harvested: 'اليوم', is_bio: 1, sort_order: 80,
  },

  // --- Fruits ---
  {
    slug: 'orange-maltaise', name: 'برتقال مالطي',
    description: 'برتقال مالطي حلو المذاق، مثالي للعصير.',
    category: 'fruits', icon: 'orange', unit: 'kg', price_millimes: 2800,
    step_qty: 1, min_qty: 2, max_qty: 30, stock_qty: 200,
    farmer: 'مزرعة الوادي', region: 'منزل بوزلفة، نابل', harvested: 'أمس', is_bio: 0, sort_order: 90,
  },
  {
    slug: 'citron', name: 'ليمون',
    description: 'ليمون محلي غزير العصير.',
    category: 'fruits', icon: 'lemon', unit: 'kg', price_millimes: 3500,
    step_qty: 0.5, min_qty: 1, max_qty: 15, stock_qty: 80,
    farmer: 'مزرعة الوادي', region: 'منزل بوزلفة، نابل', harvested: 'أمس', is_bio: 1, sort_order: 100,
  },
  {
    slug: 'pomme', name: 'تفاح',
    description: 'تفاح جبلي مقرمش.',
    category: 'fruits', icon: 'apple', unit: 'kg', price_millimes: 4200,
    step_qty: 0.5, min_qty: 1, max_qty: 20, stock_qty: 110,
    farmer: 'مزرعة الجبل', region: 'سبيبة، القصرين', harvested: 'هذا الأسبوع', is_bio: 0, sort_order: 110,
  },
  {
    slug: 'dattes-deglet-nour', name: 'تمر دقلة نور',
    description: 'دقلة نور من الدرجة الأولى، عذوق طبيعية.',
    category: 'fruits', icon: 'dates', unit: 'kg', price_millimes: 12000,
    step_qty: 0.5, min_qty: 0.5, max_qty: 10, stock_qty: 60,
    farmer: 'واحة الحامة', region: 'قبلي', harvested: 'هذا الموسم', is_bio: 1, sort_order: 120,
  },

  // --- Épicerie de la ferme ---
  {
    slug: 'huile-olive', name: 'زيت زيتون بكر ممتاز',
    description: 'عُصر على البارد، نسبة حموضة أقلّ من 0.5%.',
    category: 'pantry', icon: 'oil', unit: 'L', price_millimes: 22000,
    step_qty: 1, min_qty: 1, max_qty: 20, stock_qty: 150,
    farmer: 'معصرة بن يوسف', region: 'زغوان', harvested: 'من عصر هذا الموسم', is_bio: 1, sort_order: 130,
  },
  {
    slug: 'miel-montagne', name: 'عسل جبلي',
    description: 'عسل طبيعي غير مُسخَّن، برطمان سعة 1 كغ.',
    category: 'pantry', icon: 'honey', unit: 'jar', price_millimes: 45000,
    step_qty: 1, min_qty: 1, max_qty: 6, stock_qty: 25,
    farmer: 'منحل عين دراهم', region: 'جندوبة', harvested: 'قطاف الربيع', is_bio: 1, sort_order: 140,
  },
  {
    slug: 'harissa', name: 'هريسة تقليدية',
    description: 'هريسة محضّرة منزليًا، برطمان سعة 500 غ.',
    category: 'pantry', icon: 'pepper', unit: 'jar', price_millimes: 9000,
    step_qty: 1, min_qty: 1, max_qty: 10, stock_qty: 40,
    farmer: 'بيت خالتي فطومة', region: 'نابل', harvested: 'حُضّرت هذا الشهر', is_bio: 0, sort_order: 150,
  },

  // --- Produits d'élevage ---
  {
    slug: 'oeufs-fermiers', name: 'بيض بلدي',
    description: 'بيض دجاج مُربّى في الهواء الطلق، طبق من 12 بيضة.',
    category: 'animal', icon: 'eggs', unit: 'dozen', price_millimes: 6500,
    step_qty: 1, min_qty: 1, max_qty: 10, stock_qty: 45,
    farmer: 'مزرعة الهناء', region: 'مرناق، بن عروس', harvested: 'اليوم', is_bio: 1, sort_order: 160,
  },
  {
    slug: 'lait-frais', name: 'حليب طازج',
    description: 'حليب بقري طازج غير مُعالَج، يُغلى قبل الاستعمال.',
    category: 'animal', icon: 'milk', unit: 'L', price_millimes: 2500,
    step_qty: 1, min_qty: 1, max_qty: 10, stock_qty: 40,
    farmer: 'مزرعة الهناء', region: 'مرناق، بن عروس', harvested: 'من حليب الصباح', is_bio: 0, sort_order: 170,
  },
  {
    slug: 'poulet-fermier', name: 'دجاج بلدي',
    description: 'دجاج بلدي منظّف، يُذبح يوم الطلب.',
    category: 'animal', icon: 'chicken', unit: 'kg', price_millimes: 14000,
    step_qty: 0.5, min_qty: 1, max_qty: 10, stock_qty: 30,
    farmer: 'مزرعة الهناء', region: 'مرناق، بن عروس', harvested: 'يوم الطلب', is_bio: 1, sort_order: 180,
  },
];

const COLUMNS = [
  'slug', 'name', 'description', 'category', 'icon', 'unit',
  'price_millimes', 'step_qty', 'min_qty', 'max_qty', 'stock_qty',
  'farmer', 'region', 'harvested',
  'is_bio', 'sort_order',
];

/**
 * Insère les produits manquants. Les produits déjà en base ne sont pas écrasés
 * (le vendeur a pu changer les prix), sauf si `reset` est demandé.
 */
export function seedProducts({ reset = false } = {}) {
  if (reset) db.exec('DELETE FROM products');

  const insert = db.prepare(
    `INSERT OR IGNORE INTO products (${COLUMNS.join(', ')})
     VALUES (${COLUMNS.map(() => '?').join(', ')})`
  );

  let added = 0;
  for (const p of PRODUCTS) {
    const result = insert.run(...COLUMNS.map((c) => p[c] ?? 0));
    added += Number(result.changes);
  }
  return added;
}

// `npm run seed` : réinitialise le catalogue.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const reset = process.argv.includes('--reset');
  const added = seedProducts({ reset });
  console.log(`${added} produit(s) ${reset ? 'rechargé(s)' : 'ajouté(s)'} au catalogue.`);
}
