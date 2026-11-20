---
layout: projects/odin/site
full_width: true
title: Home
permalink: /
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable -->
<div class="ocs__container ocs__container--fill" data-odin-page>
  <div role="status">
    <div data-odin-state="loading" hidden>
      <p class="ocs__text">Loading the page.</p>
    </div>
    <div data-odin-state="unavailable" hidden>
      <p class="ocs__callout">This page can't load right now. Please try again in a few minutes.</p>
    </div>
  </div>
  <div data-odin-state="ready" hidden>
    <section class="ocs__card" data-odin-section="hero">
      <div class="ocs__split odin__row">
        <div>
          <p class="ocs__lead" data-odin-field="kicker"></p>
          <h1 class="odin__title" data-odin-field="title"></h1>
          <p class="ocs__lead" data-odin-field="text"></p>
          <div class="ocs__links">
            <a class="ocs__btn large accent fill pill" href="#contact" data-odin-field="action"></a>
          </div>
        </div>
        <div class="ocs__image-frame ocs__image-frame--cover odin__photo">
          <img data-odin-image alt="">
        </div>
      </div>
    </section>

    <section class="ocs__card" data-odin-section="statistics">
      <h2 data-odin-field="title"></h2>
      <div class="ocs__stats odin__stats" data-odin-items>
        <template>
          <div>
            <span class="ocs__stat-value" data-odin-field="title"></span>
            <p class="ocs__text" data-odin-field="text"></p>
          </div>
        </template>
      </div>
    </section>

    <section class="ocs__card" data-odin-section="features">
      <div class="ocs__split odin__row">
        <div class="ocs__image-frame ocs__image-frame--cover odin__photo odin__photo--product">
          <img data-odin-image alt="">
        </div>
        <div class="ocs__stack" data-odin-items>
          <template>
            <div>
              <h3 data-odin-field="title"></h3>
              <p class="ocs__text" data-odin-field="text"></p>
            </div>
          </template>
        </div>
      </div>
    </section>

    <section class="ocs__card" data-odin-section="how_it_works">
      <div class="ocs__split odin__row">
        <div>
          <h2 data-odin-field="title"></h2>
          <p class="ocs__lead" data-odin-field="text"></p>
        </div>
        <div class="ocs__image-frame ocs__image-frame--cover odin__photo odin__photo--strip">
          <img data-odin-image alt="">
        </div>
      </div>
    </section>

    <div class="ocs__card">
      <section data-odin-section="pitch">
        <h2 data-odin-field="title"></h2>
        <p class="ocs__lead" data-odin-field="text"></p>
      </section>
      <hr>
      <section data-odin-section="fda">
        <h3 class="ocs__section-title" data-odin-field="title"></h3>
        <p class="ocs__text" data-odin-field="text"></p>
      </section>
    </div>

    {% include projects/odin/contact.html %}
  </div>
  <noscript>
    <p class="ocs__callout">This page needs JavaScript to load its content.</p>
  </noscript>
</div>

<script type="module">
  // Jekyll fills in the site's baseurl here. The odin modules are handed the Flask backend, so they
  // never import config.js themselves.
  import { fetchOptions, pythonURI } from '{{ site.baseurl }}/assets/js/api/config.js';
  import { Backend } from '{{ site.baseurl }}/assets/js/login/backend.js';
  import { createContent } from '{{ site.baseurl }}/assets/js/projects/odin/content.js';
  import { showPage } from '{{ site.baseurl }}/assets/js/projects/odin/page-view.js';

  const content = createContent(new Backend(pythonURI, fetchOptions));
  // The contact block's words are the backend's contact page, so that page is loaded here too.
  const load = async () => {
    const [home, contact, site] = await Promise.all([content.page('home'), content.page('contact'), content.site()]);
    return { sections: [...home, ...contact], site };
  };
  const shown = await showPage({ root: document.querySelector('[data-odin-page]'), load, imageUrl: content.imageUrl });
  // A link to a part of the page, such as #contact, arrives before that part is showing
  const target = shown && location.hash ? document.getElementById(location.hash.slice(1)) : null;
  if (target) target.scrollIntoView();
</script>
<!-- markdownlint-restore -->
