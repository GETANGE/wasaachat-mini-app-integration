import { svg } from "../utils/dom.js";

// Stroke icons on a 24×24 grid. Every path uses currentColor.
const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const PATHS = {
  plus: `<path d="M12 5v14M5 12h14" ${S} stroke-width="2.2"/>`,
  check: `<path d="m5 12.5 4.5 4.5L19 7.5" ${S} stroke-width="2.6"/>`,
  cross: `<path d="m7 7 10 10M17 7 7 17" ${S} stroke-width="2.6"/>`,
  clock: `<circle cx="12" cy="12" r="8" ${S} stroke-width="2.2"/><path d="M12 8v4.5l3 2" ${S} stroke-width="2.2"/>`,
  search: `<circle cx="11" cy="11" r="6.5" ${S}/><path d="m16 16 4 4" ${S}/>`,
  user: `<circle cx="12" cy="8" r="4" ${S}/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" ${S}/>`,
  heart: `<path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" ${S}/>`,
  // Logo: shopping bag with a leaf inside (leaf colour comes from CSS .logo-leaf).
  logo: `<path d="M5 8.5h14l-1.1 12.2a1.5 1.5 0 0 1-1.5 1.3H7.6a1.5 1.5 0 0 1-1.5-1.3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path class="logo-leaf" d="M12 19.5c-2.6-.9-3.6-3.4-2.6-6.4 2.4.2 4.2 1.6 4.1 4.3-.1.9-.6 1.6-1.5 2.1z"/><path class="logo-leaf" d="M12.2 19.4c.3-2.3 1.4-4.2 3.6-5.3.6 2.7-.8 4.8-3.6 5.3z" opacity=".75"/><path d="M12 19.5v-4.8" fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round"/>`,
  bag: `<path d="M5 8h14l-1.4 12H6.4z" ${S}/><path d="M9 8V7a3 3 0 0 1 6 0v1" ${S}/>`,
  cart: `<path d="M3 4h2.5l2.2 11h10.6L20.5 8H7" ${S}/><circle cx="9.5" cy="19.5" r="1.3" ${S}/><circle cx="17" cy="19.5" r="1.3" ${S}/>`,
  menu: `<path d="M4 7h16M4 12h16M4 17h16" ${S}/>`,
  chevronDown: `<path d="m6 9 6 6 6-6" ${S}/>`,
  chevronLeft: `<path d="m15 6-6 6 6 6" ${S}/>`,
  chevronRight: `<path d="m9 6 6 6-6 6" ${S}/>`,
  arrowRight: `<path d="M5 12h14M13 6l6 6-6 6" ${S}/>`,
  home: `<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" ${S}/>`,
  store: `<path d="M4 10 5.5 4h13L20 10M4 10h16M4 10v10h16V10M9 20v-5h6v5" ${S}/>`,
  receipt: `<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" ${S}/><path d="M9 8h6M9 12h6" ${S}/>`,
  truck: `<path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7" ${S}/><circle cx="7" cy="17.5" r="1.8" ${S}/><circle cx="17.5" cy="17.5" r="1.8" ${S}/>`,
  returns: `<path d="M4 12a8 8 0 1 0 2.3-5.6" ${S}/><path d="M4 4v4h4" ${S}/>`,
  shield: `<path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6z" ${S}/><path d="m9 12 2 2 4-4" ${S}/>`,
  headset: `<path d="M4 14v-2a8 8 0 0 1 16 0v2" ${S}/><path d="M4 14h3v5H5a1 1 0 0 1-1-1zM20 14h-3v5h2a1 1 0 0 0 1-1z" ${S}/><path d="M17 19c0 1.1-2 2-5 2" ${S}/>`,
  award: `<circle cx="12" cy="9" r="5.5" ${S}/><path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7" ${S}/>`,
  tag: `<path d="M3 12V4h8l10 10-8 8z" ${S}/><circle cx="7.5" cy="7.5" r="1.3" ${S}/>`,
  sparkle: `<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z" fill="currentColor"/><path d="M19 15c.3 1.7 1.1 2.5 2.8 2.8-1.7.3-2.5 1.1-2.8 2.8-.3-1.7-1.1-2.5-2.8-2.8 1.7-.3 2.5-1.1 2.8-2.8z" fill="currentColor"/>`,
  heartFill: `<path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" fill="currentColor"/>`,
  verified: `<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="m8 12.2 2.7 2.6L16 9.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  mail: `<rect x="3" y="5" width="18" height="14" rx="2" ${S}/><path d="m3.5 6.5 8.5 7 8.5-7" ${S}/>`,
  grid: `<rect x="4" y="4" width="6" height="6" rx="1.5" ${S}/><rect x="14" y="4" width="6" height="6" rx="1.5" ${S}/><rect x="4" y="14" width="6" height="6" rx="1.5" ${S}/><rect x="14" y="14" width="6" height="6" rx="1.5" ${S}/>`,
  // category art
  monitor: `<rect x="3" y="4" width="18" height="12" rx="1.5" ${S}/><path d="M9 20h6M12 16v4" ${S}/>`,
  dress: `<path d="M9 3h6l-1 4 4 13H6l4-13z" ${S}/><path d="M9.5 7h5" ${S}/>`,
  shirt: `<path d="M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3c-.5 1.5-2 2.5-4 2.5S8.5 5.5 8 4z" ${S}/>`,
  sofa: `<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" ${S}/><path d="M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z" ${S}/><path d="M5 17v2M19 17v2" ${S}/>`,
  bottle: `<path d="M10 3h4v3l1.5 2v12a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V8L10 6z" ${S}/><path d="M8.5 12h7" ${S}/>`,
  ball: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M12 3.5v17M3.5 12h17M6 6c3 3 3 9 0 12M18 6c-3 3-3 9 0 12" ${S}/>`,
  toy: `<circle cx="12" cy="13" r="6" ${S}/><circle cx="7" cy="6.5" r="2.5" ${S}/><circle cx="17" cy="6.5" r="2.5" ${S}/><path d="M10 12h.01M14 12h.01M10.5 15.5c1 .7 2 .7 3 0" ${S}/>`,
  book: `<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" ${S}/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" ${S}/>`,
  paw: `<circle cx="6.5" cy="10" r="1.8" ${S}/><circle cx="10" cy="6" r="1.8" ${S}/><circle cx="14" cy="6" r="1.8" ${S}/><circle cx="17.5" cy="10" r="1.8" ${S}/><path d="M12 11c-3 0-5.5 4-5.5 6.5 0 1.5 1.5 2 2.5 2 1.2 0 1.8-.6 3-.6s1.8.6 3 .6c1 0 2.5-.5 2.5-2C17.5 15 15 11 12 11z" ${S}/>`,
  basket: `<path d="M3 10h18l-2 10H5z" ${S}/><path d="m8 10 3-6M16 10l-3-6M9 14v3M15 14v3" ${S}/>`,
  headphones: `<path d="M4 15v-3a8 8 0 0 1 16 0v3" ${S}/><rect x="3" y="14" width="4" height="6" rx="1.5" ${S}/><rect x="17" y="14" width="4" height="6" rx="1.5" ${S}/>`,
  // social
  facebook: `<path d="M14 8h2.5V4.5H14A3.5 3.5 0 0 0 10.5 8v2.5H8V14h2.5v6.5H14V14h2.5l.5-3.5h-3V8.5c0-.3.2-.5.5-.5z" ${S}/>`,
  instagram: `<rect x="4" y="4" width="16" height="16" rx="4.5" ${S}/><circle cx="12" cy="12" r="3.6" ${S}/><path d="M16.8 7.2h.01" ${S}/>`,
  x: `<path d="m5 4 14 16M19 4 5 20" ${S}/>`,
  youtube: `<rect x="3" y="6" width="18" height="12" rx="3.5" ${S}/><path d="m10.5 9.5 4 2.5-4 2.5z" ${S}/>`,
};

export function icon(name, size = 20) {
  return svg(PATHS[name] ?? PATHS.tag, size);
}

// Filled star for ratings (partial stars use a clip).
export function star(fill = 1, size = 14) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  const id = `s${Math.random().toString(36).slice(2, 8)}`;
  return svg(
    `<defs><linearGradient id="${id}"><stop offset="${pct}%" stop-color="currentColor"/><stop offset="${pct}%" stop-color="currentColor" stop-opacity=".22"/></linearGradient></defs>` +
      `<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="url(#${id})"/>`,
    size,
  );
}

// Back-compat helpers used by the payment screens.
export const icons = {
  plus: () => icon("plus"),
  check: () => icon("check", 34),
  cross: () => icon("cross", 34),
  clock: () => icon("clock", 34),
};
