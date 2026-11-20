---
layout: projects/odin/site
title: Home
description: ODIN Diagnostics, eye-tracking technology for concussion assessments.
permalink: /
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable -->
<div class="ocs__container" data-odin-page role="status">
  <div data-odin-state="loading">
    <p class="ocs__text">Loading the page.</p>
  </div>
  <div data-odin-state="unavailable" hidden>
    <p class="ocs__callout">This page's content is unavailable. The backend did not answer, or it has no content yet.</p>
  </div>
  <div data-odin-state="ready" hidden>
    <section class="odin__hero" data-odin-section="hero">
      <div>
        <p class="odin__kicker" data-odin-field="kicker"></p>
        <h1 class="odin__hero-title" data-odin-field="title"></h1>
        <p class="ocs__lead" data-odin-field="text"></p>
        <a class="ocs__btn medium accent fill" href="#contact" data-odin-field="action"></a>
      </div>
      <img class="odin__hero-image" data-odin-image alt="">
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
