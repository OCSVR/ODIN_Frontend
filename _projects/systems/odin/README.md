# ODIN

ODIN is the website for ODIN Diagnostics. It is a registered system project like
[Login](../login/README.md): the sources live in this folder, and `make`
copies them to the paths Jekyll reads.

So far it has the layout every ODIN page uses (the shared OCS frame with ODIN's
footer), the scripts that read content from the backend, the three pages of the site (home,
About and Contact Us), the contact block that home and Contact Us share, and one
page that checks the connection.

## Content comes from the backend

The website's text, numbers and images belong in the Flask backend, and pages
load them from its API. Keep them out of this folder. Three kinds of words do
live here: the menus in `_config.yml`, each page's `title` in its front matter
(the browser tab's label and the page's entry in the top bar), and the loading
and error messages.

## The layout and the menus

A page uses the layout with `layout: projects/odin/site`. That layout is built
on the shared OCS layout, `opencs`, so an ODIN page has the same frame as every
OCS page: the OCS head, the top bar with the site menu and Login, and the page
column. The ODIN layout adds only the footer and the script that fills it.

The site menu is the OCS one: `minima.nav_pages` in `_config.yml` lists the ODIN
pages by their published paths, in menu order, and the top bar shows each page's
`title`. Sign-in is the shared Login page at `/login`, which signs in to the
same Flask backend the content comes from. The footer's two lists are under
`odin:` in `_config.yml`: `footer_nav` and `social`. `_includes/footer.html`
only loops over them. The menus show even when the backend is down.

The browser tab's title is the page's `title` and the site's `title` from
`_config.yml`, written by the shared head.

The footer's logo, tagline, social link addresses and copyright line come from
the site basics. Each part that shows them is marked `data-odin-frame` and stays
hidden until `js/site-frame.js` has filled it. The logo suits the background it
sits on: the light logo on a dark one and the dark logo on a light one. It is
picked again if the theme is applied or changed after the page has loaded.

A page's main heading is an `h1`. Another project's stylesheet hides every `h1`
on the site, and `sass/main.scss` shows them again inside the ODIN layout.

Styles are in `sass/main.scss`. Every color is a theme variable, and the classes
start with `odin__`. Page content uses the shared OCS grammar. The pages add a
few `odin__` classes where the grammar has none: the hero's sizes, text with line
breaks in it and the partner logo.

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
    per item of the section. In the template, `data-odin-field` takes the item's
    `title`, `text`, `subtitle` or `note`. It can also take the section's
    `action`, for a label every item shares. `data-odin-href="link"` takes the
    item's link. `data-odin-image` takes the item's image and its description.
    An item must have its `title` and `text`. The rest are optional: the place
    for a missing `subtitle`, `note` or image is removed from that item's copy,
    and a name whose item has no link shows as plain text.

  Anywhere inside the element handed to `showPage`, `data-odin-basic="<key>"`
  takes a site basic, such as `phone`. Add `data-odin-opens="tel"` or `"mailto"`
  to make it a link that opens the phone or email app. Text that makes no clean
  link, such as a number with an extension, is shown without one. `load`
  resolves to `{ sections, site }`, and `site` is only needed by a page that
  shows site basics.

  The backend must send text for every part the markup asks for, or the whole
  page is unavailable. Do not nest one section's element in another's: a section
  fills every mark inside its element. A page can show sections of more than one
  backend page, as long as no two have the same name.
- `js/site-frame.js` runs the footer: `startFrame` fills the parts marked
  `data-odin-frame` and picks the logos. It also
  tells any element marked `data-odin-backdrop` whether what is behind it is
  `dark` or `light`, which the styles use to turn the white partner logo dark on
  a light theme.

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
is read out as one announcement. On the home, About and Contact Us pages all
three start hidden, so a visitor without JavaScript sees only the note that the
page needs it.

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
backend's `contact` page and the site basics, as `pages/home.md` and
`pages/contact.md` do.

`pages/about.md` is the About page, at `/about/`: the title and the mission. It
took the place of the template's own `navigation/about.md`, which was removed
with its photos in `images/about/` and its `nav_pages` entry in `_config.yml`.
Keep that file from coming back, or two pages claim `/about/`.

`pages/contact.md` is the Contact Us page, at `/contact/`: the page's title and
the line under it, then the contact block.

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
`make`. The home page is at `http://localhost:4500/ODIN_Frontend/`, with About at
`/ODIN_Frontend/about/`, Contact Us at `/ODIN_Frontend/contact/` and the
connection check at `/ODIN_Frontend/odin/connection/`.
Stop Flask and
reload to see the unavailable message.
