// Shows one record of content in the page. The page's markup holds three blocks inside `root`,
// marked data-odin-state="loading", "ready" and "unavailable", and exactly one of them shows at a
// time. Inside the ready block the markup says where each value goes:
//   data-odin-field="<key>"  the element's text
//   data-odin-href="<key>"   a link's address
// The wording of the loading and unavailable blocks stays in the markup, so no text is written here.

const STATES = ['loading', 'ready', 'unavailable'];

// Each kind of mark: where the markup names the record's key, what value it accepts, and how the
// value is written and taken away again. A link is written only when it is an https address.
const MARKS = [
  {
    selector: '[data-odin-field]',
    key: 'odinField',
    accepts: (value) => typeof value === 'string',
    write: (element, value) => { element.textContent = value; },
    clear: (element) => { element.textContent = ''; },
  },
  {
    selector: '[data-odin-href]',
    key: 'odinHref',
    accepts: (value) => typeof value === 'string' && value.startsWith('https://'),
    write: (element, value) => element.setAttribute('href', value),
    clear: (element) => element.removeAttribute('href'),
  },
];

// A page missing one of the three blocks fails on its first call, not later when that state is needed.
function stateBlocks(root) {
  const blocks = [...root.querySelectorAll('[data-odin-state]')];
  const missing = STATES.filter((state) => !blocks.some((block) => block.dataset.odinState === state));
  if (missing.length > 0) throw new Error(`The page has no block for: ${missing.join(', ')}`);
  return blocks;
}

export function showState(root, state) {
  if (!STATES.includes(state)) throw new Error(`Unknown content state: ${state}`);
  for (const block of stateBlocks(root)) block.hidden = block.dataset.odinState !== state;
}

// The writes that would put the record into every marked element under each root. Nothing is
// written here: a mark the record has no usable value for throws, so a caller writes all or nothing.
function plannedWrites(roots, record) {
  const writes = [];
  const unusable = new Set();
  for (const root of roots) {
    for (const mark of MARKS) {
      for (const element of root.querySelectorAll(mark.selector)) {
        const key = element.dataset[mark.key];
        const value = Object.hasOwn(record, key) ? record[key] : undefined;
        if (mark.accepts(value)) writes.push(() => mark.write(element, value));
        else unusable.add(key);
      }
    }
  }
  if (unusable.size > 0) throw new Error(`The content has no usable value for: ${[...unusable].join(', ')}`);
  return writes;
}

// Writes the record into every marked element under `root`, or under each of several roots. Values
// go in as text and attributes, never as HTML, so nothing the backend sends can run in the page.
// Everything is checked first, so one unusable value means nothing is written anywhere.
export function fillFields(root, record) {
  const roots = Array.isArray(root) ? root : [root];
  for (const write of plannedWrites(roots, record)) write();
}

export function clearFields(root) {
  for (const mark of MARKS) {
    for (const element of root.querySelectorAll(mark.selector)) mark.clear(element);
  }
}

// Loads one record with `load` and shows it in `root`. The visitor sees the whole record or the
// unavailable block, never part of each. Resolves to whether the content is showing.
export async function showContent({ root, load, report = console.error }) {
  showState(root, 'loading');
  try {
    fillFields(root, await load());
  } catch (error) {
    clearFields(root);
    // The page is put right before the report, so a reporter that fails cannot leave it loading.
    showState(root, 'unavailable');
    report('ODIN content could not be shown.', error);
    return false;
  }
  showState(root, 'ready');
  return true;
}
