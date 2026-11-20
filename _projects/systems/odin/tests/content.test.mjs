import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Backend, BackendError } from '../../login/js/backend.js';
import { ContentUnavailableError, createContent } from '../js/content.js';

const SITE = {
  name: 'Example Company',
  tagline: 'An example tagline.',
  phone: '(555) 010-0000',
  email: 'hello@example.com',
  address: '1 Example St, Example City',
  copyright: 'Example Holdings. All rights reserved.',
  instagram: 'https://social.example/company',
  linkedin: 'https://network.example/company',
  logo_dark: 'logo-dark.svg',
  logo_light: 'logo-light.svg',
};

// A stand-in for Login's Backend that records each path and answers with `answer`, or throws it.
function fakeFlask(answer) {
  const paths = [];
  return {
    paths,
    async request(path) {
      paths.push(path);
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}

test('site() asks Flask for the site basics and returns them', async () => {
  const flask = fakeFlask(SITE);
  assert.deepEqual(await createContent(flask).site(), SITE);
  assert.deepEqual(flask.paths, ['/api/odin/site']);
});

const SECTIONS = [
  { name: 'hero', kicker: 'Example kicker', title: 'Example', text: 'One line.', action: 'Example action', image: 'hero.webp', image_alt: 'A lens.', items: [] },
  { name: 'features', kicker: null, title: null, text: null, action: null, image: null, image_alt: null, items: [{ title: 'Quick', text: 'Fast.' }] },
];

test('page() asks Flask for one page by name and returns its sections in order', async () => {
  const flask = fakeFlask({ page: 'home', sections: SECTIONS });
  assert.deepEqual(await createContent(flask).page('home'), SECTIONS);
  assert.deepEqual(flask.paths, ['/api/odin/page?name=home']);
});

test('page() writes the page name safely into the address', async () => {
  const flask = fakeFlask({ page: 'x', sections: SECTIONS });
  await createContent(flask).page('a b&c');
  assert.deepEqual(flask.paths, ['/api/odin/page?name=a%20b%26c']);
});

test('page() is unavailable when the answer is not a list of named sections', async () => {
  const answers = [null, 'home', [], {}, { sections: null }, { sections: [] }, { sections: 'hero' }, { sections: [null] }, { sections: [{ title: 'No name' }] }, { sections: [SECTIONS[0], { name: 5 }] }];
  for (const answer of answers) {
    await assert.rejects(createContent(fakeFlask(answer)).page('home'), (error) => {
      assert.ok(error instanceof ContentUnavailableError, JSON.stringify(answer));
      assert.match(error.message, /without a list of sections$/);
      return true;
    });
  }
});

test('page() is unavailable when Flask has no such page (404), and keeps the reason', async () => {
  const missing = new BackendError({ status: 404, method: 'GET', path: '/api/odin/page?name=home', body: { message: 'No ODIN page has that name.' } });
  await assert.rejects(createContent(fakeFlask(missing)).page('home'), (error) => {
    assert.ok(error instanceof ContentUnavailableError);
    assert.equal(error.cause, missing);
    return true;
  });
});

test('page() is unavailable when Flask has not answered within the time limit', async () => {
  const silent = { request: () => new Promise(() => {}) };
  await assert.rejects(createContent(silent, { timeLimitMs: 5 }).page('home'), ContentUnavailableError);
});

test('imageUrl builds the address of an image from its file name', () => {
  const content = createContent(new Backend('http://localhost:8587', {}));
  assert.equal(content.imageUrl('logo-dark.svg'), 'http://localhost:8587/api/odin/image?name=logo-dark.svg');
  assert.equal(content.imageUrl('a b&c.png'), 'http://localhost:8587/api/odin/image?name=a%20b%26c.png');
});

test('site() is unavailable when a field added later has no text yet', async () => {
  await assert.rejects(createContent(fakeFlask({ ...SITE, copyright: null })).site(), /without text for copyright$/);
});

test('site() leaves out anything else the answer holds', async () => {
  const answer = { ...SITE, id: 7, updated: null, message: 'ignored' };
  assert.deepEqual(await createContent(fakeFlask(answer)).site(), SITE);
});

test('site() is unavailable when Flask cannot be reached, and keeps the reason', async () => {
  const unreachable = new BackendError({ status: 0, method: 'GET', path: '/api/odin/site' });
  await assert.rejects(createContent(fakeFlask(unreachable)).site(), (error) => {
    assert.ok(error instanceof ContentUnavailableError);
    assert.equal(error.cause, unreachable);
    return true;
  });
});

test('site() is unavailable when Flask has no content yet (404)', async () => {
  const notSetUp = new BackendError({ status: 404, method: 'GET', path: '/api/odin/site', body: { message: 'not set up' } });
  await assert.rejects(createContent(fakeFlask(notSetUp)).site(), ContentUnavailableError);
});

test('site() is unavailable when the answer lacks text for one of the basics, and names it', async () => {
  const answers = [
    [null, 'name'],
    ['ODIN', 'name'],
    [[SITE], 'name'],
    [{}, 'name'],
    [{ message: 'Something else' }, 'name'],
    [{ ...SITE, phone: 5550100000 }, 'phone'],
    [{ ...SITE, tagline: '   ' }, 'tagline'],
    [{ ...SITE, address: undefined }, 'address'],
    [Object.create(SITE), 'name'],
  ];
  for (const [answer, key] of answers) {
    await assert.rejects(createContent(fakeFlask(answer)).site(), (error) => {
      assert.ok(error instanceof ContentUnavailableError, JSON.stringify(answer));
      assert.match(error.message, new RegExp(`without text for ${key}$`));
      return true;
    });
  }
});

test('site() is unavailable when Flask has not answered within eight seconds', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const silent = { request: () => new Promise(() => {}) };
  let outcome = 'waiting';
  const result = createContent(silent).site().catch((error) => { outcome = error; });

  t.mock.timers.tick(7999);
  await Promise.resolve();
  assert.equal(outcome, 'waiting');

  t.mock.timers.tick(1);
  await result;
  assert.ok(outcome instanceof ContentUnavailableError);
  assert.match(outcome.cause.message, /No answer after 8000 ms/);
});

test('site() takes the time limit it is given', async () => {
  const silent = { request: () => new Promise(() => {}) };
  await assert.rejects(createContent(silent, { timeLimitMs: 5 }).site(), ContentUnavailableError);
});

// The real Backend with a stand-in fetch: the request goes to the Flask base URL with the site's options.
test('site() works through Login\'s Backend', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(SITE), { status: 200 });
  });
  const flask = new Backend('http://localhost:8587', { credentials: 'include' });
  assert.deepEqual(await createContent(flask).site(), SITE);
  assert.deepEqual(calls, [{ url: 'http://localhost:8587/api/odin/site', options: { credentials: 'include', method: 'GET' } }]);
});

test('site() through Login\'s Backend is unavailable when the server is down', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('fetch failed');
  });
  const flask = new Backend('http://localhost:8587', {});
  await assert.rejects(createContent(flask).site(), (error) => {
    assert.ok(error instanceof ContentUnavailableError);
    assert.ok(error.cause instanceof BackendError);
    assert.equal(error.cause.status, 0);
    return true;
  });
});

test('site() through Login\'s Backend is unavailable when the answer is a page, not JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html><body>Not the API</body></html>', { status: 200 }));
  const flask = new Backend('http://localhost:8587', {});
  await assert.rejects(createContent(flask).site(), ContentUnavailableError);
});
