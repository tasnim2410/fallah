/**
 * Bilingue arabe (RTL, par défaut) / français (LTR).
 * Le HTML porte les clés : data-i18n, data-i18n-placeholder, data-i18n-aria, data-i18n-title.
 */

const STORAGE_KEY = 'fallah.lang';

export const DICT = {
  ar: {
    'dir': 'rtl',
    'brand.name': 'فلاّح',
    'brand.tag': 'من الضيعة لباب دارك',
    'nav.shop': 'المنتجات',
    'nav.how': 'كيفاش تطلب',
    'nav.track': 'تبّع طلبيتك',
    'nav.cart': 'السلة',
    'nav.admin': 'فضاء البائع',
    'lang.switch': 'تغيير اللغة',

    'hero.eyebrow': 'مقطوف اليوم من ضيعات تونسية',
    'hero.title': 'خضرة وغلال طازجة، من الفلاّح مباشرة لدارك',
    'hero.lead': 'اختار المنتج، حدّد الكيلوات، أعطينا رقم تلفونك والعنوان. نكلّموك باش نأكّدو الطلبية ونوصّلوها لعندك — والخلاص كاش وقت التسليم.',
    'hero.cta': 'اطلب الآن',
    'hero.how': 'كيفاش يخدم؟',
    'trust.direct.title': 'من الفلاّح مباشرة',
    'trust.direct.desc': 'بلا وسايط، بأسعار الضيعة',
    'trust.cash.title': 'الخلاص عند الاستلام',
    'trust.cash.desc': 'كاش وقت ما توصلك الطلبية',
    'trust.fast.title': 'توصيل في نفس اليوم',
    'trust.fast.desc': 'للطلبيات المؤكّدة قبل الساعة 14:00',

    'steps.title': 'أربع خطوات وترتاح',
    'steps.sub': 'الطلب سهل وما يحتاجش حساب ولا بطاقة بنكية.',
    'step1.title': 'اختار المنتج',
    'step1.desc': 'دوّر على الخضرة، الغلّة ولاّ منتوجات الضيعة اللي تحبّها.',
    'step2.title': 'حدّد الكمية بالكيلو',
    'step2.desc': 'زيد ولاّ نقّص بالكيلو (ولاّ بالقطعة) حسب حاجتك.',
    'step3.title': 'أعطينا رقمك وعنوانك',
    'step3.desc': 'اسم، رقم تلفون وعنوان التوصيل — يكفي.',
    'step4.title': 'نكلّموك ونوصّلو',
    'step4.desc': 'مكالمة قصيرة باش نأكّدو الطلبية والتوقيت، ثمّة يوصّلك المنتج.',

    'catalog.title': 'منتوجات هذا الأسبوع',
    'catalog.sub': 'الأسعار بالدينار والكميات حسب المخزون الموجود عند الفلاّح.',
    'catalog.search': 'دوّر على منتج، فلاّح ولاّ جهة…',
    'catalog.searchLabel': 'البحث في المنتجات',
    'catalog.empty': 'ما لقينا حتّى منتج بهذا البحث.',
    'catalog.loading': 'جاري تحميل المنتجات…',
    'cat.all': 'الكل',
    'cat.vegetables': 'خضرة',
    'cat.fruits': 'غلّة',
    'cat.pantry': 'مؤونة الضيعة',
    'cat.animal': 'منتوجات الضيعة',

    'product.add': 'زيدها للسلة',
    'product.out': 'ما عادش موجود',
    'product.bio': 'بيو',
    'product.from': 'عند',
    'product.stock': 'الباقي في المخزون: {qty}',
    'product.min': 'أقلّ كمية: {qty}',
    'product.added': 'تزادت {name} للسلة',
    'product.harvested': 'مقطوف: {when}',

    'cart.title': 'سلّتك',
    'cart.empty': 'السلّة فارغة',
    'cart.emptyHint': 'زيد منتوجات من المتجر باش تبدا الطلبية.',
    'cart.browse': 'شوف المنتوجات',
    'cart.subtotal': 'مجموع المنتوجات',
    'cart.delivery': 'التوصيل',
    'cart.deliveryFree': 'مجّاني',
    'cart.total': 'المجموع',
    'cart.checkout': 'كمّل الطلبية',
    'cart.remove': 'احذف',
    'cart.freeHint': 'زيد {amount} وياخذك التوصيل مجّاني.',
    'cart.removed': 'تحيّد المنتج من السلّة',
    'cart.cleared': 'تفرّغت السلّة',

    'checkout.title': 'معلومات التوصيل',
    'checkout.sub': 'عبّي المعطيات وباش نكلّموك في أقرب وقت باش نأكّدو الطلبية.',
    'checkout.back': 'رجوع للمتجر',
    'checkout.summary': 'ملخّص الطلبية',
    'checkout.payNotice': 'الخلاص كاش عند الاستلام. ما فمّاش خلاص أونلاين.',
    'checkout.callNotice': 'الطلبية ما تتأكّدش كان بعد مكالمة تلفونية معاك.',

    'form.name': 'الاسم واللقب',
    'form.namePh': 'مثال: أمينة بن علي',
    'form.phone': 'رقم التلفون',
    'form.phonePh': '12 345 678',
    'form.phoneHint': '8 أرقام. نستعملوه كان باش نكلّموك على الطلبية.',
    'form.gov': 'الولاية',
    'form.govPh': 'اختار الولاية',
    'form.address': 'العنوان بالتفصيل',
    'form.addressPh': 'النهج، رقم الدار، المدينة، وأي علامة تساعد السائق…',
    'form.addressHint': 'كل ما كان العنوان واضح، كل ما وصلت الطلبية أسرع.',
    'form.time': 'وقت المكالمة اللي يناسبك',
    'form.timeAny': 'أي وقت',
    'form.timeMorning': 'الصباح (8–12)',
    'form.timeAfternoon': 'وقت القايلة (12–17)',
    'form.timeEvening': 'العشية (17–20)',
    'form.note': 'ملاحظة (اختياري)',
    'form.notePh': 'مثال: عيّط قبل ما توصل، الدار في الطابق الثاني…',
    'form.submit': 'أكّد الطلبية',
    'form.submitting': 'جاري الإرسال…',
    'form.required': 'إجباري',

    'success.title': 'وصلتنا طلبيتك!',
    'success.body': 'باش نكلّموك على الرقم {phone} باش نأكّدو المنتوجات ووقت التوصيل.',
    'success.ref': 'رقم الطلبية',
    'success.next': 'شنوّة اللي جاي؟',
    'success.next1': 'الفلاّح يشوف الطلبية ويحضّرها.',
    'success.next2': 'مكالمة تلفونية باش نأكّدو معاك.',
    'success.next3': 'التوصيل والخلاص كاش عند الاستلام.',
    'success.track': 'تبّع الطلبية',
    'success.more': 'اطلب حاجة أخرى',
    'success.copy': 'انسخ',
    'success.copied': 'تنسخ رقم الطلبية',

    'track.title': 'تبّع طلبيتك',
    'track.sub': 'أدخل رقم الطلبية ورقم التلفون اللي طلبت بيه.',
    'track.ref': 'رقم الطلبية',
    'track.refPh': 'FLH-20260101-001',
    'track.submit': 'شوف الحالة',
    'track.searching': 'جاري البحث…',
    'track.notFound': 'ما لقيناش طلبية بهذي المعطيات. تثبّت من رقم الطلبية والتلفون.',
    'track.placedAt': 'تاريخ الطلب',
    'track.deliverTo': 'التوصيل إلى',
    'track.items': 'المنتوجات',
    'track.progress': 'مسار الطلبية',

    'status.pending': 'في انتظار التأكيد بالتلفون',
    'status.confirmed': 'تأكّدت',
    'status.preparing': 'في التحضير عند الفلاّح',
    'status.on_the_way': 'في الطريق إليك',
    'status.delivered': 'تسلّمت',
    'status.cancelled': 'ملغاة',
    'status.pending.desc': 'باش نكلّموك في أقرب وقت.',
    'status.confirmed.desc': 'تكلّمنا معاك والطلبية مؤكّدة.',
    'status.preparing.desc': 'المنتوجات قاعدة تتقطف وتتحزّم.',
    'status.on_the_way.desc': 'السائق خرج بالطلبية.',
    'status.delivered.desc': 'بالشفاء والهناء!',
    'status.cancelled.desc': 'الطلبية تلغات.',

    'admin.title': 'فضاء البائع',
    'admin.subtitle': 'إدارة الطلبيات والمخزون',
    'admin.password': 'كلمة السر',
    'admin.login': 'دخول',
    'admin.logout': 'خروج',
    'admin.badPassword': 'كلمة السر غالطة.',
    'admin.tabOrders': 'الطلبيات',
    'admin.tabProducts': 'المنتوجات',
    'admin.searchOrders': 'دوّر برقم الطلبية، الاسم ولاّ التلفون…',
    'admin.refresh': 'تحديث',
    'admin.noOrders': 'ما فمّاش طلبيات في هذي الحالة.',
    'admin.statCall': 'تستنّى مكالمة',
    'admin.statActive': 'قيد التنفيذ',
    'admin.statDelivered': 'تسلّمت',
    'admin.statRevenue': 'مداخيل الطلبيات المسلّمة',
    'admin.customer': 'الحريف',
    'admin.phone': 'التلفون',
    'admin.address': 'العنوان',
    'admin.time': 'وقت المكالمة',
    'admin.note': 'ملاحظة الحريف',
    'admin.adminNote': 'ملاحظة داخلية',
    'admin.call': 'كلّم الحريف',
    'admin.saveNote': 'سجّل الملاحظة',
    'admin.confirm': 'أكّد',
    'admin.prepare': 'في التحضير',
    'admin.ship': 'خرجت للتوصيل',
    'admin.deliver': 'تسلّمت',
    'admin.cancel': 'ألغِ',
    'admin.cancelConfirm': 'تحبّ تلغي هذي الطلبية؟ المنتوجات باش ترجع للمخزون.',
    'admin.updated': 'تحدّثت الطلبية',
    'admin.pName': 'المنتج',
    'admin.pPrice': 'السعر (بالمليم)',
    'admin.pStock': 'المخزون',
    'admin.pAvailable': 'معروض',
    'admin.save': 'سجّل',
    'admin.saved': 'تسجّلت التغييرات',
    'admin.filterAll': 'الكل',

    'footer.about': 'فلاّح',
    'footer.aboutText': 'منصّة تونسية تربط الحرفاء مباشرة بالفلاّحين. المنتوج يتقطف ويتوصّل في نفس اليوم.',
    'footer.contact': 'اتصل بينا',
    'footer.hours': 'كل يوم من 7:00 لـ 19:00',
    'footer.links': 'روابط',
    'footer.rights': 'كل الحقوق محفوظة.',

    'err.network': 'ما نجّمناش نتّصلو بالخادم. تثبّت من الأنترنات وعاود.',
    'err.name_too_short': 'اكتب اسمك بالكامل (3 حروف على الأقل).',
    'err.phone_invalid': 'رقم تلفون غير صحيح. لازم 8 أرقام.',
    'err.governorate_invalid': 'اختار ولاية من القائمة.',
    'err.address_too_short': 'العنوان قصير برشة. زيد تفاصيل.',
    'err.cart_empty': 'السلّة فارغة.',
    'err.cart_invalid': 'فمّة مشكل في السلّة. فرّغها وعاود.',
    'err.too_many_orders': 'طلبيات برشة في وقت قصير. استنّى شويّة وعاود.',
    'err.product_unavailable': 'فمّة منتج ما عادش متوفّر. حدّث الصفحة.',
    'err.qty_above_stock': 'الكمية المطلوبة أكثر من المخزون الموجود.',
    'err.qty_below_min': 'الكمية أقلّ من الحدّ الأدنى.',
    'err.order_failed': 'ما نجّمناش نسجّلو الطلبية. عاود من فضلك.',
    'err.unauthorized': 'انتهت الجلسة. عاود الدخول.',
    'err.product_missing': 'فمّة منتج ما عادش موجود في المتجر. حدّث الصفحة.',
    'err.qty_above_max': 'الكمية أكثر من الحدّ الأقصى لهذا المنتج.',
    'err.qty_step_invalid': 'الكمية لازمها تكون بمضاعفات الخطوة المسموحة.',
    'err.cart_duplicate': 'المنتج مكرّر في السلّة. فرّغها وعاود.',
    'err.cart_too_large': 'برشة منتوجات في السلّة.',
    'err.payload_too_large': 'الطلبية كبيرة برشة.',
    'err.invalid_json': 'فمّة مشكل في المعطيات المرسلة.',
    'err.too_many_attempts': 'محاولات برشة. استنّى شويّة.',
    'err.status_invalid': 'حالة غير صالحة.',
    'err.price_invalid': 'سعر غير صالح.',
    'err.stock_invalid': 'كمية مخزون غير صالحة.',

    'unit.kg': 'كغ',
    'unit.L': 'لتر',
    'unit.piece': 'قطعة',
    'unit.bunch': 'حزمة',
    'unit.dozen': 'طبق (12)',
    'unit.jar': 'قارورة',
    'currency': 'د.ت',
  },

  fr: {
    'dir': 'ltr',
    'brand.name': 'Fallah',
    'brand.tag': 'De la ferme à votre porte',
    'nav.shop': 'Produits',
    'nav.how': 'Comment ça marche',
    'nav.track': 'Suivre ma commande',
    'nav.cart': 'Panier',
    'nav.admin': 'Espace vendeur',
    'lang.switch': 'Changer de langue',

    'hero.eyebrow': 'Cueilli du jour dans des fermes tunisiennes',
    'hero.title': 'Fruits et légumes frais, directement du producteur',
    'hero.lead': "Choisissez vos produits, indiquez le nombre de kilos, laissez votre téléphone et votre adresse. On vous appelle pour confirmer, puis on livre — paiement en espèces à la livraison.",
    'hero.cta': 'Commander',
    'hero.how': 'Comment ça marche ?',
    'trust.direct.title': 'Direct producteur',
    'trust.direct.desc': 'Sans intermédiaire, au prix de la ferme',
    'trust.cash.title': 'Paiement à la livraison',
    'trust.cash.desc': 'En espèces, à la remise du panier',
    'trust.fast.title': 'Livraison le jour même',
    'trust.fast.desc': 'Pour toute commande confirmée avant 14h',

    'steps.title': 'Quatre étapes, c’est tout',
    'steps.sub': 'Aucune inscription, aucune carte bancaire.',
    'step1.title': 'Choisissez le produit',
    'step1.desc': 'Légumes, fruits ou produits de la ferme, selon la récolte.',
    'step2.title': 'Indiquez les kilos',
    'step2.desc': 'Ajustez la quantité au kilo (ou à la pièce) selon vos besoins.',
    'step3.title': 'Téléphone et adresse',
    'step3.desc': 'Un nom, un numéro, une adresse de livraison. Rien de plus.',
    'step4.title': 'On appelle, on livre',
    'step4.desc': 'Un appel rapide pour confirmer la commande et l’horaire, puis la livraison.',

    'catalog.title': 'La récolte de la semaine',
    'catalog.sub': 'Prix en dinars, quantités selon le stock disponible chez le producteur.',
    'catalog.search': 'Chercher un produit, un producteur, une région…',
    'catalog.searchLabel': 'Rechercher un produit',
    'catalog.empty': 'Aucun produit ne correspond à cette recherche.',
    'catalog.loading': 'Chargement des produits…',
    'cat.all': 'Tout',
    'cat.vegetables': 'Légumes',
    'cat.fruits': 'Fruits',
    'cat.pantry': 'Épicerie de la ferme',
    'cat.animal': 'Produits de la ferme',

    'product.add': 'Ajouter au panier',
    'product.out': 'Épuisé',
    'product.bio': 'Bio',
    'product.from': 'Chez',
    'product.stock': 'Stock restant : {qty}',
    'product.min': 'Minimum : {qty}',
    'product.added': '{name} ajouté au panier',
    'product.harvested': 'Récolté : {when}',

    'cart.title': 'Votre panier',
    'cart.empty': 'Votre panier est vide',
    'cart.emptyHint': 'Ajoutez des produits pour commencer votre commande.',
    'cart.browse': 'Voir les produits',
    'cart.subtotal': 'Sous-total',
    'cart.delivery': 'Livraison',
    'cart.deliveryFree': 'Offerte',
    'cart.total': 'Total',
    'cart.checkout': 'Continuer la commande',
    'cart.remove': 'Retirer',
    'cart.freeHint': 'Plus que {amount} pour la livraison offerte.',
    'cart.removed': 'Produit retiré du panier',
    'cart.cleared': 'Panier vidé',

    'checkout.title': 'Informations de livraison',
    'checkout.sub': 'Remplissez le formulaire : on vous appelle rapidement pour confirmer.',
    'checkout.back': 'Retour à la boutique',
    'checkout.summary': 'Récapitulatif',
    'checkout.payNotice': 'Paiement en espèces à la livraison. Aucun paiement en ligne.',
    'checkout.callNotice': 'La commande n’est validée qu’après un appel téléphonique.',

    'form.name': 'Nom et prénom',
    'form.namePh': 'Ex. : Amina Ben Ali',
    'form.phone': 'Numéro de téléphone',
    'form.phonePh': '12 345 678',
    'form.phoneHint': '8 chiffres. Utilisé uniquement pour confirmer la commande.',
    'form.gov': 'Gouvernorat',
    'form.govPh': 'Choisir un gouvernorat',
    'form.address': 'Adresse détaillée',
    'form.addressPh': 'Rue, numéro, ville, et tout repère utile au livreur…',
    'form.addressHint': 'Plus l’adresse est précise, plus la livraison est rapide.',
    'form.time': 'Moment d’appel préféré',
    'form.timeAny': 'Peu importe',
    'form.timeMorning': 'Matin (8h–12h)',
    'form.timeAfternoon': 'Après-midi (12h–17h)',
    'form.timeEvening': 'Soir (17h–20h)',
    'form.note': 'Note (facultatif)',
    'form.notePh': 'Ex. : appeler avant d’arriver, 2e étage…',
    'form.submit': 'Confirmer la commande',
    'form.submitting': 'Envoi en cours…',
    'form.required': 'obligatoire',

    'success.title': 'Commande bien reçue !',
    'success.body': 'Nous vous appelons au {phone} pour confirmer les produits et l’heure de livraison.',
    'success.ref': 'Numéro de commande',
    'success.next': 'Et maintenant ?',
    'success.next1': 'Le producteur consulte et prépare la commande.',
    'success.next2': 'Un appel téléphonique pour confirmer avec vous.',
    'success.next3': 'Livraison et paiement en espèces à la remise.',
    'success.track': 'Suivre la commande',
    'success.more': 'Commander autre chose',
    'success.copy': 'Copier',
    'success.copied': 'Numéro copié',

    'track.title': 'Suivre ma commande',
    'track.sub': 'Entrez le numéro de commande et le téléphone utilisé.',
    'track.ref': 'Numéro de commande',
    'track.refPh': 'FLH-20260101-001',
    'track.submit': 'Voir le statut',
    'track.searching': 'Recherche…',
    'track.notFound': 'Aucune commande trouvée. Vérifiez le numéro et le téléphone.',
    'track.placedAt': 'Commandé le',
    'track.deliverTo': 'Livraison à',
    'track.items': 'Produits',
    'track.progress': 'Suivi',

    'status.pending': 'En attente de confirmation téléphonique',
    'status.confirmed': 'Confirmée',
    'status.preparing': 'En préparation à la ferme',
    'status.on_the_way': 'En route',
    'status.delivered': 'Livrée',
    'status.cancelled': 'Annulée',
    'status.pending.desc': 'Nous vous appelons très bientôt.',
    'status.confirmed.desc': 'Commande confirmée par téléphone.',
    'status.preparing.desc': 'Les produits sont cueillis et emballés.',
    'status.on_the_way.desc': 'Le livreur est parti avec votre commande.',
    'status.delivered.desc': 'Bon appétit !',
    'status.cancelled.desc': 'Cette commande a été annulée.',

    'admin.title': 'Espace vendeur',
    'admin.subtitle': 'Gestion des commandes et du stock',
    'admin.password': 'Mot de passe',
    'admin.login': 'Se connecter',
    'admin.logout': 'Déconnexion',
    'admin.badPassword': 'Mot de passe incorrect.',
    'admin.tabOrders': 'Commandes',
    'admin.tabProducts': 'Produits',
    'admin.searchOrders': 'Numéro, nom ou téléphone…',
    'admin.refresh': 'Actualiser',
    'admin.noOrders': 'Aucune commande dans ce statut.',
    'admin.statCall': 'À appeler',
    'admin.statActive': 'En cours',
    'admin.statDelivered': 'Livrées',
    'admin.statRevenue': 'Chiffre livré',
    'admin.customer': 'Client',
    'admin.phone': 'Téléphone',
    'admin.address': 'Adresse',
    'admin.time': 'Appel préféré',
    'admin.note': 'Note du client',
    'admin.adminNote': 'Note interne',
    'admin.call': 'Appeler',
    'admin.saveNote': 'Enregistrer la note',
    'admin.confirm': 'Confirmer',
    'admin.prepare': 'En préparation',
    'admin.ship': 'En route',
    'admin.deliver': 'Livrée',
    'admin.cancel': 'Annuler',
    'admin.cancelConfirm': 'Annuler cette commande ? Le stock sera restitué.',
    'admin.updated': 'Commande mise à jour',
    'admin.pName': 'Produit',
    'admin.pPrice': 'Prix (millimes)',
    'admin.pStock': 'Stock',
    'admin.pAvailable': 'En vente',
    'admin.save': 'Enregistrer',
    'admin.saved': 'Modifications enregistrées',
    'admin.filterAll': 'Toutes',

    'footer.about': 'Fallah',
    'footer.aboutText': 'Plateforme tunisienne qui relie les clients directement aux agriculteurs. Cueilli et livré le jour même.',
    'footer.contact': 'Contact',
    'footer.hours': 'Tous les jours de 7h à 19h',
    'footer.links': 'Liens',
    'footer.rights': 'Tous droits réservés.',

    'err.network': 'Connexion au serveur impossible. Réessayez.',
    'err.name_too_short': 'Indiquez votre nom complet (3 caractères minimum).',
    'err.phone_invalid': 'Numéro invalide. 8 chiffres attendus.',
    'err.governorate_invalid': 'Choisissez un gouvernorat dans la liste.',
    'err.address_too_short': 'Adresse trop courte. Ajoutez des détails.',
    'err.cart_empty': 'Votre panier est vide.',
    'err.cart_invalid': 'Panier invalide. Videz-le et recommencez.',
    'err.too_many_orders': 'Trop de commandes en peu de temps. Patientez un instant.',
    'err.product_unavailable': "Un produit n'est plus disponible. Actualisez la page.",
    'err.qty_above_stock': 'Quantité supérieure au stock disponible.',
    'err.qty_below_min': 'Quantité inférieure au minimum.',
    'err.order_failed': "La commande n'a pas pu être enregistrée. Réessayez.",
    'err.unauthorized': 'Session expirée. Reconnectez-vous.',
    'err.product_missing': "Un produit ne figure plus au catalogue. Actualisez la page.",
    'err.qty_above_max': 'Quantité supérieure au maximum autorisé pour ce produit.',
    'err.qty_step_invalid': 'La quantité doit respecter le pas de vente.',
    'err.cart_duplicate': 'Produit en double dans le panier. Videz-le et recommencez.',
    'err.cart_too_large': 'Trop de produits différents dans le panier.',
    'err.payload_too_large': 'Commande trop volumineuse.',
    'err.invalid_json': 'Données envoyées invalides.',
    'err.too_many_attempts': 'Trop de tentatives. Patientez un instant.',
    'err.status_invalid': 'Statut invalide.',
    'err.price_invalid': 'Prix invalide.',
    'err.stock_invalid': 'Stock invalide.',

    'unit.kg': 'kg',
    'unit.L': 'L',
    'unit.piece': 'pièce',
    'unit.bunch': 'botte',
    'unit.dozen': 'plateau (12)',
    'unit.jar': 'pot',
    'currency': 'DT',
  },
};

export let lang = readLang();

function readLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'fr') return stored;
  } catch {
    // localStorage indisponible (navigation privée) : on garde l'arabe.
  }
  return 'ar';
}

/** Traduit une clé, avec substitution {placeholder}. */
export function t(key, vars) {
  let text = DICT[lang][key] ?? DICT.ar[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, value);
    }
  }
  return text;
}

/** Choisit la variante linguistique d'un champ {ar, fr} venant de l'API. */
export const pick = (field) => (field && (field[lang] ?? field.ar)) || '';

/** Millimes → « 12.500 د.ت » / « 12,500 DT ». */
export function money(millimes, withCurrency = true) {
  const sep = lang === 'ar' ? '.' : ',';
  const value = `${Math.floor(millimes / 1000)}${sep}${String(millimes % 1000).padStart(3, '0')}`;
  return withCurrency ? `${value} ${t('currency')}` : value;
}

/** Quantité + unité : « 1.5 كغ » / « 1,5 kg ». */
export function qtyLabel(qty, unit) {
  const rounded = Math.round(qty * 100) / 100;
  const num = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace('.', lang === 'ar' ? '.' : ',');
  return `${num} ${t(`unit.${unit}`)}`;
}

/** Date lisible dans la langue courante. */
export function dateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleString(lang === 'ar' ? 'ar-TN' : 'fr-TN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Applique les traductions au DOM et met à jour lang/dir. */
export function applyTranslations(root = document) {
  if (root === document) {
    document.documentElement.lang = lang;
    document.documentElement.dir = t('dir');
  }
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  }
  for (const el of root.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  }
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  }
  const pageTitle = document.querySelector('meta[name="page-title-key"]');
  if (pageTitle) document.title = `${t(pageTitle.content)} — ${t('brand.name')}`;
}

const listeners = new Set();
/** S'abonner aux changements de langue (les pages y re-rendent leur contenu dynamique). */
export const onLangChange = (fn) => listeners.add(fn);

export function setLang(next) {
  if (next !== 'ar' && next !== 'fr') return;
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Sans stockage, la langue vaut pour la session en cours seulement.
  }
  applyTranslations();
  for (const fn of listeners) fn(lang);
}
