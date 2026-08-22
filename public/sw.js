/**
 * Service worker de Fallah.
 *
 * Quatre comportements selon la requête :
 *  - pages           → réseau d'abord (pour voir tout de suite les mises à jour),
 *                      cache en secours, puis page hors ligne ;
 *  - code (JS/CSS)   → réseau d'abord également. Le code n'a pas de nom versionné :
 *                      servir un ancien script avec une page à jour désynchronise
 *                      l'interface (boutons présents mais sans effet) ;
 *  - catalogue (GET) → réseau d'abord, dernière réponse connue en secours,
 *                      pour que la boutique reste consultable sans connexion ;
 *  - reste de l'API  → réseau uniquement. Commandes, suivi et espace vendeur ne
 *                      sont JAMAIS mis en cache (données personnelles + jeton).
 *
 * Bump `VERSION` à chaque déploiement pour purger les anciens caches.
 */

const VERSION = 'v2';
const SHELL_CACHE = `fallah-shell-${VERSION}`;
const DATA_CACHE = `fallah-data-${VERSION}`;

/** Fichiers mis en cache dès l'installation. */
const SHELL = [
  '/',
  '/index.html',
  '/checkout.html',
  '/track.html',
  '/admin.html',
  '/404.html',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/i18n.js',
  '/js/icons.js',
  '/js/shop.js',
  '/js/checkout.js',
  '/js/track.js',
  '/js/admin.js',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/** Réponses API que l'on garde pour l'affichage hors ligne. */
const CACHEABLE_API = ['/api/products', '/api/config'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // addAll échoue en bloc : on tolère qu'un fichier manque.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Page → réseau d'abord, cache ensuite, page hors ligne en dernier recours. */
async function handlePage(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match('/offline.html')) ||
      new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    );
  }
}

/** Script ou feuille de style → réseau d'abord, cache en secours hors ligne. */
async function handleCode(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('offline');
  }
}

/** Catalogue → réseau d'abord, dernière réponse connue si le réseau manque. */
async function handleCatalogue(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'network' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/** Fichier statique → cache immédiat, mise à jour en arrière-plan. */
async function handleAsset(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Jamais de cache hors du site, ni pour autre chose qu'une lecture.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    if (CACHEABLE_API.includes(url.pathname)) event.respondWith(handleCatalogue(request));
    return; // commandes, suivi, espace vendeur : réseau direct
  }

  if (request.mode === 'navigate') {
    event.respondWith(handlePage(request));
    return;
  }

  // Le code doit toujours correspondre à la page qui vient d'être chargée.
  if (request.destination === 'script' || request.destination === 'style' || /\.(js|css)$/.test(url.pathname)) {
    event.respondWith(handleCode(request));
    return;
  }

  event.respondWith(handleAsset(request));
});
