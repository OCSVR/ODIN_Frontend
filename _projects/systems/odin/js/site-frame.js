// The header and footer every ODIN page shares. The menu is in the markup, drawn from _config.yml,
// so it works without the backend. The logo, tagline, links and copyright line come from the site
// basics: each part that shows them is marked data-odin-frame and stays hidden until they arrive.
// When they cannot be loaded those parts stay hidden and the page's own message says why.

import { fillFields } from './content-view.js';

const MENU_OPEN = 'open';
const MENU_CLOSED = 'closed';

// Below this relative luminance a background gets the light logo. It is where white and black
// have the same contrast against the background, so each side gets the logo that reads better.
const LIGHT_LOGO_BELOW = 0.18;

// The red, green and blue of a computed color, each from 0 to 1. Browsers give "rgb(r, g, b)",
// "rgba(r, g, b, a)" or, for a mixed color, "color(srgb r g b)". A see-through color and any other
// form give null.
function channels(color) {
  const text = String(color).trim();
  const mixed = text.startsWith('color(srgb ');
  if (!mixed && !/^rgba?\(/.test(text)) return null;
  const numbers = (text.slice(text.indexOf('(')).match(/-?\d*\.?\d+/g) || []).map(Number);
  if (numbers.length < 3 || (numbers.length > 3 && numbers[3] === 0)) return null;
  return numbers.slice(0, 3).map((value) => (mixed ? value : value / 255));
}

// Whether a background is dark enough to need the light logo.
export function isDarkColor(color) {
  const rgb = channels(color);
  if (rgb === null) return false;
  const [red, green, blue] = rgb.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue < LIGHT_LOGO_BELOW;
}

// The site record's key for the logo that shows on this background.
export function logoKeyFor(background) {
  return isDarkColor(background) ? 'logo_light' : 'logo_dark';
}

// The color actually behind an element: its own background, or the nearest one above it.
export function backgroundOf(element, styleOf = getComputedStyle) {
  for (let current = element; current; current = current.parentElement) {
    const color = styleOf(current).backgroundColor;
    if (channels(color) !== null) return color;
  }
  return 'rgb(255, 255, 255)';
}

// Calls `onChange` after the visitor's theme is applied or changed. The theme script does that by
// setting variables and a class on the page's root element, sometimes after this script has
// started, and the colors take a moment to settle. Returns a function that stops the watching.
export function watchTheme(onChange, { root = document.documentElement, settleMs = 300, Observer = MutationObserver } = {}) {
  let timer;
  const observer = new Observer(() => {
    clearTimeout(timer);
    timer = setTimeout(onChange, settleMs);
  });
  observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
  return () => {
    clearTimeout(timer);
    observer.disconnect();
  };
}

// Makes the menu open and close at phone width. Until this runs the menu simply shows, so it works
// with scripts off. The styles hide the list only while the nav is marked closed.
export function startMenu(nav) {
  const toggle = nav.querySelector('[data-odin-menu-toggle]');
  if (!toggle) throw new Error('The menu has no toggle button');
  const setMenu = (state) => {
    nav.dataset.odinMenu = state;
    toggle.setAttribute('aria-expanded', String(state === MENU_OPEN));
  };
  setMenu(MENU_CLOSED);
  toggle.hidden = false;
  toggle.addEventListener('click', () => setMenu(nav.dataset.odinMenu === MENU_OPEN ? MENU_CLOSED : MENU_OPEN));
  nav.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.dataset.odinMenu === MENU_OPEN) {
      setMenu(MENU_CLOSED);
      toggle.focus();
    }
  });
}

// Puts the right logo in each place marked data-odin-logo, described by the site's name.
function showLogos(root, site, imageUrl, background) {
  for (const image of root.querySelectorAll('[data-odin-logo]')) {
    image.setAttribute('src', imageUrl(site[logoKeyFor(background(image))]));
    image.setAttribute('alt', site.name);
  }
}

// Tells each element marked data-odin-backdrop whether what is behind it is dark or light. The
// styles use it to turn white artwork dark on a light theme.
function tellBackdrops(root, background) {
  for (const element of root.querySelectorAll('[data-odin-backdrop]')) {
    element.dataset.odinBackdrop = isDarkColor(background(element)) ? 'dark' : 'light';
  }
}

// Adds the company's name to the page's title, which the markup leaves out because the name is content.
function nameTitle(root, name) {
  if (typeof root.title !== 'string' || root.title.includes(name)) return;
  root.title = root.title ? `${root.title} | ${name}` : name;
}

// Starts the header and footer: the menu at once, then the parts that need the site basics. Those
// parts are filled and given their logos while still hidden, and shown together only when all of
// it worked. Resolves to whether they are showing.
export async function startFrame({ root, load, imageUrl, background = backgroundOf, watch = watchTheme, report = console.error }) {
  for (const nav of root.querySelectorAll('[data-odin-nav]')) startMenu(nav);
  const parts = [...root.querySelectorAll('[data-odin-frame]')];
  let site;
  try {
    site = await load();
    fillFields(parts, site);
    showLogos(root, site, imageUrl, background);
    tellBackdrops(root, background);
  } catch (error) {
    report('The ODIN header and footer could not show the site basics.', error);
    return false;
  }
  for (const part of parts) part.hidden = false;
  nameTitle(root, site.name);
  watch(() => {
    showLogos(root, site, imageUrl, background);
    tellBackdrops(root, background);
  });
  return true;
}
