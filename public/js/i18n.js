/**
 * Bilingue arabe (RTL, par défaut) / français (LTR).
 * Le HTML porte les clés : data-i18n, data-i18n-placeholder, data-i18n-aria, data-i18n-title.
 */

const STORAGE_KEY = 'fallah.lang';

export const DICT = {
  ar: {
    'dir': 'rtl',
    'brand.name': 'فلّاح',
    'brand.tag': 'من المزرعة إلى باب منزلك',
    'nav.shop': 'المنتجات',
    'nav.how': 'كيفية الطلب',
    'nav.track': 'تتبّع طلبك',
    'nav.cart': 'السلة',
    'nav.admin': 'لوحة البائع',
    'lang.switch': 'تغيير اللغة',

    'hero.eyebrow': 'قُطف اليوم من مزارع تونسية',
    'hero.title': 'خضار وفواكه طازجة، من المزارع مباشرة إلى منزلك',
    'hero.lead': 'اختر المنتج، وحدّد الكمية بالكيلوغرام، ثم أدخل رقم هاتفك وعنوانك. نتّصل بك لتأكيد الطلب ثم نوصّله إليك — والدفع نقدًا عند الاستلام.',
    'hero.cta': 'اطلب الآن',
    'hero.how': 'كيف تعمل الخدمة؟',

    'steps.title': 'أربع خطوات فقط',
    'steps.sub': 'الطلب سهل ولا يتطلّب حسابًا ولا بطاقة بنكية.',
    'step1.title': 'اختر المنتج',
    'step1.desc': 'تصفّح الخضار والفواكه ومنتجات المزرعة واختر ما يناسبك.',
    'step2.title': 'حدّد الكمية بالكيلوغرام',
    'step2.desc': 'زد الكمية أو أنقصها بالكيلوغرام (أو بالقطعة) حسب حاجتك.',
    'step3.title': 'أدخل رقمك وعنوانك',
    'step3.desc': 'الاسم ورقم الهاتف وعنوان التوصيل، لا أكثر.',
    'step4.title': 'نتّصل بك ونوصّل الطلب',
    'step4.desc': 'مكالمة قصيرة لتأكيد الطلب وموعد التوصيل، ثم يصلك المنتج.',

    'catalog.title': 'منتجات هذا الأسبوع',
    'catalog.sub': 'الأسعار بالدينار، والكميات حسب المخزون المتوفّر لدى المزارع.',
    'catalog.search': 'ابحث عن منتج أو مزارع أو منطقة…',
    'catalog.searchLabel': 'البحث في المنتجات',
    'catalog.empty': 'لا توجد منتجات مطابقة لهذا البحث.',
    'catalog.loading': 'جارٍ تحميل المنتجات…',
    'cat.all': 'الكل',
    'cat.vegetables': 'خضار',
    'cat.fruits': 'فواكه',
    'cat.pantry': 'مؤن المزرعة',
    'cat.animal': 'منتجات حيوانية',

    'product.add': 'أضف إلى السلة',
    'product.out': 'غير متوفّر',
    'product.bio': 'عضوي',
    'product.from': 'من',
    'product.stock': 'المتوفّر في المخزون: {qty}',
    'product.min': 'أقلّ كمية: {qty}',
    'product.added': 'أُضيف {name} إلى السلة',
    'product.harvested': 'قُطف: {when}',

    'cart.title': 'سلّتك',
    'cart.empty': 'السلة فارغة',
    'cart.emptyHint': 'أضف منتجات من المتجر لبدء الطلب.',
    'cart.browse': 'تصفّح المنتجات',
    'cart.subtotal': 'مجموع المنتجات',
    'cart.delivery': 'التوصيل',
    'cart.deliveryFree': 'مجّاني',
    'cart.total': 'المجموع',
    'cart.checkout': 'متابعة الطلب',
    'cart.remove': 'إزالة',
    'cart.freeHint': 'أضف {amount} لتحصل على توصيل مجّاني.',
    'cart.removed': 'أُزيل المنتج من السلة',
    'cart.cleared': 'أُفرغت السلة',

    'checkout.title': 'معلومات التوصيل',
    'checkout.sub': 'املأ البيانات وسنتّصل بك في أقرب وقت لتأكيد الطلب.',
    'checkout.back': 'العودة إلى المتجر',
    'checkout.summary': 'ملخّص الطلب',
    'checkout.payNotice': 'الدفع نقدًا عند الاستلام. لا يوجد دفع إلكتروني.',
    'checkout.callNotice': 'لا يُؤكَّد الطلب إلّا بعد مكالمة هاتفية معك.',

    'form.name': 'الاسم واللقب',
    'form.namePh': 'مثال: أمينة بن علي',
    'form.phone': 'رقم الهاتف',
    'form.phonePh': '12 345 678',
    'form.phoneHint': 'ثمانية أرقام. نستعمله فقط للاتصال بك بخصوص الطلب.',
    'form.gov': 'الولاية',
    'form.govPh': 'اختر الولاية',
    'form.address': 'العنوان بالتفصيل',
    'form.addressPh': 'الشارع ورقم المنزل والمدينة، وأيّ علامة تساعد السائق…',
    'form.addressHint': 'كلّما كان العنوان أوضح، وصل الطلب أسرع.',
    'form.time': 'الوقت المناسب للاتصال',
    'form.timeAny': 'أيّ وقت',
    'form.timeMorning': 'صباحًا (8–12)',
    'form.timeAfternoon': 'بعد الظهر (12–17)',
    'form.timeEvening': 'مساءً (17–20)',
    'form.note': 'ملاحظة (اختياري)',
    'form.notePh': 'مثال: اتّصل قبل الوصول، المنزل في الطابق الثاني…',
    'form.submit': 'تأكيد الطلب',
    'form.submitting': 'جارٍ الإرسال…',
    'form.required': 'إجباري',

    'success.title': 'وصلنا طلبك!',
    'success.body': 'سنتّصل بك على الرقم {phone} لتأكيد المنتجات وموعد التوصيل.',
    'success.ref': 'رقم الطلب',
    'success.next': 'ما الخطوة التالية؟',
    'success.next1': 'يطّلع المزارع على الطلب ويجهّزه.',
    'success.next2': 'مكالمة هاتفية للتأكيد معك.',
    'success.next3': 'التوصيل والدفع نقدًا عند الاستلام.',
    'success.track': 'تتبّع الطلب',
    'success.more': 'اطلب شيئًا آخر',
    'success.copy': 'نسخ',
    'success.copied': 'نُسخ رقم الطلب',

    'track.title': 'تتبّع طلبك',
    'track.sub': 'أدخل رقم الطلب ورقم الهاتف الذي طلبت به.',
    'track.ref': 'رقم الطلب',
    'track.refPh': 'FLH-20260101-001',
    'track.submit': 'عرض الحالة',
    'track.searching': 'جارٍ البحث…',
    'track.notFound': 'لم نعثر على طلب بهذه البيانات. تحقّق من رقم الطلب ورقم الهاتف.',
    'track.placedAt': 'تاريخ الطلب',
    'track.deliverTo': 'التوصيل إلى',
    'track.items': 'المنتجات',
    'track.progress': 'مسار الطلب',

    'status.pending': 'في انتظار التأكيد الهاتفي',
    'status.confirmed': 'مؤكَّد',
    'status.preparing': 'قيد التجهيز لدى المزارع',
    'status.on_the_way': 'في الطريق إليك',
    'status.delivered': 'تمّ التسليم',
    'status.cancelled': 'ملغى',
    'status.pending.desc': 'سنتّصل بك في أقرب وقت.',
    'status.confirmed.desc': 'تواصلنا معك والطلب مؤكَّد.',
    'status.preparing.desc': 'يجري قطف المنتجات وتعبئتها.',
    'status.on_the_way.desc': 'غادر السائق ومعه طلبك.',
    'status.delivered.desc': 'بالهناء والشفاء!',
    'status.cancelled.desc': 'أُلغي هذا الطلب.',

    'admin.title': 'لوحة البائع',
    'admin.subtitle': 'إدارة الطلبات والمخزون',
    'admin.password': 'كلمة المرور',
    'admin.login': 'تسجيل الدخول',
    'admin.logout': 'تسجيل الخروج',
    'admin.badPassword': 'كلمة المرور غير صحيحة.',
    'admin.tabOrders': 'الطلبات',
    'admin.tabProducts': 'المنتجات',
    'admin.searchOrders': 'ابحث برقم الطلب أو الاسم أو الهاتف…',
    'admin.refresh': 'تحديث',
    'admin.noOrders': 'لا توجد طلبات في هذه الحالة.',
    'admin.statCall': 'بانتظار الاتصال',
    'admin.statActive': 'قيد التنفيذ',
    'admin.statDelivered': 'تمّ تسليمها',
    'admin.statRevenue': 'إيرادات الطلبات المسلَّمة',
    'admin.customer': 'الزبون',
    'admin.phone': 'الهاتف',
    'admin.address': 'العنوان',
    'admin.time': 'وقت الاتصال المفضّل',
    'admin.note': 'ملاحظة الزبون',
    'admin.adminNote': 'ملاحظة داخلية',
    'admin.call': 'اتّصل بالزبون',
    'admin.saveNote': 'حفظ الملاحظة',
    'admin.confirm': 'تأكيد',
    'admin.prepare': 'قيد التجهيز',
    'admin.ship': 'خرج للتوصيل',
    'admin.deliver': 'تمّ التسليم',
    'admin.cancel': 'إلغاء',
    'admin.cancelConfirm': 'هل تريد إلغاء هذا الطلب؟ ستعود المنتجات إلى المخزون.',
    'admin.updated': 'حُدِّث الطلب',
    'admin.pName': 'المنتج',
    'admin.pPrice': 'السعر (بالمليم)',
    'admin.pStock': 'المخزون',
    'admin.pAvailable': 'معروض',
    'admin.save': 'حفظ',
    'admin.saved': 'حُفظت التغييرات',
    'admin.filterAll': 'الكل',

    'p.add': 'إضافة منتج',
    'p.new': 'منتج جديد',
    'p.edit': 'تعديل المنتج',
    'p.delete': 'حذف',
    'p.deleteConfirm': 'هل تريد حذف « {name} » من المتجر؟ الطلبات السابقة تبقى كما هي.',
    'p.deleted': 'حُذف المنتج',
    'p.created': 'أُضيف المنتج إلى المتجر',
    'p.updated': 'حُدِّث المنتج',
    'p.cancel': 'إلغاء',
    'p.saveProduct': 'حفظ المنتج',
    'p.saving': 'جارٍ الحفظ…',
    'p.empty': 'لا توجد منتجات. ابدأ بإضافة واحد.',

    'p.secIdentity': 'التعريف',
    'p.secPricing': 'السعر والكميات',
    'p.secOrigin': 'المصدر',
    'p.secMedia': 'الصورة',

    'p.name': 'اسم المنتج',
    'p.description': 'الوصف',
    'p.category': 'الفئة',
    'p.unit': 'وحدة البيع',
    'p.price': 'سعر الوحدة (بالمليم)',
    'p.priceHint': '1000 مليم = دينار واحد. مثال: 2500 = 2.500 د.ت',
    'p.stock': 'الكمية المتوفّرة',
    'p.step': 'مقدار الزيادة',
    'p.stepHint': 'مثال: 0.5 ليضيف الزبون نصف كيلوغرام عند كلّ ضغطة.',
    'p.min': 'أقلّ كمية',
    'p.max': 'أقصى كمية',
    'p.farmer': 'اسم المزارع',
    'p.region': 'المنطقة',
    'p.harvested': 'وقت القطف',
    'p.harvestedHint': 'مثال: اليوم، أمس، هذا الأسبوع.',
    'p.bio': 'منتج عضوي',
    'p.available': 'معروض للبيع',
    'p.photo': 'صورة المنتج',
    'p.photoChoose': 'اختر صورة',
    'p.photoChange': 'تغيير الصورة',
    'p.photoRemove': 'إزالة الصورة',
    'p.photoHint': 'JPG أو PNG أو WebP، أقلّ من 4 ميغابايت. في غياب صورة، يُعرض الرسم التوضيحي.',
    'p.photoUploading': 'جارٍ رفع الصورة…',
    'p.illustration': 'الرسم التوضيحي (عند غياب صورة)',

    'err.name_required': 'اسم المنتج إجباري.',
    'err.category_invalid': 'اختر فئة من القائمة.',
    'err.unit_invalid': 'اختر وحدة بيع من القائمة.',
    'err.icon_invalid': 'رسم غير معروف.',
    'err.step_invalid': 'مقدار الزيادة يجب أن يكون بين 0.1 و 50.',
    'err.min_invalid': 'أقلّ كمية يجب أن تكون بين 0.1 و 100.',
    'err.max_invalid': 'أقصى كمية يجب أن تكون بين 0.5 و 1000.',
    'err.min_above_max': 'يجب أن تكون أقلّ كمية أصغر من أقصى كمية.',
    'err.image_type_invalid': 'الملف ليس صورة صالحة (JPG أو PNG أو WebP).',
    'err.image_too_large': 'حجم الصورة كبير جدًا (أكثر من 4 ميغابايت).',
    'err.upload_failed': 'تعذّر رفع الصورة. أعد المحاولة.',
    'err.product_not_found': 'لم يعد هذا المنتج موجودًا.',

    'footer.about': 'فلّاح',
    'footer.aboutText': 'منصّة تونسية تربط الزبائن مباشرة بالمزارعين. المنتج يُقطف ويُوصَّل في اليوم نفسه.',
    'footer.contact': 'اتّصل بنا',
    'footer.hours': 'يوميًا من الساعة 7:00 إلى الساعة 19:00',
    'footer.links': 'روابط',
    'footer.rights': 'جميع الحقوق محفوظة.',

    'err.network': 'تعذّر الاتصال بالخادم. تحقّق من الإنترنت وأعد المحاولة.',
    'err.name_too_short': 'اكتب اسمك كاملًا (ثلاثة أحرف على الأقلّ).',
    'err.phone_invalid': 'رقم هاتف غير صحيح. يجب أن يتكوّن من ثمانية أرقام.',
    'err.governorate_invalid': 'اختر ولاية من القائمة.',
    'err.address_too_short': 'العنوان قصير جدًا. أضف مزيدًا من التفاصيل.',
    'err.cart_empty': 'السلة فارغة.',
    'err.cart_invalid': 'هناك خلل في السلة. أفرغها وأعد المحاولة.',
    'err.too_many_orders': 'طلبات كثيرة في وقت قصير. انتظر قليلًا ثمّ أعد المحاولة.',
    'err.product_unavailable': 'أحد المنتجات لم يعد متوفّرًا. حدّث الصفحة.',
    'err.qty_above_stock': 'الكمية المطلوبة تفوق المخزون المتوفّر.',
    'err.qty_below_min': 'الكمية أقلّ من الحدّ الأدنى.',
    'err.order_failed': 'تعذّر تسجيل الطلب. أعد المحاولة من فضلك.',
    'err.unauthorized': 'انتهت الجلسة. سجّل الدخول من جديد.',
    'err.product_missing': 'أحد المنتجات لم يعد موجودًا في المتجر. حدّث الصفحة.',
    'err.qty_above_max': 'الكمية تفوق الحدّ الأقصى لهذا المنتج.',
    'err.qty_step_invalid': 'يجب أن تكون الكمية من مضاعفات مقدار الزيادة المسموح به.',
    'err.cart_duplicate': 'المنتج مكرّر في السلة. أفرغها وأعد المحاولة.',
    'err.cart_too_large': 'عدد المنتجات في السلة كبير جدًا.',
    'err.payload_too_large': 'حجم الطلب كبير جدًا.',
    'err.invalid_json': 'هناك خلل في البيانات المرسلة.',
    'err.too_many_attempts': 'محاولات كثيرة. انتظر قليلًا.',
    'err.status_invalid': 'حالة غير صالحة.',
    'err.price_invalid': 'سعر غير صالح.',
    'err.stock_invalid': 'كمية مخزون غير صالحة.',

    'pwa.install': 'تثبيت التطبيق',
    'net.offline': 'لا يوجد اتصال بالإنترنت. يمكنك تصفّح المنتجات، لكنّ إتمام الطلب يتطلّب اتصالًا.',
    'net.online': 'عاد الاتصال.',

    'unit.kg': 'كغ',
    'unit.L': 'لتر',
    'unit.piece': 'قطعة',
    'unit.bunch': 'حزمة',
    'unit.dozen': 'طبق (12)',
    'unit.jar': 'برطمان',
    'currency': 'د.ت',  },

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

    'p.add': 'Ajouter un produit',
    'p.new': 'Nouveau produit',
    'p.edit': 'Modifier le produit',
    'p.delete': 'Supprimer',
    'p.deleteConfirm': 'Supprimer « {name} » de la boutique ? Les commandes passées restent intactes.',
    'p.deleted': 'Produit supprimé',
    'p.created': 'Produit ajouté à la boutique',
    'p.updated': 'Produit mis à jour',
    'p.cancel': 'Annuler',
    'p.saveProduct': 'Enregistrer le produit',
    'p.saving': 'Enregistrement…',
    'p.empty': 'Aucun produit. Commencez par en ajouter un.',

    'p.secIdentity': 'Identité',
    'p.secPricing': 'Prix et quantités',
    'p.secOrigin': 'Provenance',
    'p.secMedia': 'Visuel',

    'p.name': 'Nom du produit',
    'p.description': 'Description',
    'p.category': 'Catégorie',
    'p.unit': 'Unité de vente',
    'p.price': "Prix à l'unité (millimes)",
    'p.priceHint': '1000 millimes = 1 dinar. Ex. : 2500 = 2,500 DT',
    'p.stock': 'Stock disponible',
    'p.step': 'Pas de quantité',
    'p.stepHint': 'Ex. : 0,5 pour que le client ajoute un demi-kilo par clic.',
    'p.min': 'Quantité minimale',
    'p.max': 'Quantité maximale',
    'p.farmer': 'Producteur',
    'p.region': 'Région',
    'p.harvested': 'Récolté',
    'p.harvestedHint': "Ex. : aujourd'hui, hier, cette semaine.",
    'p.bio': 'Produit bio',
    'p.available': 'En vente',
    'p.photo': 'Photo du produit',
    'p.photoChoose': 'Choisir une photo',
    'p.photoChange': 'Changer la photo',
    'p.photoRemove': 'Retirer la photo',
    'p.photoHint': 'JPG, PNG ou WebP, moins de 4 Mo. Sans photo, l’illustration est utilisée.',
    'p.photoUploading': 'Envoi de la photo…',
    'p.illustration': 'Illustration (si pas de photo)',

    'err.name_required': 'Le nom du produit est obligatoire.',
    'err.category_invalid': 'Choisissez une catégorie.',
    'err.unit_invalid': 'Choisissez une unité de vente.',
    'err.icon_invalid': 'Illustration inconnue.',
    'err.step_invalid': 'Le pas doit être compris entre 0,1 et 50.',
    'err.min_invalid': 'La quantité minimale doit être comprise entre 0,1 et 100.',
    'err.max_invalid': 'La quantité maximale doit être comprise entre 0,5 et 1000.',
    'err.min_above_max': 'Le minimum doit être inférieur au maximum.',
    'err.image_type_invalid': "Le fichier n'est pas une image valide (JPG, PNG ou WebP).",
    'err.image_too_large': 'Photo trop lourde (plus de 4 Mo).',
    'err.upload_failed': "L'envoi de la photo a échoué. Réessayez.",
    'err.product_not_found': "Ce produit n'existe plus.",

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

    'pwa.install': "Installer l'application",
    'net.offline': 'Hors ligne. Le catalogue reste consultable, mais commander demande une connexion.',
    'net.online': 'Connexion rétablie.',

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
