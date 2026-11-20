---
layout: projects/odin/site
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
    <section class="ocs__split odin__hero" data-odin-section="hero">
      <div>
        <p class="ocs__text odin__kicker" data-odin-field="kicker"></p>
        <h1 class="odin__hero-title" data-odin-field="title"></h1>
        <p class="ocs__lead" data-odin-field="text"></p>
        <a class="ocs__btn medium accent fill" href="#contact" data-odin-field="action"></a>
      </div>
      <div>
        <img class="odin__hero-image" data-odin-image alt="">
      </div>
    </section>
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
  showPage({ root: document.querySelector('[data-odin-page]'), load: () => content.page('home'), imageUrl: content.imageUrl });
</script>
<!-- markdownlint-restore -->
