/**
 * Petite carte glissante (« slippy map ») écrite à la main — pas de
 * bibliothèque externe, seulement les tuiles OpenStreetMap.
 *
 * L'épingle reste au centre de la fenêtre : le client déplace la carte
 * sous le repère, ce qui évite toute manipulation fine au doigt.
 */

const TILE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 19;
const TILE_URL = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

/** Centre de repli : Tunis, tant qu'aucun gouvernorat n'est choisi. */
export const DEFAULT_CENTER = { lat: 36.8065, lng: 10.1815, zoom: 12 };

/* --------------------- Projection Web Mercator -------------------- */

const clampLat = (lat) => Math.min(85.05112878, Math.max(-85.05112878, lat));

function lngToWorldX(lng, zoom) {
  return ((lng + 180) / 360) * TILE * 2 ** zoom;
}

function latToWorldY(lat, zoom) {
  const rad = (clampLat(lat) * Math.PI) / 180;
  const y = 0.5 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / (2 * Math.PI);
  return y * TILE * 2 ** zoom;
}

function worldXToLng(x, zoom) {
  return (x / (TILE * 2 ** zoom)) * 360 - 180;
}

function worldYToLat(y, zoom) {
  const n = Math.PI - 2 * Math.PI * (y / (TILE * 2 ** zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/* ------------------------------ Carte ----------------------------- */

/**
 * Monte la carte dans `host` et renvoie une petite télécommande.
 * @param {HTMLElement} host conteneur positionné, avec une hauteur
 * @param {{onMove?: (pos: {lat: number, lng: number}) => void}} options
 */
export function createMap(host, { onMove } = {}) {
  const layer = document.createElement('div');
  layer.className = 'map__tiles';
  // En premier dans le DOM : sous le repère, les boutons de zoom et le crédit OSM.
  host.prepend(layer);

  let zoom = DEFAULT_CENTER.zoom;
  // Centre de la carte, en pixels monde au niveau de zoom courant.
  let cx = lngToWorldX(DEFAULT_CENTER.lng, zoom);
  let cy = latToWorldY(DEFAULT_CENTER.lat, zoom);

  const center = () => ({ lat: worldYToLat(cy, zoom), lng: worldXToLng(cx, zoom) });

  /** Tuiles déjà affichées : les recycler évite un scintillement à chaque geste. */
  const tiles = new Map();

  function draw() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;

    const left = cx - w / 2;
    const top = cy - h / 2;
    const span = 2 ** zoom;
    const minX = Math.floor(left / TILE);
    const maxX = Math.floor((left + w) / TILE);
    const minY = Math.max(0, Math.floor(top / TILE));
    const maxY = Math.min(span - 1, Math.floor((top + h) / TILE));

    const kept = new Set();
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        // La carte s'enroule horizontalement : x = -1 montre la dernière colonne.
        const wrapped = ((x % span) + span) % span;
        const key = `${zoom}/${x}/${y}`;
        kept.add(key);
        let img = tiles.get(key);
        if (!img) {
          img = new Image();
          img.className = 'map__tile';
          img.alt = '';
          img.decoding = 'async';
          // Une tuile absente ne doit pas afficher une icône d'image cassée.
          img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
          img.src = TILE_URL(zoom, wrapped, y);
          tiles.set(key, img);
          layer.append(img);
        }
        img.style.transform = `translate3d(${x * TILE - left}px, ${y * TILE - top}px, 0)`;
      }
    }
    for (const [key, img] of tiles) {
      if (!kept.has(key)) {
        img.remove();
        tiles.delete(key);
      }
    }
  }

  function moved() {
    draw();
    onMove?.(center());
  }

  /** Change de niveau en gardant fixe le point situé sous (px, py). */
  function zoomTo(next, px, py) {
    const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (target === zoom) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    const anchorX = cx - w / 2 + (px ?? w / 2);
    const anchorY = cy - h / 2 + (py ?? h / 2);
    const lat = worldYToLat(anchorY, zoom);
    const lng = worldXToLng(anchorX, zoom);
    const scale = 2 ** (target - zoom);
    // Le point visé doit rester au même endroit à l'écran.
    cx = lngToWorldX(lng, target) + (cx - anchorX) * scale;
    cy = latToWorldY(lat, target) + (cy - anchorY) * scale;
    zoom = target;
    moved();
  }

  /* ---------------------------- Gestes ---------------------------- */

  const pointers = new Map();
  let pinchDistance = 0;

  host.addEventListener('pointerdown', (event) => {
    // Les boutons de zoom et le lien de crédit posés sur la carte gardent leurs clics.
    if (event.target.closest('button, a')) return;
    host.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    host.classList.add('is-dragging');
  });

  host.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance) {
        // Écartement doublé (ou divisé par deux) = un niveau de zoom.
        const steps = Math.round(Math.log2(distance / pinchDistance));
        if (steps) {
          const box = host.getBoundingClientRect();
          zoomTo(zoom + steps, (a.x + b.x) / 2 - box.left, (a.y + b.y) / 2 - box.top);
          pinchDistance = distance;
        }
      } else {
        pinchDistance = distance;
      }
      return;
    }

    cx -= event.clientX - previous.x;
    cy -= event.clientY - previous.y;
    cy = Math.max(0, Math.min(TILE * 2 ** zoom, cy));
    moved();
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    if (!pointers.size) host.classList.remove('is-dragging');
  }

  host.addEventListener('pointerup', endPointer);
  host.addEventListener('pointercancel', endPointer);

  host.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const box = host.getBoundingClientRect();
      zoomTo(zoom + (event.deltaY < 0 ? 1 : -1), event.clientX - box.left, event.clientY - box.top);
    },
    { passive: false }
  );

  // Le clavier doit suffire : flèches pour déplacer, + et - pour zoomer.
  host.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 120 : 40;
    const moves = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    if (moves[event.key]) {
      event.preventDefault();
      cx += moves[event.key][0];
      cy += moves[event.key][1];
      moved();
      return;
    }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomTo(zoom + 1); }
    if (event.key === '-') { event.preventDefault(); zoomTo(zoom - 1); }
  });

  const observer = new ResizeObserver(() => draw());
  observer.observe(host);

  return {
    center,
    getZoom: () => zoom,
    zoomBy: (delta) => zoomTo(zoom + delta),
    /** Recentre la carte ; `silent` évite de renvoyer la position à l'appelant. */
    setView(lat, lng, nextZoom = zoom, silent = false) {
      zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      cx = lngToWorldX(lng, zoom);
      cy = latToWorldY(clampLat(lat), zoom);
      if (silent) draw();
      else moved();
    },
    refresh: draw,
    destroy() {
      observer.disconnect();
      layer.remove();
    },
  };
}

/** Demande la position au navigateur. Résout avec null si elle est refusée. */
export function locateMe(timeout = 10000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 60000 }
    );
  });
}

/** Lien vers l'application de cartes du téléphone, pour le vendeur. */
export const mapsLink = (lat, lng) =>
  `https://www.google.com/maps/search/?api=1&query=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
