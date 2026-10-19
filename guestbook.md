---
title: 방명록
layout: page
permalink: /guestbook/
---

{% assign remark_host = site.comments.remark42.host | default: '' %}
{% assign remark_site_id = site.comments.remark42.site_id | default: site.github.username | default: site.title %}
{% assign remark_locale = site.comments.remark42.locale | default: 'ko' %}
{% assign remark_simple_view = site.comments.remark42.simple_view | default: false %}
{% assign remark_show_email_subscription = site.comments.remark42.show_email_subscription | default: false %}
{% assign remark_show_rss_subscription = site.comments.remark42.show_rss_subscription | default: false %}
{% assign remark_no_footer = site.comments.remark42.no_footer | default: true %}
{% assign remark_page_url = page.url | absolute_url %}

{% if remark_host != empty %}
  <div class="remark42-comments-embed" id="remark42"></div>

  <style>
    .remark42-comments-header {
      display: none !important;
    }
  </style>

  <script>
    var remark_config = {
      host: {{ remark_host | jsonify }},
      site_id: {{ remark_site_id | jsonify }},
      components: ['embed'],
      url: {{ remark_page_url | jsonify }},
      theme: (function() {
        if (window.Theme && Theme.visualState) {
          return Theme.visualState === Theme.DARK ? 'dark' : 'light';
        }
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      })(),
      locale: {{ site.comments.remark42.locale | default: 'ko' | jsonify }},
      simple_view: {{ remark_simple_view | jsonify }},
      show_email_subscription: {{ remark_show_email_subscription | jsonify }},
      show_rss_subscription: {{ remark_show_rss_subscription | jsonify }},
      no_footer: {{ remark_no_footer | jsonify }},
      auth_redirect: true
    };

    (function() {
      var d = document, s = d.createElement('script');
      s.src = remark_config.host + '/web/embed.js';
      s.defer = true;
      (d.head || d.body).appendChild(s);
    })();
  </script>
{% endif %}
