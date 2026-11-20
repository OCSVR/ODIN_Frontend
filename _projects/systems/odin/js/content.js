// Reads the ODIN website's content from Flask. The frontend keeps none of it: a page asks here,
// and a page that gets no usable answer shows that the content is unavailable.

const SITE_PATH = '/api/odin/site';
const PAGE_PATH = '/api/odin/page';
const IMAGE_PATH = '/api/odin/image';

// The keys of the site basics, as GET /api/odin/site sends them.
export const SITE_FIELDS = [
  'name', 'tagline', 'phone', 'email', 'address',
  'copyright', 'instagram', 'linkedin', 'logo_dark', 'logo_light',
];

// How long a page waits for Flask before it treats the content as unavailable.
const DEFAULT_TIME_LIMIT_MS = 8000;

// The content could not be used: the request failed or took too long, or Flask answered with
// something that is not the content. `cause` holds the request's error when there is one.
export class ContentUnavailableError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'ContentUnavailableError';
  }
}

// `flask` is Login's Backend for the Flask server (assets/js/login/backend.js). The page builds it
// and hands it in, so this module never imports config.js.
export function createContent(flask, { timeLimitMs = DEFAULT_TIME_LIMIT_MS } = {}) {
  return {
    // The site basics: the company name, how to reach it, its logos and the footer's lines.
    async site() {
      return textRecord(await ask(SITE_PATH), SITE_FIELDS, SITE_PATH);
    },

    // One page's sections. `name` is the page's name, such as home.
    async page(name) {
      const path = `${PAGE_PATH}?name=${encodeURIComponent(name)}`;
      return sectionList(await ask(path), path);
    },

    // The address of one of the website's images, by the file name a record gives for it.
    imageUrl(name) {
      return `${flask.baseUrl}${IMAGE_PATH}?name=${encodeURIComponent(name)}`;
    },
  };

  // Flask's answer to a GET of this path. A request that fails or takes too long is unavailable content.
  async function ask(path) {
    try {
      return await withTimeLimit(flask.request(path), timeLimitMs);
    } catch (cause) {
      throw new ContentUnavailableError(`GET ${path} gave no content`, { cause });
    }
  }
}

// The sections in an answer: a list with at least one, each an object with a name. What a section
// holds is checked where the page uses it, because sections differ.
function sectionList(answer, path) {
  const sections = answer !== null && typeof answer === 'object' ? answer.sections : undefined;
  const named = (section) => section !== null && typeof section === 'object' && typeof section.name === 'string';
  if (!Array.isArray(sections) || sections.length === 0 || !sections.every(named)) {
    throw new ContentUnavailableError(`GET ${path} answered without a list of sections`);
  }
  return sections;
}

// The named fields of an answer, each of which must be text that is not blank. Anything else in the
// answer is left out, so a field the backend adds later does not make the content unavailable.
function textRecord(answer, fields, path) {
  const record = {};
  for (const key of fields) {
    const held = answer !== null && typeof answer === 'object' && Object.hasOwn(answer, key);
    const text = held ? answer[key] : undefined;
    if (typeof text !== 'string' || text.trim() === '') {
      throw new ContentUnavailableError(`GET ${path} answered without text for ${key}`);
    }
    record[key] = text;
  }
  return record;
}

// Rejects when `request` has not settled in time. A server that accepts the connection and never
// answers would otherwise leave the page on its loading message.
function withTimeLimit(request, timeLimitMs) {
  let timer;
  const limit = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`No answer after ${timeLimitMs} ms`)), timeLimitMs);
  });
  return Promise.race([request, limit]).finally(() => clearTimeout(timer));
}
