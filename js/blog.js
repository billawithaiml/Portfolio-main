/**
 * Blog interactivity: reading progress, TOC scrollspy, code copy, share,
 * view counts, tag filtering and search.
 *
 * Vanilla, no dependencies, no framework. Every feature is additive: with
 * JavaScript disabled the article is fully readable, the TOC is a plain nested
 * list, and every card on the listing is visible.
 */
(function () {
  "use strict";

  var API = "/api/v1";
  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  document.addEventListener("DOMContentLoaded", function () {
    readingProgress();
    tocScrollspy();
    codeCopy();
    share();
    postViews();
    listingFilter();
    listingViews();
    cardClickThrough();
    blogStats();
    backToTop();
    termCards();
  });

  // ── Reading progress ────────────────────────────────────────
  function readingProgress() {
    var bar = document.querySelector(".reading-progress__bar");
    var article = document.getElementById("post-content");
    if (!bar || !article) return;

    var ticking = false;
    function update() {
      var top = article.offsetTop;
      var span = article.offsetHeight - window.innerHeight + 200;
      var pct = span <= 0 ? 1 : (window.scrollY - top + 200) / span;
      bar.style.width = Math.min(100, Math.max(0, pct * 100)) + "%";
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  // ── TOC scrollspy ───────────────────────────────────────────
  function tocScrollspy() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('.post-toc a[href^="#"]')
    );
    if (!links.length || !("IntersectionObserver" in window)) return;

    var byId = {};
    links.forEach(function (a) {
      byId[decodeURIComponent(a.hash.slice(1))] = a;
    });

    var headings = Object.keys(byId)
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);
    if (!headings.length) return;

    var visible = new Set();

    function paint() {
      var active = null;
      for (var i = 0; i < headings.length; i++) {
        if (visible.has(headings[i].id)) {
          active = headings[i].id;
          break;
        }
      }
      // Nothing intersecting (mid-section scroll): keep the last heading above the fold.
      if (!active) {
        for (var j = headings.length - 1; j >= 0; j--) {
          if (headings[j].getBoundingClientRect().top < 120) {
            active = headings[j].id;
            break;
          }
        }
      }
      links.forEach(function (a) {
        a.classList.remove("is-active");
      });
      if (active && byId[active]) byId[active].classList.add("is-active");
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        paint();
      },
      { rootMargin: "-90px 0px -65% 0px", threshold: 0 }
    );

    headings.forEach(function (h) {
      io.observe(h);
    });
    window.addEventListener("scroll", debounce(paint, 120), { passive: true });
    paint();
  }

  // ── Copy code ───────────────────────────────────────────────
  function codeCopy() {
    document.querySelectorAll(".code-block").forEach(function (block) {
      var btn = block.querySelector(".code-copy");
      var code = block.querySelector("pre");
      if (!btn || !code) return;

      btn.addEventListener("click", function () {
        writeClipboard(code.innerText)
          .then(function () {
            flash(btn, "is-done");
          })
          .catch(function () {
            btn.querySelector(".code-copy__idle").textContent = "Failed";
            setTimeout(function () {
              btn.querySelector(".code-copy__idle").textContent = "Copy";
            }, 1400);
          });
      });
    });
  }

  // ── Share ───────────────────────────────────────────────────
  function share() {
    var row = document.querySelector(".post-share");
    if (!row) return;
    var url = row.dataset.url || location.href;
    var title = row.dataset.title || document.title;

    var copyBtn = row.querySelector(".share-btn--copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        writeClipboard(url).then(function () {
          flash(copyBtn, "is-done");
        });
      });
    }

    var nativeBtn = row.querySelector(".share-btn--native");
    if (nativeBtn && navigator.share) {
      nativeBtn.hidden = false;
      nativeBtn.addEventListener("click", function () {
        navigator.share({ title: title, url: url }).catch(function () {
          /* user cancelled */
        });
      });
    }

    // Heading anchors copy their deep link rather than just jumping.
    document.querySelectorAll(".heading-anchor").forEach(function (a) {
      a.addEventListener("click", function () {
        writeClipboard(
          location.origin + location.pathname + a.getAttribute("href")
        );
      });
    });
  }

  // ── View count on a post page ───────────────────────────────
  function postViews() {
    var el = document.querySelector(".post-views");
    if (!el) return;
    var slug = el.dataset.slug;
    var out = el.querySelector("[data-count]");
    var dot = document.querySelector(".post-views__dot");

    fetch(API + "/views/" + encodeURIComponent(slug), {
      method: "POST",
      headers: { "content-type": "application/json" },
    })
      .then(toJson)
      .then(function (data) {
        if (!data || typeof data.count !== "number")
          throw new Error("bad payload");
        out.textContent = data.count.toLocaleString();
        el.hidden = false;
        if (dot) dot.hidden = false;
        if (!reduceMotion) {
          out.classList.add("is-landing");
          setTimeout(function () {
            out.classList.remove("is-landing");
          }, 500);
        }
      })
      .catch(function () {
        // A missing number is fine. A confidently wrong one is not - so on any
        // failure the element simply stays hidden rather than showing "0".
        el.hidden = true;
      });
  }

  // ── View counts on listing cards (one batched request) ──────
  function listingViews() {
    var spans = Array.prototype.slice.call(
      document.querySelectorAll("[data-views-slug]")
    );
    if (!spans.length) return;

    var slugs = spans
      .map(function (s) {
        return s.dataset.viewsSlug;
      })
      .filter(Boolean);
    if (!slugs.length) return;

    fetch(API + "/views?slugs=" + encodeURIComponent(slugs.join(",")))
      .then(toJson)
      .then(function (data) {
        if (!data || !data.views) return;
        spans.forEach(function (span) {
          var n = data.views[span.dataset.viewsSlug];
          if (typeof n !== "number" || n <= 0) return;
          span.querySelector("[data-count]").textContent = n.toLocaleString();
          span.hidden = false;
        });
      })
      .catch(function () {
        /* cards read fine without counts */
      });
  }

  // ── Tag filter + search ─────────────────────────────────────
  function listingFilter() {
    var grid = document.querySelector("[data-grid]");
    if (!grid) return;

    var cards = Array.prototype.slice.call(
      grid.querySelectorAll("[data-card]")
    );
    var chips = Array.prototype.slice.call(
      document.querySelectorAll(".filter-chip")
    );
    var input = document.querySelector("[data-search]");
    var empty = document.querySelector("[data-empty]");

    filterOverflow();
    window.addEventListener("resize", debounce(filterOverflow, 150), {
      passive: true,
    });

    var state = { tag: "", q: "" };
    var index = null;
    var indexPromise = null;

    var params = new URLSearchParams(location.search);
    if (params.get("tag")) state.tag = params.get("tag");
    if (params.get("q")) state.q = params.get("q");

    function matches(card) {
      if (state.tag) {
        var tags = (card.dataset.tags || "").split(/\s+/);
        if (tags.indexOf(state.tag) === -1) return false;
      }
      if (state.q) {
        var slug = card.dataset.slug;
        // Legacy external cards are not in the search index; fall back to
        // matching their visible text so they never vanish unexplained.
        if (!slug || !index)
          return card.textContent.toLowerCase().indexOf(state.q) !== -1;
        var hit = index[slug];
        return hit ? hit.indexOf(state.q) !== -1 : false;
      }
      return true;
    }

    function apply() {
      var before = reduceMotion
        ? null
        : cards.map(function (c) {
            return { el: c, rect: c.getBoundingClientRect() };
          });

      var shown = 0;
      cards.forEach(function (c) {
        var show = matches(c);
        c.classList.toggle("is-hidden", !show);
        if (show) shown++;
      });
      if (empty) empty.hidden = shown !== 0;

      // FLIP: cards glide to their new grid positions instead of teleporting.
      if (before) flip(before);

      chips.forEach(function (chip) {
        chip.classList.toggle(
          "is-active",
          (chip.dataset.tag || "") === state.tag
        );
      });

      var qs = new URLSearchParams();
      if (state.tag) qs.set("tag", state.tag);
      if (state.q) qs.set("q", state.q);
      var next = location.pathname + (qs.toString() ? "?" + qs : "");
      history.replaceState(null, "", next);
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.tag =
          (chip.dataset.tag || "") === state.tag ? "" : chip.dataset.tag || "";
        apply();
      });
    });

    var searchWrap = input && input.closest(".blog-search");

    if (input) {
      input.value = state.q;
      input.addEventListener(
        "input",
        debounce(function () {
          state.q = input.value.trim().toLowerCase();
          if (state.q && !index) {
            loadIndex().then(apply);
            return;
          }
          apply();
        }, 140)
      );
      if (state.q) loadIndex().then(apply);

      // Fetching only on the first keystroke meant every search paid for a
      // fresh network round-trip before any result could show - on a slow
      // connection that's a long silent wait staring at a search box that
      // looks frozen. Warming the index in the background once the page has
      // settled means it's usually already in hand by the time someone
      // finishes typing, at the cost of one small JSON fetch for everyone.
      var warm =
        window.requestIdleCallback ||
        function (fn) {
          setTimeout(fn, 300);
        };
      warm(function () {
        loadIndex();
      });
    }

    function loadIndex() {
      if (indexPromise) return indexPromise;
      if (searchWrap) searchWrap.classList.add("is-loading");

      // A hard timeout so a stalled network request never leaves the search
      // box looking permanently broken - past a few seconds, fall back to
      // plain substring matching on each card's own visible text instead of
      // waiting indefinitely on the index.
      var controller = window.AbortController ? new AbortController() : null;
      var timer =
        controller &&
        setTimeout(function () {
          controller.abort();
        }, 4000);

      indexPromise = fetch(
        "/blog/search-index.json",
        controller ? { signal: controller.signal } : undefined
      )
        .then(toJson)
        .then(function (data) {
          index = {};
          (data.posts || []).forEach(function (p) {
            index[p.s] = [
              p.t,
              p.d,
              (p.g || []).join(" "),
              (p.h || []).join(" "),
              p.x,
            ]
              .join(" ")
              .toLowerCase();
          });
        })
        .catch(function () {
          index = null;
        })
        .then(function () {
          if (timer) clearTimeout(timer);
          if (searchWrap) searchWrap.classList.remove("is-loading");
        });
      return indexPromise;
    }

    if (state.tag || state.q) apply();
  }

  // The edge fade on the tag-filter row should only show up when the chips
  // actually overflow their container - otherwise a row that already fits
  // reads as permanently "cut off" rather than a deliberate scroll hint.
  function filterOverflow() {
    var filter = document.querySelector(".blog-filter");
    if (!filter) return;
    filter.classList.toggle(
      "is-scrollable",
      filter.scrollWidth > filter.clientWidth + 1
    );
  }

  // ── Blog-wide stats (total views, monthly visitors) ─────────
  // Fires on every blog page (listing, post, tag) so a visitor is counted
  // once for the month regardless of which page they land on first - not
  // just on the listing, which is only where the numbers are displayed.
  function blogStats() {
    fetch(API + "/stats/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
    })
      .then(toJson)
      .then(function (data) {
        var el = document.querySelector("[data-blog-stats]");
        if (!el || typeof data.totalViews !== "number") return;
        el.querySelector("[data-total-views]").textContent =
          data.totalViews.toLocaleString();
        el.querySelector("[data-monthly-visitors]").textContent =
          data.readersThisMonth.toLocaleString();
        el.hidden = false;
      })
      .catch(function () {
        // The RSS link lives outside this element and stays visible either way.
      });
  }

  // ── Back to top ──────────────────────────────────────────────
  function backToTop() {
    var btn = document.querySelector("[data-back-to-top]");
    if (!btn) return;

    var ticking = false;
    function update() {
      btn.classList.toggle("is-visible", window.scrollY > 600);
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  // ── Term cards (hover-to-expand vocabulary accordion) ─────────
  // Desktop/mouse: opens on hover, closes 3s after the pointer leaves so a
  // brief mouse slip doesn't slam it shut. Touch: no hover event exists, so
  // it falls back to tap-to-toggle instead. Focus mirrors hover so keyboard
  // users get the same behavior either way. Multiple cards can stay open
  // at once - opening one never closes another.
  //
  // Layout is real masonry, not CSS grid/flexbox: those stretch every card
  // in a row to the tallest one, or hard-wrap to a new row at the tallest
  // sibling's height, so a card below a tall expanded one can never slide
  // up to sit flush beside a short one. termCardsMasonry() measures actual
  // per-card heights and positions each with a transform, so the layout
  // genuinely reflows - shorter cards "crawl" up beside their neighbor.
  function termCards() {
    var container = document.querySelector(".term-cards");
    var cards = document.querySelectorAll(".term-card");
    if (!container || !cards.length) return;

    var canHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    var timers = new WeakMap();
    var relayout = termCardsMasonry(container, cards);

    cards.forEach(function (card) {
      var head = card.querySelector(".term-card__head");
      var body = card.querySelector(".term-card__body");
      if (head) {
        head.setAttribute("tabindex", "0");
        head.setAttribute("role", "button");
        head.setAttribute("aria-expanded", "false");
      }

      function setOpen(open) {
        card.classList.toggle("is-open", open);
        if (head) head.setAttribute("aria-expanded", String(open));
      }
      function openNow() {
        var t = timers.get(card);
        if (t) {
          clearTimeout(t);
          timers.delete(card);
        }
        if (card.classList.contains("is-open")) return;

        // Reposition the grid for the card's about-to-open height *before*
        // its text actually appears, so neighbors visibly make room first
        // instead of jumping after the fact. bodyInner still reports its
        // full natural scrollHeight while collapsed (the 0fr row just clips
        // the render, it doesn't remove the content), so this is a real
        // measurement, not a guess.
        var inner = body && body.querySelector(".term-card__body-inner");
        var extra = inner ? inner.scrollHeight : 0;
        var overrides = new Map();
        overrides.set(card, card.offsetHeight + extra);
        relayout(overrides);

        var openTimer = setTimeout(
          function () {
            setOpen(true);
            timers.delete(card);
          },
          reduceMotion ? 0 : 160
        );
        timers.set(card, openTimer);
      }
      function scheduleClose() {
        var t = timers.get(card);
        if (t) {
          clearTimeout(t);
          timers.delete(card);
        }
        if (!card.classList.contains("is-open")) {
          // Left before the pre-open reposition finished revealing text -
          // the neighbors already made room for it, so snap them back.
          relayout();
          return;
        }
        t = setTimeout(
          function () {
            setOpen(false);
            timers.delete(card);
          },
          reduceMotion ? 0 : 3000
        );
        timers.set(card, t);
      }

      if (canHover) {
        card.addEventListener("mouseenter", openNow);
        card.addEventListener("mouseleave", scheduleClose);
      } else if (head) {
        head.addEventListener("click", function () {
          setOpen(!card.classList.contains("is-open"));
        });
      }
      card.addEventListener("focusin", openNow);
      card.addEventListener("focusout", scheduleClose);

      // The expand/collapse itself animates via CSS (grid-template-rows on
      // .term-card__body); once that finishes, re-measure and reflow the
      // rest of the grid so shorter neighbors slide into the freed space.
      if (body)
        body.addEventListener("transitionend", function (e) {
          if (e.propertyName === "grid-template-rows") relayout();
        });
    });
  }

  // Absolute-positions .term-card elements into a masonry layout: each new
  // card goes into whichever column is currently shortest. Returns a
  // `relayout` function to re-run after any card's height changes; pass it
  // a Map of card -> predicted height to reflow ahead of an actual resize
  // (used to make room before a card's content reveals, not after).
  // No-JS fallback is a plain stack (each card static, full width, one per
  // line) since this only ever adds inline styles on top of that.
  //
  // ".term-card--wide" is only an eligibility marker, not a command: real
  // masonry (shortest-column-fill) never leaves a gap for an odd count the
  // way a row-major grid would, so the marked card only actually renders
  // full-width in single-column mode - otherwise it sizes like every other
  // card, matching whichever column is shortest.
  function termCardsMasonry(container, cardList) {
    var cards = Array.prototype.slice.call(cardList);
    var gap = 16;

    function columnCount() {
      return window.matchMedia("(max-width: 767px)").matches ? 1 : 2;
    }

    function layout(overrides) {
      container.classList.add("is-masonry");
      var cols = columnCount();
      var totalWidth = container.clientWidth;
      var colWidth =
        cols === 1 ? totalWidth : (totalWidth - gap * (cols - 1)) / cols;
      var colHeights = new Array(cols).fill(0);

      cards.forEach(function (card) {
        var wide = cols === 1;
        var width = wide ? totalWidth : colWidth;
        var col = 0;
        var y;

        if (wide) {
          y = Math.max.apply(null, colHeights);
        } else {
          col = colHeights.indexOf(Math.min.apply(null, colHeights));
          y = colHeights[col];
        }

        card.style.width = width + "px";
        card.style.transform =
          "translate(" +
          (wide ? 0 : col * (colWidth + gap)) +
          "px," +
          y +
          "px)";

        var h = (overrides && overrides.get(card)) || card.offsetHeight;
        if (wide) {
          colHeights = colHeights.map(function () {
            return y + h + gap;
          });
        } else {
          colHeights[col] = y + h + gap;
        }
      });

      container.style.height = Math.max.apply(null, colHeights) - gap + "px";
    }

    layout();
    window.addEventListener(
      "resize",
      debounce(function () {
        layout();
      }, 150)
    );
    return layout;
  }

  // ── Whole-card click-through ─────────────────────────────────
  // Clicking anywhere on a bento card opens the post. Clicks on an actual
  // <a> (title, tag pill, "Read" link) still behave exactly as that link
  // says - this only fires for clicks on the card's empty space, so nothing
  // double-navigates and text selection / right-click / ctrl-click on the
  // real links is untouched.
  function cardClickThrough() {
    var cards = document.querySelectorAll("[data-card][data-href]");
    if (!cards.length) return;

    cards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        var selection = window.getSelection();
        if (selection && selection.toString().length) return; // don't hijack text selection

        var href = card.dataset.href;
        if (card.hasAttribute("data-external")) {
          window.open(href, "_blank", "noopener");
        } else {
          window.location.href = href;
        }
      });
    });
  }

  /** First-Last-Invert-Play over the cards whose position changed. */
  function flip(before) {
    before.forEach(function (item) {
      if (item.el.classList.contains("is-hidden")) return;
      var after = item.el.getBoundingClientRect();
      var dx = item.rect.left - after.left;
      var dy = item.rect.top - after.top;
      if (!dx && !dy) return;
      item.el.style.transition = "none";
      item.el.style.transform = "translate(" + dx + "px," + dy + "px)";
      requestAnimationFrame(function () {
        item.el.style.transition = "transform 300ms cubic-bezier(0.4,0,0.2,1)";
        item.el.style.transform = "";
      });
    });
  }

  // ── helpers ─────────────────────────────────────────────────
  function toJson(r) {
    return r.ok ? r.json() : Promise.reject(new Error(r.status));
  }

  function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext)
      return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  function flash(el, cls) {
    el.classList.add(cls);
    setTimeout(function () {
      el.classList.remove(cls);
    }, 1400);
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments,
        self = this;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(self, args);
      }, ms);
    };
  }
})();
