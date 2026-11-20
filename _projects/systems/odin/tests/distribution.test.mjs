import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SITE_FIELDS } from '../js/content.js';

const system = new URL('../', import.meta.url);
const root = new URL('../../../../', import.meta.url);

// The shared project roots a manifest may publish to, each of which Git ignores (see .gitignore).
const ODIN_FOLDER = /^(navigation|_includes|_layouts|_data|_plugins|_posts|_sass|assets\/js|assets\/css)\/projects\/odin(\/|$)/;

// The one form of import a page uses: named imports, single quotes, the site's baseurl.
const PAGE_IMPORT = /^\s*import \{([^}]*)\} from '\{\{ site\.baseurl \}\}\/([^']+)';$/;

function distribution() {
  return JSON.parse(readFileSync(new URL('distribution.json', system), 'utf8')).files;
}

// The source file behind a published path: this system's own script, a file tracked at that path,
// or a file another system's manifest publishes there.
function sourceOf(path) {
  if (path.startsWith('assets/js/projects/odin/')) return new URL(`js/${path.slice('assets/js/projects/odin/'.length)}`, system);
  if (existsSync(new URL(path, root))) return new URL(path, root);
  const systems = new URL('_projects/systems/', root);
  for (const name of readdirSync(systems)) {
    const manifest = new URL(`${name}/distribution.json`, systems);
    if (!existsSync(manifest)) continue;
    const entry = JSON.parse(readFileSync(manifest, 'utf8')).files.find(({ destination }) => destination === path);
    if (entry) return new URL(`${name}/${entry.source}`, systems);
  }
  return null;
}

test('odin is registered once, as a project that make dev builds', () => {
  const registered = readFileSync(new URL('_projects/.makeprojects', root), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.split(':')[0] === 'systems/odin');
  assert.deepEqual(registered, ['systems/odin:dev']);
});

test('distribution.json holds a list of files', () => {
  assert.ok(Array.isArray(distribution()), 'files is not a list');
});

test('every odin source in distribution.json exists in the system', () => {
  for (const { source } of distribution()) {
    assert.ok(existsSync(new URL(source, system)), `missing source ${source}`);
  }
});

// A copy published anywhere else could be committed by mistake, or overwrite another system's file.
test('every odin file is published inside an ignored odin project folder', () => {
  for (const { destination } of distribution()) {
    assert.match(destination, ODIN_FOLDER, `${destination} is not inside an odin project folder`);
    assert.ok(!destination.split('/').includes('..'), `${destination} steps out of its folder`);
  }
});

test('each folder is published where the site looks for it', () => {
  const published = Object.fromEntries(distribution().map(({ source, destination }) => [source, destination]));
  assert.deepEqual(published, {
    pages: 'navigation/projects/odin',
    layouts: '_layouts/projects/odin',
    _includes: '_includes/projects/odin',
    js: 'assets/js/projects/odin',
    'sass/main.scss': '_sass/projects/odin/main.scss',
  });
});

// The layout and its pages name each other by these paths, so a rename breaks the build.
test('every page uses the odin layout, and the layout includes the header and footer that exist', () => {
  for (const name of readdirSync(new URL('pages/', system)).filter((file) => file.endsWith('.md'))) {
    assert.match(readFileSync(new URL(`pages/${name}`, system), 'utf8'), /^layout: projects\/odin\/site$/m, `${name} does not use the odin layout`);
  }
  const layout = readFileSync(new URL('layouts/site.html', system), 'utf8');
  for (const [, file] of layout.matchAll(/\{%-? include projects\/odin\/([\w.-]+) -?%\}/g)) {
    assert.ok(existsSync(new URL(`_includes/${file}`, system)), `the layout includes ${file}, which is not in _includes/`);
  }
  assert.match(layout, /include projects\/odin\/header\.html/);
  assert.match(layout, /include projects\/odin\/footer\.html/);
});

// The menus are lists in _config.yml, so adding a page never means editing HTML.
test('the menus come from _config.yml, and the header and footer only loop over them', () => {
  const config = readFileSync(new URL('_config.yml', root), 'utf8');
  const block = config.slice(config.indexOf('\nodin:\n'));
  assert.ok(block.startsWith('\nodin:\n'), '_config.yml has no odin block');
  const items = [...block.matchAll(/^\s+- \{ title: "([^"]+)", url: "([^"]+)" \}$/gm)].map(([, title, url]) => ({ title, url }));
  assert.ok(items.length >= 2, 'the odin menus list fewer than two pages');
  for (const { title, url } of items) assert.match(url, /^\/([\w-]+\/)*$/, `${title} has the address ${url}`);

  const header = readFileSync(new URL('_includes/header.html', system), 'utf8');
  const footer = readFileSync(new URL('_includes/footer.html', system), 'utf8');
  assert.match(header, /for item in site\.odin\.nav/);
  assert.match(footer, /for item in site\.odin\.footer_nav\.items/);
  for (const { title } of items) {
    assert.ok(!header.includes(`>${title}<`), `the header writes the menu item ${title} itself`);
    assert.ok(!footer.includes(`>${title}<`), `the footer writes the menu item ${title} itself`);
  }
});

// A social link whose field the backend does not send would keep the whole footer part hidden.
test('the footer\'s social links come from _config.yml, each naming a field the backend sends', () => {
  const config = readFileSync(new URL('_config.yml', root), 'utf8');
  const block = config.slice(config.indexOf('\nodin:\n'));
  const links = [...block.matchAll(/^\s+- \{ title: "([^"]+)", field: "([^"]+)" \}$/gm)].map(([, title, field]) => ({ title, field }));
  assert.ok(links.length >= 1, 'the odin block lists no social link');
  for (const { title, field } of links) assert.ok(SITE_FIELDS.includes(field), `${title} names the field ${field}, which is not a site basic`);

  const footer = readFileSync(new URL('_includes/footer.html', system), 'utf8');
  assert.match(footer, /for item in site\.odin\.social/);
  assert.match(footer, /data-odin-href="\{\{ item\.field \}\}"/);
  for (const { title } of links) assert.ok(!footer.includes(`>${title}<`), `the footer writes the social link ${title} itself`);
});

// The company's name is content. The script adds it to the title once the backend has sent it.
test('the layout leaves the company\'s name out of the page title', () => {
  const layout = readFileSync(new URL('layouts/site.html', system), 'utf8');
  assert.match(layout, /<title>\{\{ page\.title \| escape \}\}<\/title>/);
  assert.ok(!layout.includes('site.title'), 'the layout prints the site title from _config.yml');
});

// Two pages with one address would leave it to chance which one the site shows.
test('the ODIN home page is the only page at the site root', () => {
  const home = readFileSync(new URL('pages/home.md', system), 'utf8');
  assert.match(home, /^permalink: \/$/m, 'pages/home.md is not at the site root');
  for (const name of ['index.md', 'index.markdown', 'index.html']) {
    assert.ok(!existsSync(new URL(name, root)), `${name} at the repo root would also claim the site root`);
  }
});

// A misspelled mark makes its page unavailable for every visitor, so the marks are checked here.
const SECTION_PARTS = ['kicker', 'title', 'text', 'action'];
// The other parts an item of a list can have
const ITEM_PARTS = ['subtitle', 'note'];
// The sections the backend's pages have, by name. A page may only mark one of these.
const BACKEND_SECTIONS = ['hero', 'statistics', 'features', 'how_it_works', 'pitch', 'fda', 'intro', 'mission', 'team', 'details', 'phone', 'email', 'address'];

test('each page has all three state blocks', () => {
  for (const name of readdirSync(new URL('pages/', system)).filter((file) => file.endsWith('.md'))) {
    const markup = readFileSync(new URL(`pages/${name}`, system), 'utf8');
    const states = [...markup.matchAll(/data-odin-state="([^"]+)"/g)].map(([, state]) => state).sort();
    assert.deepEqual(states, ['loading', 'ready', 'unavailable'], `${name} does not have the three state blocks`);
  }
});

test('the pages and the contact block name only parts the backend sends', () => {
  const files = [...readdirSync(new URL('pages/', system)).map((name) => `pages/${name}`), '_includes/contact.html'];
  for (const name of files) {
    const markup = readFileSync(new URL(name, system), 'utf8');
    const marked = (attribute) => [...markup.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g'))].map(([, value]) => value);
    assert.ok(marked('data-odin-field').length > 0, `${name} marks no field`);
    // Only the connection check shows the site basics as fields. A page built from sections shows
    // them with data-odin-basic, because a field inside a section's element is one of its parts.
    const fields = name === 'pages/connection.md' ? SITE_FIELDS : [...SECTION_PARTS, ...ITEM_PARTS];
    for (const field of marked('data-odin-field')) {
      assert.ok(fields.includes(field), `${name} marks the field ${field}, which it would not be given`);
    }
    for (const section of marked('data-odin-section')) {
      assert.ok(BACKEND_SECTIONS.includes(section), `${name} marks the section ${section}, which no backend page has`);
    }
    for (const basic of marked('data-odin-basic')) {
      assert.ok(SITE_FIELDS.includes(basic), `${name} shows the site basic ${basic}, which the backend does not send`);
    }
    for (const opens of marked('data-odin-opens')) {
      assert.ok(['tel', 'mailto'].includes(opens), `${name} asks for a ${opens} link, which page-view.js cannot make`);
    }
    for (const link of marked('data-odin-href')) {
      assert.ok([...SITE_FIELDS, 'link'].includes(link), `${name} marks the link ${link}, which the backend does not send`);
    }
  }
});

// A menu entry with no page behind it is a dead link on every page of the site.
test('every page in the ODIN menus exists, at the address the menu gives', () => {
  const config = readFileSync(new URL('_config.yml', root), 'utf8');
  const block = config.slice(config.indexOf('\nodin:\n'));
  const menu = [...block.matchAll(/^\s+- \{ title: "([^"]+)", url: "([^"]+)" \}$/gm)].map(([, title, url]) => ({ title, url }));
  const permalinks = readdirSync(new URL('pages/', system))
    .map((name) => readFileSync(new URL(`pages/${name}`, system), 'utf8').match(/^permalink: (\S+)$/m)?.[1]);
  assert.ok(menu.length >= 3, 'the ODIN menus list fewer than three entries');
  for (const { title, url } of menu) {
    assert.ok(permalinks.includes(url), `the menu entry ${title} leads to ${url}, which no ODIN page has`);
  }
});

// The hero's button jumps to the contact block, which the home page includes.
test('the home page includes the contact block that its button leads to', () => {
  const home = readFileSync(new URL('pages/home.md', system), 'utf8');
  const block = readFileSync(new URL('_includes/contact.html', system), 'utf8');
  assert.match(home, /href="#contact"/);
  assert.match(home, /\{% include projects\/odin\/contact\.html %\}/);
  assert.match(block, /id="contact"/);
});

// The site is served under a base address (/ODIN_Frontend), so a link printed without it is broken.
test('every link the header and footer print goes through relative_url', () => {
  for (const file of ['header.html', 'footer.html']) {
    const markup = readFileSync(new URL(`_includes/${file}`, system), 'utf8');
    // \s keeps data-odin-href out: that one names a field, and the script fills in its address
    const links = [...markup.matchAll(/\shref="([^"]*)"/g)].map(([, address]) => address);
    assert.ok(links.length > 0, `${file} prints no link`);
    for (const address of links) {
      assert.match(address, /^\{\{ .*\| relative_url \}\}$/, `${file} prints the link ${address} without relative_url`);
    }
  }
});

// A page whose import does not resolve stays on its loading message, so check every one: the file
// exists where the page asks for it, and it exports the names the page imports. An import written
// any other way fails here, so it cannot go unchecked.
test('each odin page and layout imports scripts that exist, by names they export', () => {
  const sources = ['pages', 'layouts'].flatMap((folder) => readdirSync(new URL(`${folder}/`, system))
    .filter((name) => name.endsWith('.md') || name.endsWith('.html'))
    .map((name) => `${folder}/${name}`));
  assert.ok(sources.some((name) => name.startsWith('pages/')) && sources.includes('layouts/site.html'), 'no page or layout found');
  for (const name of sources) {
    const lines = readFileSync(new URL(name, system), 'utf8').split('\n').filter((line) => /^\s*import\b/.test(line));
    assert.ok(lines.length > 0, `${name} imports no script`);
    for (const line of lines) {
      const match = line.match(PAGE_IMPORT);
      assert.ok(match, `${name}: this test cannot read the import "${line.trim()}"`);
      const [, list, path] = match;
      const source = sourceOf(path);
      assert.ok(source && existsSync(source), `${name} imports ${path}, which no file or system publishes`);
      const code = readFileSync(source, 'utf8');
      const exported = new Set([...code.matchAll(/^export (?:async )?(?:function|class|const|var|let) (\w+)/gm)].map((found) => found[1]));
      for (const wanted of list.split(',').map((part) => part.trim()).filter(Boolean)) {
        assert.ok(exported.has(wanted), `${name} imports ${wanted} from ${path}, which does not export it`);
      }
    }
  }
});
