// Shows a page that is built from sections. Each section's element is marked
// data-odin-section="<name>"; the README lists the marks that go inside it. A part the markup asks
// for must be in the section, or the whole page is unavailable.

import { clearFields, fillFields, isText, showContent } from './content-view.js';

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

// Writes each section into the element marked for it. Values go in as text and attributes, never
// as HTML.
export function fillSections(root, sections, { imageUrl }) {
  const elements = [...root.querySelectorAll('[data-odin-section]')];
  // A page whose marks are misspelled would otherwise show as ready with nothing in it
  if (elements.length === 0) throw new Error('The page marks no section');
  for (const element of elements) {
    const name = element.dataset.odinSection;
    const section = sections.find((candidate) => candidate.name === name);
    if (!section) throw new Error(`The page has no content for its ${name} section`);
    fillFields(element, section);
    fillImages(element, section, imageUrl);
  }
}

export function clearSections(root) {
  clearFields(root);
  for (const image of root.querySelectorAll('[data-odin-image]')) {
    image.removeAttribute('src');
    image.setAttribute('alt', '');
  }
}

// Loads a page's sections with `load` and shows them in `root`: the whole page or the unavailable
// block. Resolves to whether the page is showing.
export function showPage({ root, load, imageUrl, report }) {
  const fill = (page, sections) => fillSections(page, sections, { imageUrl });
  return showContent({ root, load, report, fill, clear: clearSections });
}
