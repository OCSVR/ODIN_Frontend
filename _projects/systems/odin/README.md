# ODIN

ODIN is the website for ODIN Diagnostics. It is a registered system project like
[Login](../login/README.md): the sources live in this folder, and `make`
copies them to the paths Jekyll reads.

So far it has the layout every ODIN page uses (header, menu and footer), the
scripts that read content from the backend, and one page that checks the
connection. The site's own pages come in later tasks.

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
start with `odin__`. Page content uses the shared OCS grammar.

## The scripts

- `js/content.js` asks Flask for content. `createContent(flask).site()` returns
  the ten site basics from `GET /api/odin/site`, such as `name`, `phone` and
  `logo_dark`. It throws `ContentUnavailableError` when Flask is down, takes
  longer than eight seconds, or answers without text for one of them.
  `imageUrl(name)` gives the address of an image by its file name.
- `js/content-view.js` shows a record in the page. `showContent` shows one of
  three blocks marked `data-odin-state`: `loading`, `ready` or `unavailable`.
  It fills the marked elements: `data-odin-field` for text and `data-odin-href`
  for a link, which must be an https address. When the content cannot be loaded
  the visitor sees the unavailable block and no content.
- `js/site-frame.js` runs the header and footer: `startFrame` starts the phone
  menu, fills the parts marked `data-odin-frame` and picks the logos.

A page's own script imports `assets/js/api/config.js` and Login's
`assets/js/login/backend.js` with `{{ site.baseurl }}`, builds the Flask backend
and hands it to these modules, as `pages/connection.md` does. The modules never
import `config.js`. If one later imports the other, use a `./` path.

The wording of the loading and unavailable blocks is in the page's markup. A
page needs all three blocks. Put each state on a plain `div`, because a class
that sets `display` would override the `hidden` attribute, and give the
element around them `role="status"` so a screen reader announces the change.

## Resources

`distribution.json` lists each source and where it is published. Each
destination must be an `odin` folder inside one of the shared `projects/` roots.
`scripts/publish_project.rb` lists the roots a manifest may use. Git ignores those
published copies (see "Project distributions" in `.gitignore`), so edit the sources here.

| Source | Published destination |
| --- | --- |
| `pages/` | `navigation/projects/odin/` |
| `layouts/` | `_layouts/projects/odin/` |
| `_includes/` | `_includes/projects/odin/` |
| `js/` | `assets/js/projects/odin/` |
| `sass/main.scss` | `_sass/projects/odin/main.scss` |

`pages/connection.md` is the connection check at `/odin/connection/`. It is for
the team and is left out of the menu and of search.

The system is registered as `systems/odin:dev` in `_projects/.makeprojects` and
uses the generated Makefile.

## Validation

```sh
make generate-makefiles
make -C _projects/systems/odin build
node --test _projects/systems/odin/tests/*.test.mjs
```

To check the connection in a browser, start Flask on port 8587 and the site
with `make`, then open `http://localhost:4500/odin/connection/`. Stop Flask and
reload to see the unavailable message.
