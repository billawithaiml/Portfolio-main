window.PORTFOLIO_PROJECTS = [
  {
  category: "Gen AI",
  image: "images/vlm.png",
  title: "Optimizing Image Data for Large Vision Language Models (VLMs)",
  desc: "Role: Multimodel AI Engineer at Ask Sage.ai (a BigBear.ai company). Optimizing image data for large vision language models: preparing and refining image inputs (resizing, cropping, format and quality handling) so models receive cleaner, lighter images with lower token cost and latency.",
  tech: "PyTorch, OpenCV, Pillow",
  links: [
    { label: "Link", url: "https://www.asksage.ai/" }
  ]
},
  {
    category: "Apps",
    title: "Example App",
    desc: "অ্যাপের বিবরণ।",
    tech: "Flutter",
    image: "",
    links: [{ label: "Demo", url: "https://example.com" }]
  },
  {
    category: "Web Apps",
    title: "Example Web App",
    desc: "ওয়েব অ্যাপের বিবরণ।",
    tech: "Next.js",
    image: "",
    links: [{ label: "Live", url: "https://example.com" }]
  }
];

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var grid = document.getElementById("proj-grid");
    var tabs = document.getElementById("proj-tabs");
    var empty = document.getElementById("proj-empty");
    var more = document.getElementById("proj-more");
    if (!grid) return;
    var list = window.PORTFOLIO_PROJECTS || [];
    var order = ["All", "Gen AI", "Apps", "Web Apps"];
    var active = "All";
    var FIRST = 3;   // শুরুতে কয়টা দেখাবে
    var STEP = 3;    // Show more চাপলে কয়টা করে আসবে
    var count = FIRST;

    function mk(tag, cls, txt) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt != null) e.textContent = txt;
      return e;
    }
    function safeUrl(u) {
      return /^(https?:\/\/|\/|[a-z0-9_.-]+\/)/i.test(u || "") ? u : "";
    }
        function hug(t) {
      t.style.width = "";
      var r = document.createRange();
      r.selectNodeContents(t);
      var rects = r.getClientRects(), max = 0, i;
      for (i = 0; i < rects.length; i++) if (rects[i].width > max) max = rects[i].width;
      var scale = t.getBoundingClientRect().width / (t.offsetWidth || 1) || 1;
      var cs = getComputedStyle(t);
      var extra = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) +
                  parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      var w = Math.ceil(max / scale + extra) + 2;
      if (w < t.offsetWidth) t.style.width = w + "px";
    }
    function hugAll() {
      Array.prototype.forEach.call(grid.querySelectorAll(".proj-title-text"), hug);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(hugAll);
    window.addEventListener("resize", hugAll);
    function card(p) {
      var c = mk("article", "proj-card");
      var media = mk("div", "proj-media");
      if (p.image) {
        var img = document.createElement("img");
        img.src = p.image; img.alt = p.title; img.loading = "lazy";
        media.appendChild(img);
      } else {
        media.appendChild(mk("span", "proj-initial", (p.title || "?").charAt(0).toUpperCase()));
      }
      media.appendChild(mk("span", "proj-cat", p.category));
      c.appendChild(media);
      var body = mk("div", "proj-body");
      var h = mk("h3", "proj-title");
      h.appendChild(mk("span", "proj-title-text", p.title));
      body.appendChild(h);
      if (p.desc) body.appendChild(mk("p", "proj-desc", p.desc));
      if (p.tech) body.appendChild(mk("p", "proj-tech", p.tech));
      var row = mk("div", "proj-links");
      (p.links || []).forEach(function (l) {
        var u = safeUrl(l.url);
        if (!u) return;
        var a = mk("a", "proj-btn", l.label);
        a.href = u; a.target = "_blank"; a.rel = "noopener";
        row.appendChild(a);
      });
      if (row.children.length) body.appendChild(row);
      c.appendChild(body);
      return c;
    }

    function filtered() {
      return list.filter(function (p) { return active === "All" || p.category === active; });
    }

    function updateButton(total) {
      if (total <= FIRST) { more.hidden = true; return; }
      more.hidden = false;
      more.textContent = count >= total ? "Show less" : "Show more (" + (total - count) + " more)";
    }

    function draw() {
      var shown = filtered();
      grid.textContent = "";
      shown.slice(0, count).forEach(function (p) { grid.appendChild(card(p)); });
      empty.hidden = shown.length > 0;
      updateButton(shown.length);
      hugAll();
    }

    function reveal() {
      var shown = filtered();
      var from = count;
      count = Math.min(count + STEP, shown.length);
      shown.slice(from, count).forEach(function (p, i) {
        var c = card(p);
        c.classList.add("proj-enter");
        c.style.animationDelay = (i * 120) + "ms";
        grid.appendChild(c);
      });
      updateButton(shown.length);
      hugAll();
    }

    more.addEventListener("click", function () {
      if (count >= filtered().length) { count = FIRST; draw(); }
      else reveal();
    });

    order.forEach(function (t) {
      if (t !== "All" && !list.some(function (p) { return p.category === t; })) return;
      var b = mk("button", "proj-tab" + (t === "All" ? " is-active" : ""), t);
      b.type = "button";
      b.addEventListener("click", function () {
        active = t;
        count = FIRST;
        Array.prototype.forEach.call(tabs.children, function (x) { x.classList.toggle("is-active", x === b); });
        draw();
      });
      tabs.appendChild(b);
    });
    draw();
  });
})();