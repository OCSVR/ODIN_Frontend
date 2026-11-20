---
layout: projects/odin/site
full_width: true
title: Contact Us
permalink: /contact/
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
    <section class="ocs__card" data-odin-section="intro">
      <h1 class="odin__title" data-odin-field="title"></h1>
      <p class="ocs__lead" data-odin-field="text"></p>
    </section>

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
  const load = async () => {
    const [sections, site] = await Promise.all([content.page('contact'), content.site()]);
    return { sections, site };
  };
  showPage({ root: document.querySelector('[data-odin-page]'), load, imageUrl: content.imageUrl });
</script>
<!-- markdownlint-restore -->
