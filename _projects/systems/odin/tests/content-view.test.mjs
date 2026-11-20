import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearFields, fillFields, showContent, showState } from '../js/content-view.js';
import { container, element } from './fake-page.mjs';

const RECORD = { name: 'Example Company', phone: '(555) 010-0000' };

function page({ fields = ['name', 'phone'], states = ['loading', 'ready', 'unavailable'], showing = 'loading' } = {}) {
  const blocks = Object.fromEntries(states.map((state) => [state, element({ odinState: state }, { hidden: state !== showing })]));
  const fieldElements = Object.fromEntries(fields.map((key) => [key, element({ odinField: key })]));
  const root = container([...Object.values(blocks), ...Object.values(fieldElements)]);
  return { root, blocks, fields: fieldElements };
}

function showing(blocks) {
  return Object.keys(blocks).filter((state) => !blocks[state].hidden);
}

test('showState shows one block and hides the others', () => {
  const { root, blocks } = page();
  for (const state of ['ready', 'unavailable', 'loading']) {
    showState(root, state);
    assert.deepEqual(showing(blocks), [state]);
  }
});

test('showState refuses a state it does not know', () => {
  assert.throws(() => showState(page().root, 'broken'), /Unknown content state: broken/);
});

test('a page missing a block is refused on the first call, whichever state is asked for', () => {
  const { root, blocks } = page({ states: ['loading', 'ready'] });
  assert.throws(() => showState(root, 'loading'), /no block for: unavailable/);
  assert.deepEqual(showing(blocks), ['loading']);
});

test('fillFields writes each field\'s text and ignores keys the page does not show', () => {
  const { root, fields } = page();
  fillFields(root, { ...RECORD, email: 'hello@example.com' });
  assert.equal(fields.name.textContent, 'Example Company');
  assert.equal(fields.phone.textContent, '(555) 010-0000');
});

test('fillFields writes nothing when the record lacks a field the page shows', () => {
  const { root, fields } = page();
  assert.throws(() => fillFields(root, { name: 'Example Company' }), /no usable value for: phone/);
  assert.equal(fields.name.textContent, '');
});

test('fillFields refuses text with nothing in it, and writes nothing', () => {
  for (const blank of ['', '   ', '\n\t']) {
    const { root, fields } = page();
    assert.throws(() => fillFields(root, { ...RECORD, phone: blank }), /no usable value for: phone/, JSON.stringify(blank));
    assert.equal(fields.name.textContent, '');
  }
});

test('fillFields does not take text the record only inherits', () => {
  const { root, fields } = page({ fields: ['name'] });
  assert.throws(() => fillFields(root, Object.create({ name: 'Inherited' })), /no usable value for: name/);
  assert.equal(fields.name.textContent, '');
});

test('fillFields sets a link\'s address', () => {
  const link = element({ odinHref: 'profile' });
  fillFields(container([link]), { profile: 'https://social.example/company' });
  assert.equal(link.getAttribute('href'), 'https://social.example/company');
});

test('fillFields fills several parts of a page at once', () => {
  const name = element({ odinField: 'name' });
  const phone = element({ odinField: 'phone' });
  fillFields([container([name]), container([phone])], RECORD);
  assert.deepEqual([name.textContent, phone.textContent], ['Example Company', '(555) 010-0000']);
});

test('fillFields writes to none of several parts when one of them has an unusable value', () => {
  const name = element({ odinField: 'name' });
  const link = element({ odinHref: 'profile' });
  const parts = [container([name]), container([link])];
  assert.throws(() => fillFields(parts, { name: 'Example Company', profile: 'http://social.example/' }), /no usable value for: profile/);
  assert.equal(name.textContent, '');
  assert.equal(link.getAttribute('href'), null);
});

test('fillFields refuses a link that is not an https address, and writes nothing', () => {
  for (const address of ['javascript:alert(1)', 'http://social.example/', '//social.example/', ' https://social.example/', 42]) {
    const name = element({ odinField: 'name' });
    const link = element({ odinHref: 'profile' });
    assert.throws(() => fillFields(container([name, link]), { name: 'Example Company', profile: address }), /no usable value for: profile/, String(address));
    assert.equal(link.getAttribute('href'), null);
    assert.equal(name.textContent, '');
  }
});

test('showContent shows the record when it loads', async () => {
  const { root, blocks, fields } = page();
  const reports = [];
  const shown = await showContent({ root, load: async () => RECORD, report: (...args) => reports.push(args) });
  assert.equal(shown, true);
  assert.deepEqual(showing(blocks), ['ready']);
  assert.equal(fields.name.textContent, 'Example Company');
  assert.deepEqual(reports, []);
});

test('showContent switches to the loading block until the record arrives', async () => {
  const { root, blocks } = page({ showing: 'unavailable' });
  let finish;
  const pending = showContent({ root, load: () => new Promise((resolve) => { finish = resolve; }), report: () => {} });
  assert.deepEqual(showing(blocks), ['loading']);
  finish(RECORD);
  await pending;
  assert.deepEqual(showing(blocks), ['ready']);
});

test('showContent shows only the unavailable block when loading fails, and reports why', async () => {
  const { root, blocks, fields } = page();
  const failure = new Error('Flask is down');
  const reports = [];
  const shown = await showContent({ root, load: async () => { throw failure; }, report: (...args) => reports.push(args) });
  assert.equal(shown, false);
  assert.deepEqual(showing(blocks), ['unavailable']);
  assert.deepEqual([fields.name.textContent, fields.phone.textContent], ['', '']);
  assert.equal(reports.length, 1);
  assert.equal(reports[0][1], failure);
});

test('showContent handles a load that throws before it returns a promise', async () => {
  const { root, blocks } = page();
  const shown = await showContent({ root, load: () => { throw new Error('broke at once'); }, report: () => {} });
  assert.equal(shown, false);
  assert.deepEqual(showing(blocks), ['unavailable']);
});

test('showContent shows no part of a record that is missing a field', async () => {
  const { root, blocks, fields } = page();
  fields.name.textContent = 'Left over from before';
  const shown = await showContent({ root, load: async () => ({ name: 'Example Company' }), report: () => {} });
  assert.equal(shown, false);
  assert.deepEqual(showing(blocks), ['unavailable']);
  assert.equal(fields.name.textContent, '');
});

test('showContent leaves the unavailable block showing even when the report fails', async () => {
  const { root, blocks } = page();
  const broken = () => { throw new Error('the reporter broke'); };
  await assert.rejects(showContent({ root, load: async () => { throw new Error('Flask is down'); }, report: broken }), /the reporter broke/);
  assert.deepEqual(showing(blocks), ['unavailable']);
});

test('showContent fills and clears the way it is told to', async () => {
  const { root, blocks } = page();
  const calls = [];
  const fill = (target, loaded) => calls.push(['fill', target === root, loaded]);
  const clear = (target) => calls.push(['clear', target === root]);
  assert.equal(await showContent({ root, load: async () => 'the content', report: () => {}, fill, clear }), true);
  assert.deepEqual(calls, [['fill', true, 'the content']]);
  const failing = () => { throw new Error('cannot fill'); };
  assert.equal(await showContent({ root, load: async () => 'the content', report: () => {}, fill: failing, clear }), false);
  assert.deepEqual(calls.at(-1), ['clear', true]);
  assert.deepEqual(showing(blocks), ['unavailable']);
});

test('showContent switches to the loading block before it asks for content', async () => {
  const { root, blocks } = page({ showing: 'ready' });
  let seen;
  await showContent({ root, load: async () => { seen = showing(blocks); return RECORD; }, report: () => {} });
  assert.deepEqual(seen, ['loading']);
});

test('showContent on a page missing a block fails before it asks for content', async () => {
  const { root } = page({ states: ['loading', 'ready'] });
  let asked = false;
  await assert.rejects(showContent({ root, load: async () => { asked = true; return RECORD; }, report: () => {} }), /no block for: unavailable/);
  assert.equal(asked, false);
});

test('clearFields empties every field and link', () => {
  const name = element({ odinField: 'name' });
  const link = element({ odinHref: 'profile' });
  const root = container([name, link]);
  fillFields(root, { name: 'Example Company', profile: 'https://social.example/' });
  clearFields(root);
  assert.equal(name.textContent, '');
  assert.equal(link.getAttribute('href'), null);
});
