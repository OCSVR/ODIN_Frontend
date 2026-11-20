// Shows a page that is built from sections. Each section's element is marked
// data-odin-section="<name>"; the README lists the marks that go inside it. A part the markup asks
// for must be in what the backend sent, or the whole page is unavailable.

import { clearFields, fillFields, isText, showContent } from './content-view.js';

// How a site basic opens when it is a link: in the phone app or in the email app. Each gives the
// link's address, or null for text it cannot safely turn into one: a number with letters or an
// extension, or an email with a character that would change what the link does.
const OPENERS = {
  tel: (value) => {
    const number = value.replace(/[\s().-]/g, '');
    return /^\+?\d{7,15}$/.test(number) ? `tel:${number}` : null;
  },
  mailto: (value) => (/^[^\s@?#%&]+@[^\s@?#%&]+\.[^\s@?#%&]+$/.test(value) ? `mailto:${value}` : null),
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

// The parts of an item the backend may leave out. A copy shows an item without them.
const OPTIONAL_ITEM_FIELDS = ['subtitle', 'note'];

// Takes out of a copy the places for optional parts its item does not have: the element for a
// missing subtitle or note, and the link around a name when the item has no link, which leaves
// the name as plain text.
function dropMissingParts(copy, item) {
  for (const element of copy.querySelectorAll('[data-odin-field]')) {
    const key = element.dataset.odinField;
    if (OPTIONAL_ITEM_FIELDS.includes(key) && (item[key] === null || item[key] === undefined)) element.remove();
  }
  for (const link of copy.querySelectorAll('[data-odin-href]')) {
    const key = link.dataset.odinHref;
    if (item[key] === null || item[key] === undefined) {
      delete link.dataset.odinHref;
      link.removeAttribute('target');
      link.removeAttribute('rel');
    }
  }
}

// Puts an item's image into each place its copy marks for it. An item's image is optional: a
// person may have no photo yet, and then the img is removed from the copy. An image without its
// description, or the other way round, is a fault in the content.
function fillItemImages(copy, item, imageUrl) {
  for (const image of copy.querySelectorAll('[data-odin-image]')) {
    const has = [isText(item.image), isText(item.image_alt)];
    if (has[0] !== has[1]) throw new Error(`An item of the list has an image without its description, or the other way round`);
    if (has[0]) {
      image.setAttribute('src', imageUrl(item.image));
      image.setAttribute('alt', item.image_alt);
    } else {
      image.remove();
    }
  }
}

// Fills each list marked data-odin-items: its <template> is copied once per item of the section,
// and each copy takes that item's parts. A copy can also show the section's `action`, for a label
// every item shares, such as the one that opens each person's bio.
function fillItems(element, section, imageUrl) {
  for (const list of element.querySelectorAll('[data-odin-items]')) {
    const template = list.querySelector('template');
    if (!template) throw new Error(`The ${section.name} list has no template`);
    if (!Array.isArray(section.items) || section.items.length === 0) {
      throw new Error(`The ${section.name} section has no items`);
    }
    const copies = section.items.map((item) => {
      const copy = template.content.cloneNode(true);
      dropMissingParts(copy, item);
      // Only the label comes from the section. Every other part must be the item's own.
      fillFields(copy, { ...item, action: section.action });
      fillItemImages(copy, item, imageUrl);
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
    // Text that makes no clean link is still shown, as plain text
    const address = opens === undefined ? null : OPENERS[opens](value);
    if (address === null) element.removeAttribute('href');
    else element.setAttribute('href', address);
  }
}

// Takes every list in `scope` back to just its template.
function emptyLists(scope) {
  for (const list of scope.querySelectorAll('[data-odin-items]')) {
    const template = list.querySelector('template');
    if (template) list.replaceChildren(template);
  }
}

// Writes a page's content into its markup: each section into the elements marked for it, and the
// site basics where the page shows them. Values go in as text and attributes, never as HTML.
export function fillSections(root, { sections, site }, { imageUrl }) {
  const elements = [...root.querySelectorAll('[data-odin-section]')];
  // A page whose marks are misspelled would otherwise show as ready with nothing in it
  if (elements.length === 0) throw new Error('The page marks no section');
  // A page can show sections of more than one backend page. Two with one name would leave it to
  // their order which one the visitor sees.
  const names = sections.map((section) => section.name);
  const twice = names.find((name, index) => names.indexOf(name) !== index);
  if (twice !== undefined) throw new Error(`The page was given two sections named ${twice}`);
  // Copies from an earlier fill hold marks of their own, which the section's parts must not go into
  emptyLists(root);
  for (const element of elements) {
    const name = element.dataset.odinSection;
    const section = sections.find((candidate) => candidate.name === name);
    if (!section) throw new Error(`The page has no content for its ${name} section`);
    fillFields(element, section);
    fillImages(element, section, imageUrl);
    fillItems(element, section, imageUrl);
  }
  fillBasics(root, site);
}

export function clearSections(root) {
  clearFields(root);
  for (const image of root.querySelectorAll('[data-odin-image]')) {
    image.removeAttribute('src');
    image.setAttribute('alt', '');
  }
  emptyLists(root);
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
