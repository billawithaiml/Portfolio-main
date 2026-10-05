/* Comments: loads approved comments, posts new ones (held for moderation). */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var root = document.querySelector(".comments[data-slug]");
    if (!root) return;
    var slug = root.dataset.slug;
    var api = root.dataset.api || "/api/v1";
    var sitekey = root.dataset.turnstileSitekey;
    var list = root.querySelector("[data-comments-list]");
    var form = root.querySelector("[data-comment-form]");
    var status = root.querySelector("[data-status]");
    var counter = root.querySelector("[data-counter]");
    var slot = root.querySelector("[data-turnstile-slot]");
    var countEl = root.querySelector("[data-comment-count]");
    var heroLink = document.querySelector("[data-comment-count-hero]");
    var heroDot = document.querySelector(".post-comments-hero__dot");
    var token = "";
    var widgetId = null;

    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    // Safe renderer: ```block``` and `inline` code, everything else plain text.
    function renderBody(text) {
      var box = el("div", "comment__body");
      text.split(/(```[\s\S]*?```)/g).forEach(function (part) {
        if (!part) return;
        if (part.indexOf("```") === 0 && part.length >= 6) {
          var pre = el("pre", "comment__code-block");
          pre.appendChild(el("code", "", part.slice(3, -3).replace(/^\n/, "")));
          box.appendChild(pre);
        } else {
          var p = el("p");
          part.split(/(`[^`\n]+`)/g).forEach(function (seg) {
            if (!seg) return;
            if (seg.length > 2 && seg[0] === "`" && seg[seg.length - 1] === "`")
              p.appendChild(el("code", "comment__code-inline", seg.slice(1, -1)));
            else p.appendChild(document.createTextNode(seg));
          });
          box.appendChild(p);
        }
      });
      return box;
    }

    function ago(ts) {
      var s = Math.floor((Date.now() - ts) / 1000);
      if (s < 60) return "just now";
      if (s < 3600) return Math.floor(s / 60) + "m ago";
      if (s < 86400) return Math.floor(s / 3600) + "h ago";
      if (s < 2592000) return Math.floor(s / 86400) + "d ago";
      return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }

    function render(comments) {
      list.textContent = "";
      var n = comments.length;
      if (countEl) { countEl.textContent = n; countEl.hidden = !n; }
      if (heroLink) {
        heroLink.hidden = !n;
        if (heroDot) heroDot.hidden = !n;
        var c = heroLink.querySelector("[data-count]");
        if (c) c.textContent = n;
      }
      if (!n) {
        var li = el("li", "comments__empty");
        li.appendChild(el("strong", "", "No comments yet. "));
        li.appendChild(document.createTextNode("Be the first."));
        list.appendChild(li);
        return;
      }
      comments.forEach(function (c) {
        var li = el("li", "comment");
        var head = el("div", "comment__head");
        head.appendChild(el("span", "comment__avatar", (c.name || "A").charAt(0).toUpperCase()));
        head.appendChild(el("span", "comment__author", c.name));
        var t = el("time", "comment__time", ago(c.created_at));
        t.setAttribute("datetime", new Date(c.created_at).toISOString());
        head.appendChild(t);
        li.appendChild(head);
        li.appendChild(renderBody(c.body));
        list.appendChild(li);
      });
    }

    function load() {
      fetch(api + "/comments/" + encodeURIComponent(slug))
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) { render(d.comments || []); })
        .catch(function () {
          list.textContent = "";
          list.appendChild(el("li", "comments__error", "Comments could not be loaded right now."));
        });
    }

    function initTurnstile() {
      if (!sitekey || !slot) return;
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = function () {
        widgetId = window.turnstile.render(slot, {
          sitekey: sitekey,
          callback: function (t) { token = t; },
          "expired-callback": function () { token = ""; },
        });
      };
      document.head.appendChild(s);
    }

    var body = form.querySelector("[name=body]");
    body.addEventListener("input", function () {
      var left = 2000 - body.value.length;
      counter.hidden = left > 300;
      counter.textContent = left + " left";
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector("[name=name]").value;
      var text = body.value.trim();
      var btn = form.querySelector(".comment-form__submit");
      if (!text) { status.textContent = "Write something first."; return; }
      if (sitekey && !token) { status.textContent = "Please complete the spam check."; return; }
      btn.disabled = true;
      status.textContent = "Posting...";
      fetch(api + "/comments/" + encodeURIComponent(slug), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name, body: text, turnstile: token, website: "" }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.d.error || "Failed");
          status.textContent = "Thanks! Your comment will appear after review.";
          body.value = "";
          counter.hidden = true;
        })
        .catch(function (err) { status.textContent = err.message || "Something went wrong."; })
        .then(function () {
          btn.disabled = false;
          token = "";
          if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
        });
    });

    load();
    initTurnstile();
  });
})();
