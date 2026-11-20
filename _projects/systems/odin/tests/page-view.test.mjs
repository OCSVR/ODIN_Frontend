import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearSections, fillSections, showPage } from '../js/page-view.js';
import { container, element } from './fake-page.mjs';

const HERO = { name: 'hero', kicker: 'Introducing', title: 'Example', text: 'One line.', action: 'Contact Us!', image: 'hero.webp', image_alt: 'A lens.', link: null, items: [] };
const imageUrl = (name) => `https://images.example/${name}`;

// A page with its three state blocks and a hero section holding a title, a kicker and an image.
function page({ section = 'hero', fields = ['kicker', 'title'], image = true } = {}) {
  const blocks = Object.fromEntries(['loading', 'ready', 'unavailable'].map((state) => [state, element({ odinState: state }, { hidden: state !== 'loading' })]));
  const marks = Object.fromEntries(fields.map((key) => [key, element({ odinField: key })]));
  const picture = element({ odinImage: '' });
  const inside = [...Object.values(marks), ...(image ? [picture] : [])];
  const hero = container(inside, { odinSection: section });
  const root = container([...Object.values(blocks), hero, ...inside]);
  return { root, blocks, marks, picture };
}

function showing(blocks) {
  return Object.keys(blocks).filter((state) => !blocks[state].hidden);
}

test('fillSections writes a section\'s parts and its image into the element marked for it', () => {
  const { root, marks, picture } = page();
  fillSections(root, [{ name: 'other', title: 'Not this one' }, HERO], { imageUrl });
  assert.equal(marks.kicker.textContent, 'Introducing');
  assert.equal(marks.title.textContent, 'Example');
  assert.equal(picture.getAttribute('src'), 'https://images.example/hero.webp');
  assert.equal(picture.getAttribute('alt'), 'A lens.');
});

test('fillSections refuses a page whose section the backend did not send', () => {
  const { root } = page({ section: 'pitch' });
  assert.throws(() => fillSections(root, [HERO], { imageUrl }), /no content for its pitch section/);
});

test('fillSections refuses a section that lacks a part the page shows', () => {
  const { root, marks } = page();
  assert.throws(() => fillSections(root, [{ ...HERO, kicker: null }], { imageUrl }), /no usable value for: kicker/);
  assert.equal(marks.title.textContent, '');
});

test('fillSections refuses a section that lacks the image the page shows, or its description', () => {
  for (const lacking of [{ image: null }, { image_alt: null }, { image: undefined, image_alt: undefined }]) {
    const { root, picture } = page();
    assert.throws(() => fillSections(root, [{ ...HERO, ...lacking }], { imageUrl }), /The hero section has no image/);
    assert.equal(picture.getAttribute('src'), null);
  }
});

test('a section the page shows without an image does not need one', () => {
  const { root, marks } = page({ image: false });
  fillSections(root, [{ ...HERO, image: null, image_alt: null }], { imageUrl });
  assert.equal(marks.title.textContent, 'Example');
});

test('clearSections empties the parts and the image', () => {
  const { root, marks, picture } = page();
  fillSections(root, [HERO], { imageUrl });
  clearSections(root);
  assert.equal(marks.title.textContent, '');
  assert.equal(picture.getAttribute('src'), null);
  assert.equal(picture.getAttribute('alt'), '');
});

test('showPage shows the page when its sections load', async () => {
  const { root, blocks, marks } = page();
  const reports = [];
  const shown = await showPage({ root, load: async () => [HERO], imageUrl, report: (...args) => reports.push(args) });
  assert.equal(shown, true);
  assert.deepEqual(showing(blocks), ['ready']);
  assert.equal(marks.title.textContent, 'Example');
  assert.deepEqual(reports, []);
});

test('showPage shows only the unavailable block when loading fails, and reports why', async () => {
  const { root, blocks, marks, picture } = page();
  const failure = new Error('Flask is down');
  const reports = [];
  const shown = await showPage({ root, load: async () => { throw failure; }, imageUrl, report: (...args) => reports.push(args) });
  assert.equal(shown, false);
  assert.deepEqual(showing(blocks), ['unavailable']);
  assert.equal(marks.title.textContent, '');
  assert.equal(picture.getAttribute('src'), null);
  assert.equal(reports[0][1], failure);
});

test('showPage shows no part of a page when one section cannot be filled', async () => {
  const { root, blocks, marks, picture } = page();
  const shown = await showPage({ root, load: async () => [{ ...HERO, image: null }], imageUrl, report: () => {} });
  assert.equal(shown, false);
  assert.deepEqual(showing(blocks), ['unavailable']);
  assert.deepEqual([marks.kicker.textContent, marks.title.textContent], ['', '']);
  assert.equal(picture.getAttribute('src'), null);
});

test('showPage leaves the unavailable block showing even when the report fails', async () => {
  const { root, blocks } = page();
  const broken = () => { throw new Error('the reporter broke'); };
  await assert.rejects(showPage({ root, load: async () => { throw new Error('Flask is down'); }, imageUrl, report: broken }), /the reporter broke/);
  assert.deepEqual(showing(blocks), ['unavailable']);
});
