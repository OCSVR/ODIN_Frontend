import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backgroundOf, isDarkColor, logoKeyFor, startFrame, watchTheme } from '../js/site-frame.js';
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

// A page with two parts that wait for the site basics: one holding a logo, the other a logo, a
// tagline and a link.
function frame() {
  const firstLogo = element({ odinLogo: '' });
  const secondLogo = element({ odinLogo: '' });
  const tagline = element({ odinField: 'tagline' });
  const link = element({ odinHref: 'instagram' });
  const firstPart = container([firstLogo], { odinFrame: '' }, { hidden: true });
  const secondPart = container([secondLogo, tagline, link], { odinFrame: '' }, { hidden: true });
  const root = container([firstPart, secondPart, firstLogo, secondLogo, tagline, link]);
  const backgrounds = new Map([[firstLogo, DARK], [secondLogo, LIGHT]]);
  return { root, firstLogo, secondLogo, tagline, link, firstPart, secondPart, backgrounds };
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

test('startFrame fills and shows the parts, with the logo that suits each background', async () => {
  const page = frame();
  const shown = await startFrame({
    root: page.root, load: async () => SITE, imageUrl, background: (image) => page.backgrounds.get(image), watch: () => {}, report: () => {},
  });
  assert.equal(shown, true);
  assert.deepEqual([page.firstPart.hidden, page.secondPart.hidden], [false, false]);
  assert.equal(page.tagline.textContent, 'An example tagline.');
  assert.equal(page.link.getAttribute('href'), 'https://social.example/company');
  assert.equal(page.firstLogo.getAttribute('src'), 'https://images.example/logo-light.svg');
  assert.equal(page.secondLogo.getAttribute('src'), 'https://images.example/logo-dark.svg');
  assert.equal(page.firstLogo.getAttribute('alt'), 'Example Company');
});

test('startFrame tells white artwork whether it sits on a dark or a light background, and again when the theme changes', async () => {
  const page = frame();
  const artwork = element({ odinBackdrop: '' });
  const root = container([page.firstPart, page.secondPart, page.firstLogo, page.secondLogo, page.tagline, page.link, artwork]);
  const backgrounds = new Map([[page.firstLogo, DARK], [page.secondLogo, DARK], [artwork, LIGHT]]);
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
  page.backgrounds.set(page.firstLogo, LIGHT);
  themeChanged();
  assert.equal(page.firstLogo.getAttribute('src'), 'https://images.example/logo-dark.svg');
});

test('startFrame keeps the parts hidden when the site basics cannot be loaded', async () => {
  const page = frame();
  const failure = new Error('Flask is down');
  const reports = [];
  let watched = false;
  const shown = await startFrame({
    root: page.root, load: async () => { throw failure; }, imageUrl, background: () => DARK,
    watch: () => { watched = true; }, report: (...args) => reports.push(args),
  });
  assert.equal(shown, false);
  assert.deepEqual([page.firstPart.hidden, page.secondPart.hidden], [true, true]);
  assert.equal(page.firstLogo.getAttribute('src'), null);
  assert.equal(reports[0][1], failure);
  assert.equal(watched, false);
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
  assert.deepEqual([page.firstPart.hidden, page.secondPart.hidden], [true, true]);
  assert.equal(reports[0][1], failure);
});

test('startFrame shows no part when one value is unusable', async () => {
  const page = frame();
  const shown = await startFrame({
    root: page.root, load: async () => ({ ...SITE, instagram: 'javascript:alert(1)' }), imageUrl,
    background: () => DARK, watch: () => {}, report: () => {},
  });
  assert.equal(shown, false);
  assert.deepEqual([page.firstPart.hidden, page.secondPart.hidden], [true, true]);
  assert.equal(page.link.getAttribute('href'), null);
});
