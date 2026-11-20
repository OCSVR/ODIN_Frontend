// The footer every ODIN page shares. Its menu is in the markup, drawn from _config.yml, so it
// works without the backend. The logo, tagline, social links and copyright line come from the site
// basics: each part that shows them is marked data-odin-frame and stays hidden until they arrive.
// When they cannot be loaded those parts stay hidden and the page's own message says why.

import { fillFields } from './content-view.js';

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

// Starts the parts that need the site basics. They are filled and given their logos while still
// hidden, and shown together only when all of it worked. Resolves to whether they are showing.
export async function startFrame({ root, load, imageUrl, background = backgroundOf, watch = watchTheme, report = console.error }) {
  const parts = [...root.querySelectorAll('[data-odin-frame]')];
  let site;
  try {
    site = await load();
    fillFields(parts, site);
    showLogos(root, site, imageUrl, background);
    tellBackdrops(root, background);
  } catch (error) {
    report('The ODIN footer could not show the site basics.', error);
    return false;
  }
  for (const part of parts) part.hidden = false;
  watch(() => {
    showLogos(root, site, imageUrl, background);
    tellBackdrops(root, background);
  });
  return true;
}
