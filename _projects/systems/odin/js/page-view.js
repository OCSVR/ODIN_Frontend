// Shows a page that is built from sections. The page's markup holds the same three blocks as
// content-view.js uses (loading, ready, unavailable). Inside the ready block, each section's
// element is marked data-odin-section="<name>" and says where the section's parts go:
//   data-odin-field="<part>"  a part's text: kicker, title, text or action
//   data-odin-href="link"     the section's link
//   data-odin-image           the section's image, with its description
// A part the markup asks for must be in the section, or the whole page is unavailable.

import { clearFields, fillFields, showState } from './content-view.js';

// Puts a section's image into each place marked for it.
function fillImages(element, section, imageUrl) {
  for (const image of element.querySelectorAll('[data-odin-image]')) {
    if (typeof section.image !== 'string' || typeof section.image_alt !== 'string') {
      throw new Error(`The ${section.name} section has no image`);
    }
    image.setAttribute('src', imageUrl(section.image));
    image.setAttribute('alt', section.image_alt);
  }
}

// Writes each section into the element marked for it. Values go in as text and attributes, never
// as HTML.
export function fillSections(root, sections, { imageUrl }) {
  for (const element of root.querySelectorAll('[data-odin-section]')) {
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

// Loads a page's sections with `load` and shows them in `root`. The visitor sees the whole page or
// the unavailable block, never part of each. Resolves to whether the page is showing.
export async function showPage({ root, load, imageUrl, report = console.error }) {
  showState(root, 'loading');
  try {
    fillSections(root, await load(), { imageUrl });
  } catch (error) {
    clearSections(root);
    // The page is put right before the report, so a reporter that fails cannot leave it loading.
    showState(root, 'unavailable');
    report('The ODIN page could not be shown.', error);
    return false;
  }
  showState(root, 'ready');
  return true;
}
