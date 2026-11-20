import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backgroundOf, isDarkColor, logoKeyFor, startFrame, startMenu, watchTheme } from '../js/site-frame.js';
import { container, element } from './fake-page.mjs';

const SITE = {
  name: 'Example Company',
  tagline: 'An example tagline.',
  copyright: 'Example Holdings. All rights reserved.',
  instagram: 'https://social.example/company',
  logo_dark: 'logo-dark.svg',
  logo_light: 'logo-light.svg',
};
const imageUrl = (name) => `https://images.example/${name}`;
const DARK = 'rgb(11, 18, 32)';
const LIGHT = 'rgb(255, 255, 255)';

// A page with a menu, a header logo, and a footer part holding a logo, a tagline and a link.
function frame() {
  const toggle = element({ odinMenuToggle: '' }, { hidden: true });
  const nav = container([toggle], { odinNav: '' });
  const headerLogo = element({ odinLogo: '' });
  const footerLogo = element({ odinLogo: '' });
  const tagline = element({ odinField: 'tagline' });
  const link = element({ odinHref: 'instagram' });
  const headerPart = container([headerLogo], { odinFrame: '' }, { hidden: true });
  const footerPart = container([footerLogo, tagline, link], { odinFrame: '' }, { hidden: true });
  const root = container([nav, toggle, headerPart, footerPart, headerLogo, footerLogo, tagline, link]);
  const backgrounds = new Map([[headerLogo, DARK], [footerLogo, LIGHT]]);
  return { root, nav, toggle, headerLogo, footerLogo, tagline, link, headerPart, footerPart, backgrounds };
}

test('isDarkColor reads the color forms a browser gives', () => {
  assert.equal(isDarkColor('rgb(11, 18, 32)'), true);
  assert.equal(isDarkColor('rgb(255, 255, 255)'), false);
  assert.equal(isDarkColor('rgba(0, 0, 0, 0.9)'), true);
  assert.equal(isDarkColor('color(srgb 0.05 0.06 0.1)'), true);
  assert.equal(isDarkColor('color(srgb 0.9 0.9 0.9)'), false);
});

test('a see-through color, or one in a form this cannot read, is not called dark', () => {
  for (const color of ['rgba(0, 0, 0, 0)', 'color(srgb 0 0 0 / 0)', 'transparent', '', 'oklch(0.2 0.02 260)', 'hsl(220, 50%, 8%)', 'black']) {
    assert.equal(isDarkColor(color), false, color);
  }
});

// The cut-off is where white and black read equally well, which falls between these two grays.
test('the light logo starts at the gray where it reads better than the dark one', () => {
  assert.equal(isDarkColor('rgb(117, 117, 117)'), true);
  assert.equal(isDarkColor('rgb(118, 118, 118)'), false);
});

test('a dark background gets the light logo, and a light one the dark logo', () => {
  assert.equal(logoKeyFor(DARK), 'logo_light');
  assert.equal(logoKeyFor(LIGHT), 'logo_dark');
});

test('backgroundOf takes the nearest background that is not see-through', () => {
  const page = element();
  const header = element({}, { parentElement: page });
  const logo = element({}, { parentElement: header });
  const colors = new Map([[logo, 'rgba(0, 0, 0, 0)'], [header, 'rgba(0, 0, 0, 0)'], [page, DARK]]);
  assert.equal(backgroundOf(logo, (item) => ({ backgroundColor: colors.get(item) })), DARK);
  colors.set(page, 'rgba(0, 0, 0, 0)');
  assert.equal(backgroundOf(logo, (item) => ({ backgroundColor: colors.get(item) })), 'rgb(255, 255, 255)');
});

// A stand-in for MutationObserver that keeps what it was asked to watch and can report a change.
function fakeObserver() {
  const made = [];
  class Observer {
    constructor(onMutation) {
      this.change = onMutation;
      this.connected = false;
      made.push(this);
    }

    observe(target, options) {
      this.target = target;
      this.options = options;
      this.connected = true;
    }

    disconnect() { this.connected = false; }
  }
  return { Observer, made };
}

test('watchTheme watches the class and style of the page\'s root element', () => {
  const { Observer, made } = fakeObserver();
  const root = element();
  watchTheme(() => {}, { root, Observer });
  assert.equal(made.length, 1);
  assert.equal(made[0].target, root);
  assert.deepEqual(made[0].options, { attributes: true, attributeFilter: ['class', 'style'] });
});

test('watchTheme calls back once, after the changes have settled', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { Observer, made } = fakeObserver();
  let calls = 0;
  watchTheme(() => { calls += 1; }, { root: element(), settleMs: 300, Observer });

  made[0].change();
  t.mock.timers.tick(299);
  made[0].change();
  t.mock.timers.tick(299);
  assert.equal(calls, 0);
  t.mock.timers.tick(1);
  assert.equal(calls, 1);
});

test('watchTheme stops watching, and drops a call it had not made yet', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { Observer, made } = fakeObserver();
  let calls = 0;
  const stop = watchTheme(() => { calls += 1; }, { root: element(), settleMs: 300, Observer });

  made[0].change();
  stop();
  t.mock.timers.tick(300);
  assert.equal(calls, 0);
  assert.equal(made[0].connected, false);
});

test('startMenu shows the button and starts with the menu closed', () => {
  const { nav, toggle } = frame();
  startMenu(nav);
  assert.equal(toggle.hidden, false);
  assert.equal(nav.dataset.odinMenu, 'closed');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
});

test('the button opens and closes the menu, and Escape closes it and returns to the button', () => {
  const { nav, toggle } = frame();
  startMenu(nav);
  toggle.fire('click');
  assert.equal(nav.dataset.odinMenu, 'open');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  toggle.fire('click');
  assert.equal(nav.dataset.odinMenu, 'closed');

  nav.fire('keydown', { key: 'Escape' });
  assert.equal(toggle.focused, false);
  toggle.fire('click');
  nav.fire('keydown', { key: 'Escape' });
  assert.equal(nav.dataset.odinMenu, 'closed');
  assert.equal(toggle.focused, true);
});

test('only Escape closes the menu from the keyboard', () => {
  const { nav, toggle } = frame();
  startMenu(nav);
  toggle.fire('click');
  for (const key of ['Enter', 'Tab', 'ArrowDown', 'a']) {
    nav.fire('keydown', { key });
    assert.equal(nav.dataset.odinMenu, 'open', key);
  }
  assert.equal(toggle.focused, false);
});

test('a menu without its button is refused', () => {
  assert.throws(() => startMenu(container([], { odinNav: '' })), /no toggle button/);
});

test('startFrame fills and shows the parts, with the logo that suits each background', async () => {
  const page = frame();
  const shown = await startFrame({
    root: page.root, load: async () => SITE, imageUrl, background: (image) => page.backgrounds.get(image), watch: () => {}, report: () => {},
  });
  assert.equal(shown, true);
  assert.deepEqual([page.headerPart.hidden, page.footerPart.hidden], [false, false]);
  assert.equal(page.tagline.textContent, 'An example tagline.');
  assert.equal(page.link.getAttribute('href'), 'https://social.example/company');
  assert.equal(page.headerLogo.getAttribute('src'), 'https://images.example/logo-light.svg');
  assert.equal(page.footerLogo.getAttribute('src'), 'https://images.example/logo-dark.svg');
  assert.equal(page.headerLogo.getAttribute('alt'), 'Example Company');
  assert.equal(page.nav.dataset.odinMenu, 'closed');
});

test('startFrame tells white artwork whether it sits on a dark or a light background, and again when the theme changes', async () => {
  const page = frame();
  const artwork = element({ odinBackdrop: '' });
  const root = container([page.nav, page.toggle, page.headerPart, page.footerPart, page.headerLogo, page.footerLogo, page.tagline, page.link, artwork]);
  const backgrounds = new Map([[page.headerLogo, DARK], [page.footerLogo, DARK], [artwork, LIGHT]]);
  let themeChanged;
  await startFrame({
    root, load: async () => SITE, imageUrl, background: (item) => backgrounds.get(item),
    watch: (onChange) => { themeChanged = onChange; }, report: () => {},
  });
  assert.equal(artwork.dataset.odinBackdrop, 'light');
  backgrounds.set(artwork, DARK);
  themeChanged();
  assert.equal(artwork.dataset.odinBackdrop, 'dark');
});

test('startFrame picks the logos again when the theme changes', async () => {
  const page = frame();
  let themeChanged;
  await startFrame({
    root: page.root, load: async () => SITE, imageUrl, background: (image) => page.backgrounds.get(image),
    watch: (onChange) => { themeChanged = onChange; }, report: () => {},
  });
  page.backgrounds.set(page.headerLogo, LIGHT);
  themeChanged();
  assert.equal(page.headerLogo.getAttribute('src'), 'https://images.example/logo-dark.svg');
});

test('startFrame keeps the parts hidden when the site basics cannot be loaded, and still starts the menu', async () => {
  const page = frame();
  const failure = new Error('Flask is down');
  const reports = [];
  let watched = false;
  const shown = await startFrame({
    root: page.root, load: async () => { throw failure; }, imageUrl, background: () => DARK,
    watch: () => { watched = true; }, report: (...args) => reports.push(args),
  });
  assert.equal(shown, false);
  assert.deepEqual([page.headerPart.hidden, page.footerPart.hidden], [true, true]);
  assert.equal(page.headerLogo.getAttribute('src'), null);
  assert.equal(reports[0][1], failure);
  assert.equal(watched, false);
  assert.equal(page.toggle.hidden, false);
});

test('startFrame keeps the parts hidden when a logo\'s address cannot be built', async () => {
  const page = frame();
  const failure = new Error('no image address');
  const reports = [];
  const shown = await startFrame({
    root: page.root, load: async () => SITE, imageUrl: () => { throw failure; }, background: () => DARK,
    watch: () => {}, report: (...args) => reports.push(args),
  });
  assert.equal(shown, false);
  assert.deepEqual([page.headerPart.hidden, page.footerPart.hidden], [true, true]);
  assert.equal(reports[0][1], failure);
});

test('startFrame adds the company\'s name to the page title', async () => {
  const titles = [['Connection check', 'Connection check | Example Company'], ['', 'Example Company'], ['Example Company', 'Example Company']];
  for (const [before, after] of titles) {
    const page = frame();
    page.root.title = before;
    await startFrame({ root: page.root, load: async () => SITE, imageUrl, background: () => DARK, watch: () => {}, report: () => {} });
    assert.equal(page.root.title, after);
  }
});

test('startFrame leaves the page title alone when the site basics cannot be loaded', async () => {
  const page = frame();
  page.root.title = 'Connection check';
  await startFrame({
    root: page.root, load: async () => { throw new Error('Flask is down'); }, imageUrl, background: () => DARK, watch: () => {}, report: () => {},
  });
  assert.equal(page.root.title, 'Connection check');
});

test('startFrame shows no part when one value is unusable', async () => {
  const page = frame();
  const shown = await startFrame({
    root: page.root, load: async () => ({ ...SITE, instagram: 'javascript:alert(1)' }), imageUrl,
    background: () => DARK, watch: () => {}, report: () => {},
  });
  assert.equal(shown, false);
  assert.deepEqual([page.headerPart.hidden, page.footerPart.hidden], [true, true]);
  assert.equal(page.link.getAttribute('href'), null);
});
