# ODIN

ODIN is the website for ODIN Diagnostics. It is a registered system project like
[Login](../login/README.md): the sources live in this folder, and `make`
copies them to the paths Jekyll reads.

So far it has the layout every ODIN page uses (header, menu and footer), the
scripts that read content from the backend, the home page, the contact block the
home page shares with the Contact Us page, and one page that checks the
connection. The About and Contact Us pages come in later tasks.

## Content comes from the backend

The website's text, numbers and images belong in the Flask backend, and pages
load them from its API. Keep them out of this folder.

## The layout and the menus

A page uses the layout with `layout: projects/odin/site`. The layout has its own
small head (the site stylesheet, the theme fonts and `user-preferences.js`) and
none of the OCS navbar, sign-in or analytics.

The menus are lists under `odin:` in `_config.yml`: `nav` for the header, and
`social` and `footer_nav` for the footer. `_includes/header.html` and
`_includes/footer.html` only loop over them, so adding a page to a menu is one
line of config. The menus show even when the backend is down.

The logo, tagline, social link addresses and copyright line come from the site
basics. Each part that shows them is marked `data-odin-frame` and stays hidden
until `js/site-frame.js` has filled it. The company's name is added to the page
title the same way. The logo suits the background it sits on: the light logo on
a dark one and the dark logo on a light one. It is picked again if the theme is
applied or changed after the page has loaded.

A page's main heading is an `h1`. Another project's stylesheet hides every `h1`
on the site, and `sass/main.scss` shows them again inside the ODIN layout.

Styles are in `sass/main.scss`. Every color is a theme variable, and the classes
start with `odin__`. Page content uses the shared OCS grammar. The pages add a
few `odin__` classes for sizes the grammar does not have.

## The scripts

- `js/content.js` asks Flask for content. `createContent(flask).site()` returns
  the ten site basics from `GET /api/odin/site`, such as `name`, `phone` and
  `logo_dark`. It throws `ContentUnavailableError` when Flask is down, takes
  longer than eight seconds, or answers without text for one of them.
  `page(name)` returns the sections of one page from
  `GET /api/odin/page?name=<name>`. It throws the same error when the answer is
  not a list of named sections.
  `imageUrl(name)` gives the address of an image by its file name.
- `js/content-view.js` shows a record in the page. `showContent` shows one of
  three blocks marked `data-odin-state`: `loading`, `ready` or `unavailable`.
  It fills the marked elements: `data-odin-field` for text and `data-odin-href`
  for a link, which must be an https address. When the content cannot be loaded
  the visitor sees the unavailable block and no content.
- `js/page-view.js` shows a page built from sections. `showPage` uses the same
  three blocks. Each section's element is marked `data-odin-section="<name>"`,
  and inside it:
  - `data-odin-field="<part>"` takes a part's text: `kicker`, `title`, `text` or
    `action`.
  - `data-odin-href="link"` takes the section's link.
  - `data-odin-image` takes the section's image and its description.
  - `data-odin-items` marks a list. The `<template>` inside it is copied once
    per item of the section, and `data-odin-field` in the template takes the
    item's `title` and `text`.

  Anywhere on the page, `data-odin-basic="<key>"` takes a site basic, such as
  `phone`. Add `data-odin-opens="tel"` or `"mailto"` to make it a link that
  opens the phone or email app. `load` resolves to `{ sections, site }`, and
  `site` is only needed by a page that shows site basics.

  A part the markup asks for must be there with text in it, or the whole page is
  unavailable. Keep one section's element out of another's, because a section
  fills every mark inside its element.
- `js/site-frame.js` runs the header and footer: `startFrame` starts the phone
  menu, fills the parts marked `data-odin-frame` and picks the logos.

A page's own script imports `assets/js/api/config.js` and Login's
`assets/js/login/backend.js` with `{{ site.baseurl }}`, builds the Flask backend
and hands it to these modules, as `pages/connection.md` does. The modules never
import `config.js`. `page-view.js` imports `content-view.js` with a `./` path. Do
the same for any other import between the modules.

The wording of the loading and unavailable blocks is in the page's markup. A
page needs all three blocks. Put each state on a plain `div`, because a class
that sets `display` would override the `hidden` attribute. Give the element
around the loading and unavailable blocks `role="status"`, so a screen reader
announces those two messages. Keep the ready block outside it, or the whole page
is read out as one announcement. On the home page all three start hidden, so a
visitor without JavaScript sees only the note that the page needs it.

## Resources

`distribution.json` lists each source and where it is published. Each
destination must be an `odin` folder inside one of the shared `projects/` folders;
`tests/distribution.test.mjs` checks this. `scripts/publish_project.rb`
(`DESTINATIONS`) lists the top-level folders any manifest may publish under. Git
ignores the published copies (see "Project distributions" in `.gitignore`), so
edit the sources here.

| Source | Published destination |
| --- | --- |
| `pages/` | `navigation/projects/odin/` |
| `layouts/` | `_layouts/projects/odin/` |
| `_includes/` | `_includes/projects/odin/` |
| `js/` | `assets/js/projects/odin/` |
| `sass/main.scss` | `_sass/projects/odin/main.scss` |

`_includes/contact.html` is the contact block. A page that includes it loads the
backend's `contact` page and the site basics, as `pages/home.md` does.

`pages/home.md` is the home page, at the site root. It took the place of the
template's placeholder `index.md`, so keep the root free of another index page.

`pages/connection.md` is the connection check. Its permalink is
`/odin/connection/`, which `baseurl` puts at `/ODIN_Frontend/odin/connection/`.
It is for the team and is left out of the menu and of search.

The system is registered as `systems/odin:dev` in `_projects/.makeprojects` and
uses the generated Makefile.

## Validation

```sh
make generate-makefiles
make -C _projects/systems/odin build
node --test _projects/systems/odin/tests/*.test.mjs
```

To check the pages in a browser, start Flask on port 8587 and the site with
`make`. The home page is at `http://localhost:4500/ODIN_Frontend/` and the
connection check at `http://localhost:4500/ODIN_Frontend/odin/connection/`.
Stop Flask and
reload to see the unavailable message.
