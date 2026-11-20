import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearSections, fillSections, showPage } from '../js/page-view.js';
import { container, element } from './fake-page.mjs';

const HERO = { name: 'hero', kicker: 'Example kicker', title: 'Example', text: 'One line.', action: 'Example action', image: 'hero.webp', image_alt: 'A lens.', items: [] };
const PITCH = { name: 'pitch', kicker: null, title: 'Second title', text: 'More words.', action: null, image: null, image_alt: null, items: [] };
const imageUrl = (name) => `https://images.example/${name}`;

// A page with its three state blocks and one element per section. Each section's element holds a
// mark for each of `fields`, and an image mark if `image` is set.
function page(sections = [{ name: 'hero', fields: ['kicker', 'title'], image: true }]) {
  const blocks = Object.fromEntries(['loading', 'ready', 'unavailable'].map((state) => [state, element({ odinState: state }, { hidden: true })]));
  const parts = {};
  const all = [];
  for (const { name, fields = [], image = false } of sections) {
    const marks = Object.fromEntries(fields.map((key) => [key, element({ odinField: key })]));
    const picture = image ? element({ odinImage: '' }) : null;
    const inside = [...Object.values(marks), ...(picture ? [picture] : [])];
    parts[name] = { marks, picture };
    all.push(container(inside, { odinSection: name }), ...inside);
  }
  return { root: container([...Object.values(blocks), ...all]), blocks, parts };
}

const TWO = [{ name: 'hero', fields: ['title'], image: true }, { name: 'pitch', fields: ['title', 'text'] }];

function showing(blocks) {
  return Object.keys(blocks).filter((state) => !blocks[state].hidden);
}

test('fillSections writes a section\'s parts and its image into the element marked for it', () => {
  const { root, parts } = page();
  fillSections(root, [{ name: 'other', title: 'Not this one' }, HERO], { imageUrl });
  assert.equal(parts.hero.marks.kicker.textContent, 'Example kicker');
  assert.equal(parts.hero.marks.title.textContent, 'Example');
  assert.equal(parts.hero.picture.getAttribute('src'), 'https://images.example/hero.webp');
  assert.equal(parts.hero.picture.getAttribute('alt'), 'A lens.');
});

test('each section gets its own values and no other section\'s', () => {
  const { root, parts } = page(TWO);
  fillSections(root, [PITCH, HERO], { imageUrl });
  assert.equal(parts.hero.marks.title.textContent, 'Example');
  assert.equal(parts.pitch.marks.title.textContent, 'Second title');
  assert.equal(parts.pitch.marks.text.textContent, 'More words.');
  assert.equal(parts.hero.picture.getAttribute('src'), 'https://images.example/hero.webp');
});

test('fillSections refuses a page that marks no section, so a misspelled mark cannot show an empty page', () => {
  const root = container([element({ odinField: 'title' })]);
  assert.throws(() => fillSections(root, [HERO], { imageUrl }), /marks no section/);
});

test('fillSections refuses a page whose section the backend did not send', () => {
  const { root } = page([{ name: 'pitch', fields: ['title'] }]);
  assert.throws(() => fillSections(root, [HERO], { imageUrl }), /no content for its pitch section/);
});

test('fillSections refuses a section that lacks a part the page shows, or has it blank', () => {
  for (const lacking of [null, undefined, '', '   ']) {
    const { root, parts } = page();
    assert.throws(() => fillSections(root, [{ ...HERO, kicker: lacking }], { imageUrl }), /no usable value for: kicker/, JSON.stringify(lacking));
    assert.equal(parts.hero.marks.title.textContent, '');
  }
});

test('fillSections refuses a section that lacks the image the page shows, or its description', () => {
  for (const lacking of [{ image: null }, { image_alt: null }, { image: '' }, { image_alt: '  ' }, { image: undefined, image_alt: undefined }]) {
    const { root, parts } = page();
    assert.throws(() => fillSections(root, [{ ...HERO, ...lacking }], { imageUrl }), /The hero section has no image/, JSON.stringify(lacking));
    assert.equal(parts.hero.picture.getAttribute('src'), null);
  }
});

test('a section the page shows without an image does not need one', () => {
  const { root, parts } = page([{ name: 'pitch', fields: ['title'] }]);
  fillSections(root, [PITCH], { imageUrl });
  assert.equal(parts.pitch.marks.title.textContent, 'Second title');
});

test('clearSections empties the parts and the image', () => {
  const { root, parts } = page();
  fillSections(root, [HERO], { imageUrl });
  clearSections(root);
  assert.equal(parts.hero.marks.title.textContent, '');
  assert.equal(parts.hero.picture.getAttribute('src'), null);
  assert.equal(parts.hero.picture.getAttribute('alt'), '');
});

test('showPage shows the page when its sections load', async () => {
  const { root, blocks, parts } = page(TWO);
  const reports = [];
  const shown = await showPage({ root, load: async () => [HERO, PITCH], imageUrl, report: (...args) => reports.push(args) });
  assert.equal(shown, true);
  assert.deepEqual(showing(blocks), ['ready']);
  assert.equal(parts.pitch.marks.title.textContent, 'Second title');
  assert.deepEqual(reports, []);
});

test('showPage shows the loading block while the sections are on their way', async () => {
  const { root, blocks } = page();
  let finish;
  const pending = showPage({ root, load: () => new Promise((resolve) => { finish = resolve; }), imageUrl, report: () => {} });
  assert.deepEqual(showing(blocks), ['loading']);
  finish([HERO]);
  await pending;
  assert.deepEqual(showing(blocks), ['ready']);
});

test('showPage shows only the unavailable block when loading fails, and reports why', async () => {
  const { root, blocks, parts } = page();
  const failure = new Error('Flask is down');
  const reports = [];
  const shown = await showPage({ root, load: async () => { throw failure; }, imageUrl, report: (...args) => reports.push(args) });
  assert.equal(shown, false);
  assert.deepEqual(showing(blocks), ['unavailable']);
  assert.equal(parts.hero.marks.title.textContent, '');
  assert.equal(reports[0][1], failure);
});

test('showPage shows no part of a page when a later section cannot be filled', async () => {
  const { root, blocks, parts } = page(TWO);
  const shown = await showPage({ root, load: async () => [HERO, { ...PITCH, text: null }], imageUrl, report: () => {} });
  assert.equal(shown, false);
  assert.deepEqual(showing(blocks), ['unavailable']);
  assert.equal(parts.hero.marks.title.textContent, '');
  assert.equal(parts.hero.picture.getAttribute('src'), null);
  assert.equal(parts.hero.picture.getAttribute('alt'), '');
});

test('showPage leaves the unavailable block showing even when the report fails', async () => {
  const { root, blocks } = page();
  const broken = () => { throw new Error('the reporter broke'); };
  await assert.rejects(showPage({ root, load: async () => { throw new Error('Flask is down'); }, imageUrl, report: broken }), /the reporter broke/);
  assert.deepEqual(showing(blocks), ['unavailable']);
});
