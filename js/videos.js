/* ============================================================
   তোমার ভিডিও এখানে যোগ করো। শুধু এই তালিকায় নতুন লাইন বসাও।
   type: "youtube"  -> id এ YouTube ভিডিওর আইডি দাও
                       (youtube.com/watch?v=XXXX এর XXXX অংশ)
   type: "file"     -> src এ ভিডিও ফাইলের পথ দাও, যেমন "videos/intro.mp4"
                       poster এ থাম্বনেইল ছবির পথ (ঐচ্ছিক)
   topic: ফিল্টার বাটনের নাম (AI, ML, NLP ইত্যাদি, যা খুশি)
   ============================================================ */
window.PORTFOLIO_VIDEOS = [
  { title: "Example: Intro to Machine Learning", topic: "ML", type: "youtube", id: "ukzFI9rgwfU", desc: "এটা শুধু উদাহরণ। নিজের ভিডিও দিয়ে বদলে ফেলো।" },
  { title: "Example: What is Deep Learning?", topic: "AI", type: "youtube", id: "aircAruvnKk", desc: "এটাও উদাহরণ, মুছে দিতে পারো।" }
];

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var grid = document.getElementById("vid-grid");
    var chips = document.getElementById("vid-chips");
    var empty = document.getElementById("vid-empty");
    if (!grid) return;
    var list = window.PORTFOLIO_VIDEOS || [];
    var active = "All";

    function mk(tag, cls, txt) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt != null) e.textContent = txt;
      return e;
    }

    function card(v) {
      var c = mk("article", "vid-card");
      var media = mk("div", "vid-media");
      if (v.type === "youtube") {
        var btn = mk("button", "vid-thumb");
        btn.type = "button";
        btn.setAttribute("aria-label", "Play: " + v.title);
        btn.style.backgroundImage = "url(https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg)";
        btn.appendChild(mk("span", "vid-play", "▶"));
        btn.addEventListener("click", function () {
          var f = document.createElement("iframe");
          f.src = "https://www.youtube-nocookie.com/embed/" + v.id + "?autoplay=1&rel=0";
          f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
          f.allowFullscreen = true;
          f.title = v.title;
          media.textContent = "";
          media.appendChild(f);
        });
        media.appendChild(btn);
      } else {
        var vd = document.createElement("video");
        vd.controls = true;
        vd.preload = "metadata";
        vd.playsInline = true;
        if (v.poster) vd.poster = v.poster;
        vd.src = v.src;
        media.appendChild(vd);
      }
      c.appendChild(media);
      var body = mk("div", "vid-body");
      body.appendChild(mk("span", "vid-tag", v.topic || "Video"));
      body.appendChild(mk("h3", "vid-title", v.title));
      if (v.desc) body.appendChild(mk("p", "vid-desc", v.desc));
      c.appendChild(body);
      return c;
    }

    function draw() {
      grid.textContent = "";
      var shown = list.filter(function (v) { return active === "All" || v.topic === active; });
      shown.forEach(function (v) { grid.appendChild(card(v)); });
      empty.hidden = shown.length > 0;
    }

    var topics = ["All"];
    list.forEach(function (v) { if (v.topic && topics.indexOf(v.topic) < 0) topics.push(v.topic); });
    topics.forEach(function (t) {
      var b = mk("button", "vid-chip" + (t === "All" ? " is-active" : ""), t);
      b.type = "button";
      b.addEventListener("click", function () {
        active = t;
        Array.prototype.forEach.call(chips.children, function (x) { x.classList.toggle("is-active", x === b); });
        draw();
      });
      chips.appendChild(b);
    });
    draw();
  });
})();
