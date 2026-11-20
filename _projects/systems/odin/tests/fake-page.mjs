// A small stand-in for the browser DOM, enough for the odin modules to run under Node, which has
// no DOM (and this repo has no npm, so no jsdom). An element keeps its dataset, attributes and
// text. A container finds its children by the data attributes the modules use. Matches
// come back as a Set because, like a browser's NodeList, it can be looped over but has no array
// methods. A selector the fake does not know throws, so a module that starts using a new one fails
// here instead of matching nothing.

const DATASET_KEYS = {
  '[data-odin-state]': 'odinState',
  '[data-odin-field]': 'odinField',
  '[data-odin-href]': 'odinHref',
  '[data-odin-section]': 'odinSection',
  '[data-odin-image]': 'odinImage',
  '[data-odin-items]': 'odinItems',
  '[data-odin-basic]': 'odinBasic',
  '[data-odin-backdrop]': 'odinBackdrop',
  '[data-odin-frame]': 'odinFrame',
  '[data-odin-logo]': 'odinLogo',
};

export function element(dataset = {}, { hidden = false, parentElement = null } = {}) {
  const attributes = new Map();
  return {
    dataset,
    hidden,
    parentElement,
    textContent: '',
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
    removeAttribute(name) { attributes.delete(name); },
  };
}

// An element that holds others. `children` is every element under it, however deep. A list among
// them also brings in what its copies hold, because in a browser a list's copies are inside the
// element that holds the list.
export function container(children, dataset = {}, options = {}) {
  const matching = (selector) => {
    const key = DATASET_KEYS[selector];
    if (!key) throw new Error(`The fake page cannot read the selector ${selector}`);
    const own = children.filter((child) => key in child.dataset);
    const inCopies = children.flatMap((child) => (child.copies || []).flatMap((copy) => [...copy.querySelectorAll(selector)]));
    return [...own, ...inCopies];
  };
  return {
    ...element(dataset, options),
    querySelectorAll: (selector) => new Set(matching(selector)),
    querySelector: (selector) => matching(selector)[0] ?? null,
  };
}

// A list marked data-odin-items, holding its <template> as a browser's would. `makeCopy` builds
// what cloning the template's content gives; pass null for a list with no template. `children` is
// what the list holds, the template included, and `copies` is the rest.
export function itemList(makeCopy) {
  const template = makeCopy
    ? { isTemplate: true, content: { cloneNode: (deep) => (deep ? makeCopy() : container([])) } }
    : null;
  const list = {
    ...element({ odinItems: '' }),
    children: template ? [template] : [],
    get copies() { return list.children.filter((child) => !child.isTemplate); },
    querySelector: (selector) => {
      if (selector !== 'template') throw new Error(`The fake list cannot read the selector ${selector}`);
      return list.children.find((child) => child.isTemplate) ?? null;
    },
    replaceChildren(...nodes) { list.children = nodes; },
  };
  return list;
}
