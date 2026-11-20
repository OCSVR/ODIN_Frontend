// A small stand-in for the browser DOM, enough for the odin modules to run under Node, which has
// no DOM (and this repo has no npm, so no jsdom). An element keeps its dataset, attributes, text
// and listeners. A container finds its children by the data attributes the modules use. Matches
// come back as a Set because, like a browser's NodeList, it can be looped over but has no array
// methods. A selector the fake does not know throws, so a module that starts using a new one fails
// here instead of matching nothing.

const DATASET_KEYS = {
  '[data-odin-state]': 'odinState',
  '[data-odin-field]': 'odinField',
  '[data-odin-href]': 'odinHref',
  '[data-odin-section]': 'odinSection',
  '[data-odin-image]': 'odinImage',
  '[data-odin-frame]': 'odinFrame',
  '[data-odin-logo]': 'odinLogo',
  '[data-odin-nav]': 'odinNav',
  '[data-odin-menu-toggle]': 'odinMenuToggle',
};

export function element(dataset = {}, { hidden = false, parentElement = null } = {}) {
  const attributes = new Map();
  const listeners = new Map();
  return {
    dataset,
    hidden,
    parentElement,
    textContent: '',
    focused: false,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
    removeAttribute(name) { attributes.delete(name); },
    addEventListener(type, handler) { listeners.set(type, [...(listeners.get(type) || []), handler]); },
    fire(type, event = {}) { for (const handler of listeners.get(type) || []) handler(event); },
    focus() { this.focused = true; },
  };
}

// An element that holds others. `children` is every element under it, however deep.
export function container(children, dataset = {}, options = {}) {
  const matching = (selector) => {
    const key = DATASET_KEYS[selector];
    if (!key) throw new Error(`The fake page cannot read the selector ${selector}`);
    return children.filter((child) => key in child.dataset);
  };
  return {
    ...element(dataset, options),
    querySelectorAll: (selector) => new Set(matching(selector)),
    querySelector: (selector) => matching(selector)[0] ?? null,
  };
}
