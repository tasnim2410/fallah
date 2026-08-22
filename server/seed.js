import { pathToFileURL } from 'node:url';
import { db } from './db.js';

/**
 * Catalogue de départ. Les prix sont en millimes (1 DT = 1000 millimes).
 * Le vendeur peut ensuite modifier prix / stock / disponibilité depuis /admin.html.
 */
const PRODUCTS = [
  // --- Légumes ---
  {
    slug: 'tomate', name_ar: 'طماطم', name_fr: 'Tomates',
    desc_ar: 'طماطم حمراء ناضجة، مقطوفة صباح اليوم.', desc_fr: 'Tomates rouges mûries au soleil, cueillies ce matin.',
    category: 'vegetables', icon: 'tomato', unit: 'kg', price_millimes: 2500,
    step_qty: 0.5, min_qty: 1, max_qty: 20, stock_qty: 120,
    farmer_ar: 'عم صالح', farmer_fr: 'Am Saleh', region_ar: 'قبلاط، نابل', region_fr: 'Kelibia, Nabeul',
    harvested_ar: 'اليوم', harvested_fr: "Aujourd'hui", is_bio: 1, sort_order: 10,
  },
  {
    slug: 'pomme-de-terre', name_ar: 'بطاطا', name_fr: 'Pommes de terre',
    desc_ar: 'بطاطا بلدية صالحة للقلي والطهي.', desc_fr: 'Pommes de terre de saison, bonnes à frire et à cuire.',
    category: 'vegetables', icon: 'potato', unit: 'kg', price_millimes: 1800,
    step_qty: 1, min_qty: 2, max_qty: 40, stock_qty: 300,
    farmer_ar: 'عائلة بن عمار', farmer_fr: 'Famille Ben Ammar', region_ar: 'سيدي بوزيد', region_fr: 'Sidi Bouzid',
    harvested_ar: 'أمس', harvested_fr: 'Hier', is_bio: 0, sort_order: 20,
  },
  {
    slug: 'oignon', name_ar: 'بصل', name_fr: 'Oignons',
    desc_ar: 'بصل بلدي مجفّف طبيعياً.', desc_fr: 'Oignons du terroir, séchés naturellement.',
    category: 'vegetables', icon: 'onion', unit: 'kg', price_millimes: 2200,
    step_qty: 0.5, min_qty: 1, max_qty: 25, stock_qty: 180,
    farmer_ar: 'عائلة بن عمار', farmer_fr: 'Famille Ben Ammar', region_ar: 'سيدي بوزيد', region_fr: 'Sidi Bouzid',
    harvested_ar: 'هذا الأسبوع', harvested_fr: 'Cette semaine', is_bio: 0, sort_order: 30,
  },
  {
    slug: 'carotte', name_ar: 'سفنارية', name_fr: 'Carottes',
    desc_ar: 'سفنارية حلوة، مغسولة وجاهزة.', desc_fr: 'Carottes sucrées, lavées et prêtes à cuisiner.',
    category: 'vegetables', icon: 'carrot', unit: 'kg', price_millimes: 1900,
    step_qty: 0.5, min_qty: 1, max_qty: 20, stock_qty: 140,
    farmer_ar: 'عم صالح', farmer_fr: 'Am Saleh', region_ar: 'قبلاط، نابل', region_fr: 'Kelibia, Nabeul',
    harvested_ar: 'اليوم', harvested_fr: "Aujourd'hui", is_bio: 1, sort_order: 40,
  },
  {
    slug: 'poivron', name_ar: 'فلفل', name_fr: 'Poivrons',
    desc_ar: 'فلفل أخضر حلو للسلطة والمشوي.', desc_fr: 'Poivrons verts doux, pour salade ou grillade.',
    category: 'vegetables', icon: 'pepper', unit: 'kg', price_millimes: 3200,
    step_qty: 0.5, min_qty: 1, max_qty: 15, stock_qty: 90,
    farmer_ar: 'عم صالح', farmer_fr: 'Am Saleh', region_ar: 'قبلاط، نابل', region_fr: 'Kelibia, Nabeul',
    harvested_ar: 'اليوم', harvested_fr: "Aujourd'hui", is_bio: 1, sort_order: 50,
  },
  {
    slug: 'courgette', name_ar: 'قرعة خضراء', name_fr: 'Courgettes',
    desc_ar: 'قرعة خضراء صغيرة طرية.', desc_fr: 'Petites courgettes tendres.',
    category: 'vegetables', icon: 'zucchini', unit: 'kg', price_millimes: 2400,
    step_qty: 0.5, min_qty: 1, max_qty: 15, stock_qty: 70,
    farmer_ar: 'منية الحاجة', farmer_fr: 'Mounia El Hajja', region_ar: 'جمال، المنستير', region_fr: 'Jemmal, Monastir',
    harvested_ar: 'اليوم', harvested_fr: "Aujourd'hui", is_bio: 0, sort_order: 60,
  },
  {
    slug: 'salade', name_ar: 'خس', name_fr: 'Salade verte',
    desc_ar: 'رأس خس طازج مقطوف اليوم.', desc_fr: 'Belle tête de laitue cueillie du jour.',
    category: 'vegetables', icon: 'lettuce', unit: 'piece', price_millimes: 1200,
    step_qty: 1, min_qty: 1, max_qty: 10, stock_qty: 60,
    farmer_ar: 'منية الحاجة', farmer_fr: 'Mounia El Hajja', region_ar: 'جمال، المنستير', region_fr: 'Jemmal, Monastir',
    harvested_ar: 'اليوم', harvested_fr: "Aujourd'hui", is_bio: 1, sort_order: 70,
  },
  {
    slug: 'persil', name_ar: 'معدنوس', name_fr: 'Persil',
    desc_ar: 'حزمة معدنوس عطرة.', desc_fr: 'Botte de persil parfumé.',
    category: 'vegetables', icon: 'herb', unit: 'bunch', price_millimes: 800,
    step_qty: 1, min_qty: 1, max_qty: 10, stock_qty: 50,
    farmer_ar: 'منية الحاجة', farmer_fr: 'Mounia El Hajja', region_ar: 'جمال، المنستير', region_fr: 'Jemmal, Monastir',
    harvested_ar: 'اليوم', harvested_fr: "Aujourd'hui", is_bio: 1, sort_order: 80,
  },

  // --- Fruits ---
  {
    slug: 'orange-maltaise', name_ar: 'برتقال مالطي', name_fr: 'Oranges maltaises',
    desc_ar: 'مالطي كامل الحلاوة، مناسب للعصير.', desc_fr: 'Maltaises juteuses, parfaites pour le jus.',
    category: 'fruits', icon: 'orange', unit: 'kg', price_millimes: 2800,
    step_qty: 1, min_qty: 2, max_qty: 30, stock_qty: 200,
    farmer_ar: 'ضيعة الوادي', farmer_fr: 'Ferme El Oued', region_ar: 'منزل بوزلفة، نابل', region_fr: 'Menzel Bouzelfa, Nabeul',
    harvested_ar: 'أمس', harvested_fr: 'Hier', is_bio: 0, sort_order: 90,
  },
  {
    slug: 'citron', name_ar: 'قارص', name_fr: 'Citrons',
    desc_ar: 'قارص بلدي كثير العصير.', desc_fr: 'Citrons du pays, bien juteux.',
    category: 'fruits', icon: 'lemon', unit: 'kg', price_millimes: 3500,
    step_qty: 0.5, min_qty: 1, max_qty: 15, stock_qty: 80,
    farmer_ar: 'ضيعة الوادي', farmer_fr: 'Ferme El Oued', region_ar: 'منزل بوزلفة، نابل', region_fr: 'Menzel Bouzelfa, Nabeul',
    harvested_ar: 'أمس', harvested_fr: 'Hier', is_bio: 1, sort_order: 100,
  },
  {
    slug: 'pomme', name_ar: 'تفاح', name_fr: 'Pommes',
    desc_ar: 'تفاح جبلي مقرمش.', desc_fr: 'Pommes de montagne, bien croquantes.',
    category: 'fruits', icon: 'apple', unit: 'kg', price_millimes: 4200,
    step_qty: 0.5, min_qty: 1, max_qty: 20, stock_qty: 110,
    farmer_ar: 'ضيعة الجبل', farmer_fr: 'Ferme El Jebel', region_ar: 'سبيبة، القصرين', region_fr: 'Sbiba, Kasserine',
    harvested_ar: 'هذا الأسبوع', harvested_fr: 'Cette semaine', is_bio: 0, sort_order: 110,
  },
  {
    slug: 'dattes-deglet-nour', name_ar: 'تمر دقلة نور', name_fr: 'Dattes Deglet Nour',
    desc_ar: 'دقلة نور درجة أولى، عذوق طبيعية.', desc_fr: 'Deglet Nour premier choix, branchées.',
    category: 'fruits', icon: 'dates', unit: 'kg', price_millimes: 12000,
    step_qty: 0.5, min_qty: 0.5, max_qty: 10, stock_qty: 60,
    farmer_ar: 'واحة الحامة', farmer_fr: 'Oasis El Hamma', region_ar: 'قبلي', region_fr: 'Kébili',
    harvested_ar: 'هذا الموسم', harvested_fr: 'Cette saison', is_bio: 1, sort_order: 120,
  },

  // --- Épicerie de la ferme ---
  {
    slug: 'huile-olive', name_ar: 'زيت زيتون بكر ممتاز', name_fr: "Huile d'olive extra vierge",
    desc_ar: 'عصرة على البارد، حموضة أقل من 0.5%.', desc_fr: 'Première pression à froid, acidité < 0,5%.',
    category: 'pantry', icon: 'oil', unit: 'L', price_millimes: 22000,
    step_qty: 1, min_qty: 1, max_qty: 20, stock_qty: 150,
    farmer_ar: 'معصرة بن يوسف', farmer_fr: 'Huilerie Ben Youssef', region_ar: 'زغوان', region_fr: 'Zaghouan',
    harvested_ar: 'عصرة هذا الموسم', harvested_fr: 'Pressée cette saison', is_bio: 1, sort_order: 130,
  },
  {
    slug: 'miel-montagne', name_ar: 'عسل جبلي', name_fr: 'Miel de montagne',
    desc_ar: 'عسل طبيعي غير مسخّن، قارورة 1 كغ.', desc_fr: 'Miel naturel non chauffé, pot de 1 kg.',
    category: 'pantry', icon: 'honey', unit: 'jar', price_millimes: 45000,
    step_qty: 1, min_qty: 1, max_qty: 6, stock_qty: 25,
    farmer_ar: 'نحّالة عين دراهم', farmer_fr: 'Rucher Ain Draham', region_ar: 'جندوبة', region_fr: 'Jendouba',
    harvested_ar: 'جني الربيع', harvested_fr: 'Récolte de printemps', is_bio: 1, sort_order: 140,
  },
  {
    slug: 'harissa', name_ar: 'هريسة عربي', name_fr: 'Harissa artisanale',
    desc_ar: 'هريسة مطحونة في الدار، قارورة 500 غ.', desc_fr: 'Harissa pilée à la maison, pot de 500 g.',
    category: 'pantry', icon: 'pepper', unit: 'jar', price_millimes: 9000,
    step_qty: 1, min_qty: 1, max_qty: 10, stock_qty: 40,
    farmer_ar: 'دار خالتي فطومة', farmer_fr: 'Chez Khalti Fattouma', region_ar: 'نابل', region_fr: 'Nabeul',
    harvested_ar: 'محضّرة هذا الشهر', harvested_fr: 'Préparée ce mois-ci', is_bio: 0, sort_order: 150,
  },

  // --- Produits de la ferme (animal) ---
  {
    slug: 'oeufs-fermiers', name_ar: 'بيض بلدي', name_fr: 'Œufs fermiers',
    desc_ar: 'بيض دجاج حر، طبق 12 بيضة.', desc_fr: 'Œufs de poules élevées en plein air, plateau de 12.',
    category: 'animal', icon: 'eggs', unit: 'dozen', price_millimes: 6500,
    step_qty: 1, min_qty: 1, max_qty: 10, stock_qty: 45,
    farmer_ar: 'ضيعة الهناء', farmer_fr: 'Ferme El Hana', region_ar: 'مرناق، بن عروس', region_fr: 'Mornag, Ben Arous',
    harvested_ar: 'اليوم', harvested_fr: "Aujourd'hui", is_bio: 1, sort_order: 160,
  },
  {
    slug: 'lait-frais', name_ar: 'حليب طازج', name_fr: 'Lait frais',
    desc_ar: 'حليب بقري طازج غير معالج، يُغلى قبل الاستعمال.', desc_fr: 'Lait de vache cru du jour, à faire bouillir.',
    category: 'animal', icon: 'milk', unit: 'L', price_millimes: 2500,
    step_qty: 1, min_qty: 1, max_qty: 10, stock_qty: 40,
    farmer_ar: 'ضيعة الهناء', farmer_fr: 'Ferme El Hana', region_ar: 'مرناق، بن عروس', region_fr: 'Mornag, Ben Arous',
    harvested_ar: 'حلبة الصباح', harvested_fr: 'Traite du matin', is_bio: 0, sort_order: 170,
  },
  {
    slug: 'poulet-fermier', name_ar: 'دجاج بلدي', name_fr: 'Poulet fermier',
    desc_ar: 'دجاج بلدي منظّف، يُذبح يوم الطلب.', desc_fr: 'Poulet fermier vidé, abattu le jour de la commande.',
    category: 'animal', icon: 'chicken', unit: 'kg', price_millimes: 14000,
    step_qty: 0.5, min_qty: 1, max_qty: 10, stock_qty: 30,
    farmer_ar: 'ضيعة الهناء', farmer_fr: 'Ferme El Hana', region_ar: 'مرناق، بن عروس', region_fr: 'Mornag, Ben Arous',
    harvested_ar: 'يوم الطلب', harvested_fr: 'Le jour de la commande', is_bio: 1, sort_order: 180,
  },
];

const COLUMNS = [
  'slug', 'name_ar', 'name_fr', 'desc_ar', 'desc_fr', 'category', 'icon', 'unit',
  'price_millimes', 'step_qty', 'min_qty', 'max_qty', 'stock_qty',
  'farmer_ar', 'farmer_fr', 'region_ar', 'region_fr', 'harvested_ar', 'harvested_fr',
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
