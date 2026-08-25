/**
 * Illustrations produits + icônes d'interface (SVG inline, aucune image externe).
 * Les icônes d'interface héritent de `currentColor` et sont décoratives
 * (aria-hidden) : le libellé accessible est toujours porté par le texte voisin.
 */

const PRODUCE = {
  tomato: `<circle cx="32" cy="37" r="20" fill="#e11d48"/>
    <path d="M32 17c0-3 1-5 2-6" stroke="#166534" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M32 20c-6-6-13-5-15-3 3 4 9 6 15 3zm0 0c6-6 13-5 15-3-3 4-9 6-15 3z" fill="#16a34a"/>
    <ellipse cx="24" cy="30" rx="5" ry="3" fill="#fff" opacity=".35" transform="rotate(-35 24 30)"/>`,

  potato: `<ellipse cx="32" cy="33" rx="23" ry="16" fill="#c8a165" transform="rotate(-18 32 33)"/>
    <ellipse cx="24" cy="27" rx="2.4" ry="1.7" fill="#8b6b3d"/>
    <ellipse cx="38" cy="36" rx="2.6" ry="1.8" fill="#8b6b3d"/>
    <ellipse cx="33" cy="24" rx="1.8" ry="1.3" fill="#8b6b3d"/>
    <ellipse cx="23" cy="38" rx="5" ry="2.4" fill="#e3c99b" opacity=".55" transform="rotate(-18 23 38)"/>`,

  onion: `<path d="M32 14c8 6 15 12 15 22 0 9-7 15-15 15s-15-6-15-15c0-10 7-16 15-22z" fill="#c084fc"/>
    <path d="M32 14c3 6 4 14 4 22s-1 13-4 15c-3-2-4-7-4-15s1-16 4-22z" fill="#e9d5ff"/>
    <path d="M32 14c-2-3-5-5-8-5 2 3 3 5 4 8m4-3c2-3 5-5 8-5-2 3-3 5-4 8" stroke="#16a34a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,

  carrot: `<path d="M32 56 20 26c-1-3 1-6 4-7l16 1c3 1 4 4 3 6z" fill="#f97316"/>
    <path d="M25 32h12M27 40h9M29 47h6" stroke="#ea580c" stroke-width="2" stroke-linecap="round"/>
    <path d="M32 20c-4-6-10-8-14-7 2 5 6 8 11 9zm0 0c4-6 10-8 14-7-2 5-6 8-11 9z" fill="#16a34a"/>
    <path d="M32 21V10" stroke="#166534" stroke-width="3" stroke-linecap="round"/>`,

  pepper: `<path d="M22 24c-6 4-8 12-4 19 5 8 16 10 22 4 6-5 6-14 1-20-4-5-13-7-19-3z" fill="#22c55e"/>
    <path d="M33 21c1-5 5-8 9-8" stroke="#166534" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M27 20c4-2 9-1 11 2-4 2-9 1-11-2z" fill="#166534"/>
    <path d="M26 32c-2 5-1 10 2 13" stroke="#dcfce7" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`,

  zucchini: `<path d="M14 44c-3-8 4-19 14-24 9-5 19-4 22 2 3 6-2 15-11 20-10 6-22 8-25 2z" fill="#16a34a"/>
    <path d="M22 38c5-6 12-11 19-13" stroke="#86efac" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M48 20c2-3 5-4 8-4-1 4-3 6-6 7z" fill="#166534"/>`,

  lettuce: `<path d="M32 52c-13 0-21-8-21-18 0-11 9-20 21-20s21 9 21 20c0 10-8 18-21 18z" fill="#22c55e"/>
    <path d="M32 50c-7 0-12-6-12-14s5-16 12-16 12 8 12 16-5 14-12 14z" fill="#4ade80"/>
    <path d="M32 48V22M32 30c-4-3-7-4-10-4m10 12c-4-3-8-4-11-4m11 12c-4-3-7-4-10-4M32 30c4-3 7-4 10-4m-10 12c4-3 8-4 11-4m-11 12c4-3 7-4 10-4" stroke="#bbf7d0" stroke-width="2" fill="none" stroke-linecap="round"/>`,

  herb: `<path d="M32 56V20" stroke="#166534" stroke-width="3.4" stroke-linecap="round" fill="none"/>
    <path d="M32 26c-3-8-11-11-17-10 1 7 8 12 17 10zm0 0c3-8 11-11 17-10-1 7-8 12-17 10z" fill="#22c55e"/>
    <path d="M32 40c-3-7-9-9-14-8 1 6 6 10 14 8zm0 0c3-7 9-9 14-8-1 6-6 10-14 8z" fill="#16a34a"/>`,

  orange: `<circle cx="32" cy="36" r="20" fill="#f97316"/>
    <circle cx="32" cy="36" r="20" fill="url(#peel)" opacity=".25"/>
    <path d="M32 16c1-4 5-7 9-7-1 5-4 7-9 7z" fill="#16a34a"/>
    <path d="M32 16v-6" stroke="#166534" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="24" cy="29" rx="5" ry="3" fill="#fff" opacity=".3" transform="rotate(-35 24 29)"/>`,

  lemon: `<path d="M14 40c-4-8 2-18 12-22 11-4 22 0 25 7 3 8-4 17-14 20-10 3-19 1-23-5z" fill="#facc15"/>
    <path d="M51 25c3-1 5 0 6 2-2 2-4 2-6 1zM13 43c-3 1-5 0-6-2 2-2 4-2 6-1z" fill="#eab308"/>
    <ellipse cx="26" cy="30" rx="6" ry="3" fill="#fef9c3" opacity=".7" transform="rotate(-25 26 30)"/>`,

  apple: `<path d="M32 20c-4-4-12-4-16 2-5 7-3 20 3 27 3 4 7 5 10 3l3-2 3 2c3 2 7 1 10-3 6-7 8-20 3-27-4-6-12-6-16-2z" fill="#dc2626"/>
    <path d="M32 20V12" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>
    <path d="M32 15c2-5 7-7 11-6-1 5-5 7-11 6z" fill="#16a34a"/>
    <path d="M23 28c-2 3-2 7-1 10" stroke="#fecaca" stroke-width="3" fill="none" stroke-linecap="round" opacity=".65"/>`,

  dates: `<ellipse cx="24" cy="34" rx="8" ry="13" fill="#92400e" transform="rotate(-16 24 34)"/>
    <ellipse cx="38" cy="38" rx="8" ry="13" fill="#b45309" transform="rotate(12 38 38)"/>
    <ellipse cx="32" cy="26" rx="7" ry="11" fill="#a16207"/>
    <ellipse cx="30" cy="22" rx="2.4" ry="4" fill="#fcd34d" opacity=".45"/>
    <path d="M32 15c-4-4-9-5-13-4 2 4 7 6 13 4zm0 0c4-4 9-5 13-4-2 4-7 6-13 4z" fill="#16a34a"/>`,

  oil: `<path d="M27 8h10v9l7 9c1 2 2 4 2 6v22a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V32c0-2 1-4 2-6l7-9z" fill="#dcfce7"/>
    <path d="M20 34h24v20a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" fill="#84cc16"/>
    <rect x="26" y="6" width="12" height="5" rx="2" fill="#166534"/>
    <ellipse cx="32" cy="44" rx="6" ry="4" fill="#3f6212"/>
    <path d="M24 40c-1 4-1 8 0 11" stroke="#d9f99d" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".7"/>`,

  honey: `<path d="M18 24h28v28a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" fill="#fbbf24"/>
    <rect x="15" y="16" width="34" height="9" rx="4" fill="#b45309"/>
    <path d="M18 34h28v18a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" fill="#f59e0b"/>
    <path d="m32 38 4 2v5l-4 2-4-2v-5zM40 42l3 1.6v4l-3 1.6-3-1.6v-4zM24 42l3 1.6v4l-3 1.6-3-1.6v-4z" fill="#fde68a"/>`,

  eggs: `<ellipse cx="24" cy="34" rx="11" ry="14" fill="#fef3c7"/>
    <ellipse cx="41" cy="38" rx="10" ry="13" fill="#fffbeb"/>
    <ellipse cx="21" cy="28" rx="3" ry="4.5" fill="#fff" opacity=".8"/>
    <path d="M8 48h48c0 6-4 9-10 9H18c-6 0-10-3-10-9z" fill="#a16207"/>`,

  milk: `<path d="M25 6h14v8l6 10v30a4 4 0 0 1-4 4H23a4 4 0 0 1-4-4V24l6-10z" fill="#f8fafc"/>
    <path d="M19 32h26v22a4 4 0 0 1-4 4H23a4 4 0 0 1-4-4z" fill="#e0f2fe"/>
    <path d="M19 24h26v8H19z" fill="#38bdf8"/>
    <path d="M27 40c3-2 7-2 10 0" stroke="#0284c7" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M25 6h14v8H25z" fill="#cbd5e1"/>`,

  chicken: `<ellipse cx="30" cy="40" rx="19" ry="15" fill="#fef3c7"/>
    <circle cx="45" cy="27" r="9" fill="#fffbeb"/>
    <path d="M45 16c-2-4 0-6 2-6 1 3 3 3 4 5-2 1-4 1-6 1z" fill="#dc2626"/>
    <path d="m53 27 6 3-6 3z" fill="#f59e0b"/>
    <circle cx="47" cy="25" r="1.8" fill="#3f3f46"/>
    <path d="M14 42c-3 2-5 6-4 9 4 0 7-2 9-5z" fill="#fde68a"/>
    <path d="M25 38c5-3 11-3 15 0-4 4-11 4-15 0z" fill="#fde68a"/>`,

  leaf: `<path d="M52 12C30 12 14 22 14 40c0 5 2 9 4 12C30 40 40 32 48 28c-8 6-18 14-26 26 3 2 7 3 11 3 14 0 23-16 19-45z" fill="#22c55e"/>
    <path d="M18 52c6-14 16-22 26-26" stroke="#166534" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,

  basket: `<path d="M10 24h44l-5 26a6 6 0 0 1-6 5H21a6 6 0 0 1-6-5z" fill="#a16207"/>
    <path d="M10 24h44l-1.5 8h-41z" fill="#ca8a04"/>
    <path d="M22 24 30 8m12 16L34 8" stroke="#166534" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M24 34v14m8-14v14m8-14v14" stroke="#78350f" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`,
};

/** Icônes d'interface, tracé 24×24 façon Lucide. */
const UI = {
  cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h2.5l2.2 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6"/>',
  phone: '<path d="M15.5 21A13.5 13.5 0 0 1 3 8.5 2.5 2.5 0 0 1 5.5 6h1.6a1.5 1.5 0 0 1 1.5 1.2l.6 2.6a1.5 1.5 0 0 1-.5 1.5L7.5 12.5a11 11 0 0 0 4 4l1.2-1.2a1.5 1.5 0 0 1 1.5-.4l2.6.6A1.5 1.5 0 0 1 18 17v1.5A2.5 2.5 0 0 1 15.5 21z"/>',
  truck: '<path d="M1 5h13v11H1z"/><path d="M14 9h4l3 3.5V16h-7z"/><circle cx="6" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>',
  leaf: '<path d="M20 3C9 3 4 8 4 15c0 2 .6 4 1.6 5.4M4.5 20.5C9 13 14 9.5 19 8"/>',
  sprout: '<path d="M12 21v-8"/><path d="M12 13C7 13 4 10 4 5c5 0 8 3 8 8z"/><path d="M12 13c5 0 8-3 8-8-5 0-8 3-8 8z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14M10 10v7M14 10v7"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  x: '<path d="M6 6 18 18M18 6 6 18"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5V8"/>',
  pin: '<path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
  banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  package: '<path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-.6 4"/><path d="M20 5v6h-6"/>',
  logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11"/>',
  tag: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
};

/** Illustration produit (couleurs propres, décorative). */
export function produceIcon(name, cls = 'produce-icon') {
  const shape = PRODUCE[name] || PRODUCE.leaf;
  const defs =
    name === 'orange'
      ? '<defs><radialGradient id="peel"><stop offset="70%" stop-color="#fff" stop-opacity="0"/><stop offset="100%" stop-color="#7c2d12"/></radialGradient></defs>'
      : '';
  return `<svg class="${cls}" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">${defs}${shape}</svg>`;
}

/** Icône d'interface monochrome (hérite de currentColor). */
export function icon(name, cls = 'icon') {
  const path = UI[name] || UI.info;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}

export const PRODUCE_NAMES = Object.keys(PRODUCE);
