// Shows a page that is built from sections. Each section's element is marked
// data-odin-section="<name>"; the README lists the marks that go inside it. A part the markup asks
// for must be in what the backend sent, or the whole page is unavailable.

import { clearFields, fillFields, isText, showContent } from './content-view.js';

// How a site basic opens when it is a link: in the phone app or in the email app.
const OPENERS = {
  tel: (value) => `tel:${value.replace(/[^\d+]/g, '')}`,
  mailto: (value) => `mailto:${value}`,
};

// Puts a section's image into each place marked for it.
function fillImages(element, section, imageUrl) {
  for (const image of element.querySelectorAll('[data-odin-image]')) {
    if (!isText(section.image) || !isText(section.image_alt)) {
      throw new Error(`The ${section.name} section has no image`);
    }
    image.setAttribute('src', imageUrl(section.image));
    image.setAttribute('alt', section.image_alt);
  }
}

// Fills each list marked data-odin-items: its <template> is copied once per item of the section,
// and each copy takes that item's parts.
function fillItems(element, section) {
  for (const list of element.querySelectorAll('[data-odin-items]')) {
    const template = list.querySelector('template');
    if (!template) throw new Error(`The ${section.name} list has no template`);
    if (!Array.isArray(section.items) || section.items.length === 0) {
      throw new Error(`The ${section.name} section has no items`);
    }
    const copies = section.items.map((item) => {
      const copy = template.content.cloneNode(true);
      fillFields(copy, item);
      return copy;
    });
    list.replaceChildren(template, ...copies);
  }
}

// Writes the site basics into the places marked data-odin-basic="<key>". One that is also marked
// data-odin-opens="tel" or "mailto" becomes a link that opens the phone or email app.
function fillBasics(root, site) {
  for (const element of root.querySelectorAll('[data-odin-basic]')) {
    const key = element.dataset.odinBasic;
    const value = site !== null && typeof site === 'object' && Object.hasOwn(site, key) ? site[key] : undefined;
    if (!isText(value)) throw new Error(`The site basics have no ${key}`);
    const opens = element.dataset.odinOpens;
    if (opens !== undefined && !Object.hasOwn(OPENERS, opens)) throw new Error(`Nothing opens a ${opens} link`);
    element.textContent = value;
    if (opens !== undefined) element.setAttribute('href', OPENERS[opens](value));
  }
}

// Writes a page's content into its markup: each section into the elements marked for it, and the
// site basics where the page shows them. Values go in as text and attributes, never as HTML.
export function fillSections(root, { sections, site }, { imageUrl }) {
  const elements = [...root.querySelectorAll('[data-odin-section]')];
  // A page whose marks are misspelled would otherwise show as ready with nothing in it
  if (elements.length === 0) throw new Error('The page marks no section');
  for (const element of elements) {
    const name = element.dataset.odinSection;
    const section = sections.find((candidate) => candidate.name === name);
    if (!section) throw new Error(`The page has no content for its ${name} section`);
    fillFields(element, section);
    fillImages(element, section, imageUrl);
    fillItems(element, section);
  }
  fillBasics(root, site);
}

export function clearSections(root) {
  clearFields(root);
  for (const image of root.querySelectorAll('[data-odin-image]')) {
    image.removeAttribute('src');
    image.setAttribute('alt', '');
  }
  for (const list of root.querySelectorAll('[data-odin-items]')) {
    const template = list.querySelector('template');
    if (template) list.replaceChildren(template);
  }
  for (const element of root.querySelectorAll('[data-odin-basic]')) {
    element.textContent = '';
    element.removeAttribute('href');
  }
}

// Loads a page's content with `load` and shows it in `root`: the whole page or the unavailable
// block. `load` resolves to { sections, site }, where site is only needed by a page that shows
// site basics. Resolves to whether the page is showing.
export function showPage({ root, load, imageUrl, report }) {
  const fill = (page, content) => fillSections(page, content, { imageUrl });
  return showContent({ root, load, report, fill, clear: clearSections });
}
