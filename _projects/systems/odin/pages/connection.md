---
layout: projects/odin/site
title: ODIN connection check
description: Checks that the ODIN frontend can read the site basics from the Flask backend.
permalink: /odin/connection/
hide: true
search_exclude: true
show_reading_time: false
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable -->
<div class="ocs__container">
  <h1 class="ocs__section-title">{{ page.title | escape }}</h1>
  <p class="ocs__description">This page asks the Flask backend for the site basics and shows what comes back. It is for the team, to confirm that the two repositories are connected.</p>
  <div class="ocs__card" data-odin-site role="status">
    <div data-odin-state="loading">
      <p class="ocs__text">Loading the site content.</p>
    </div>
    <div data-odin-state="unavailable" hidden>
      <p class="ocs__text">The site content is unavailable. The backend did not answer, or it has no content yet.</p>
    </div>
    <div data-odin-state="ready" hidden>
      <h3 data-odin-field="name"></h3>
      <p class="ocs__lead" data-odin-field="tagline"></p>
      <div class="ocs__table-wrap">
        <table class="ocs__table">
          <tbody>
            <tr><th scope="row">Phone</th><td data-odin-field="phone"></td></tr>
            <tr><th scope="row">Email</th><td data-odin-field="email"></td></tr>
            <tr><th scope="row">Address</th><td data-odin-field="address"></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <noscript>
    <p class="ocs__callout">This page needs JavaScript to load the site content.</p>
  </noscript>
</div>

<script type="module">
  // Jekyll fills in the site's baseurl here. The odin modules are handed the Flask backend, so they
  // never import config.js themselves.
  import { fetchOptions, pythonURI } from '{{ site.baseurl }}/assets/js/api/config.js';
  import { Backend } from '{{ site.baseurl }}/assets/js/login/backend.js';
  import { createContent } from '{{ site.baseurl }}/assets/js/projects/odin/content.js';
  import { showContent } from '{{ site.baseurl }}/assets/js/projects/odin/content-view.js';

  const content = createContent(new Backend(pythonURI, fetchOptions));
  showContent({ root: document.querySelector('[data-odin-site]'), load: () => content.site() });
</script>
<!-- markdownlint-restore -->
