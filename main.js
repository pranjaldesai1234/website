/* ================================================================
   Shared behaviour for every page.
   ================================================================ */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

function niceDate(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m-1]} ${y}`;
}
function shortDate(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return `${String(d).padStart(2,"0")}.${String(m).padStart(2,"0")}.${String(y).slice(2)}`;
}
function readTime(post){
  const words = (post.body||[]).map(b => b.lead||b.p||b.quote||b.note||"").join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words/200)) + " min read";
}
function sortedPosts(){ return [...POSTS].sort((a,b) => b.date.localeCompare(a.date)); }
function esc(s){
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function accentTitle(title, accent){
  if(!accent) return esc(title);
  const i = title.indexOf(accent);
  if(i === -1) return esc(title);
  return esc(title.slice(0,i)) + "<i>" + esc(accent) + "</i>" + esc(title.slice(i+accent.length));
}
const CHEVRON_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.5 6 8.5 12l6 6"/></svg>';
const CHEVRON_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9.5 6l6 6-6 6"/></svg>';

/* ---------------- old in-page links: send them to their new pages ---------------- */
function initLegacyHashes(){
  if(document.body.dataset.page !== "home") return;
  const map = {
    "#about":"/about/", "#work":"/work/", "#writing":"/writing/", "#books":"/books/", "#reading":"/books/",
    "#research":"/writing/#research", "#skills":"/background/", "#certifications":"/background/", "#education":"/background/"
  };
  const t = map[location.hash];
  if(t) location.replace(t);
}

/* ---------------- nav scroll state ---------------- */
function initNav(){
  const nav = document.querySelector(".nav");
  if(!nav) return;
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive:true });
}

/* ---------------- swipe helper (touch, pen and mouse drag) ---------------- */
function attachSwipe(el, onPrev, onNext){
  let sx = 0, sy = 0, tracking = false, blockClickUntil = 0;
  el.addEventListener("pointerdown", e => {
    if(e.pointerType === "mouse" && e.button !== 0) return;
    tracking = true; sx = e.clientX; sy = e.clientY;
  });
  el.addEventListener("pointerup", e => {
    if(!tracking) return;
    tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if(Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4){
      blockClickUntil = performance.now() + 350;
      (dx < 0 ? onNext : onPrev)();
    }
  });
  el.addEventListener("pointercancel", () => { tracking = false; });
  el.addEventListener("click", e => {
    if(performance.now() < blockClickUntil){ e.preventDefault(); e.stopPropagation(); }
  }, true);
}

/* ---------------- phone menu: left panel with a curved rail ---------------- */
function initMenu(){
  const html = document.documentElement;
  const btn = document.querySelector(".menu-btn");
  const panel = document.getElementById("menu-panel");
  const scrim = document.querySelector(".menu-scrim");
  if(!btn || !panel) return;

  const closeBtn = panel.querySelector(".menu-close");
  const rail = panel.querySelector(".menu-rail");
  const list = panel.querySelector(".menu-list");
  const items = [...panel.querySelectorAll(".menu-item")];
  const svg = panel.querySelector(".menu-path");
  const pathEl = svg.querySelector("path");
  const nub = panel.querySelector(".menu-nub");
  const behind = () => [...document.querySelectorAll("main, footer, .nav, .skip-link")];
  const desktop = window.matchMedia("(min-width: 961px)");
  let pts = [];
  let isOpen = false;
  let currentIdx = Math.max(0, items.findIndex(a => a.getAttribute("aria-current") === "page"));

  function layoutRail(){
    const padR = parseFloat(getComputedStyle(list).paddingRight) || 0;
    pts = items.map(a => {
      const li = a.parentElement;
      const dx = parseFloat(li.dataset.dx) || 0;
      return {
        x: list.offsetLeft + list.clientWidth - padR + dx + 24,
        y: list.offsetTop + li.offsetTop + li.offsetHeight / 2
      };
    });
    if(!pts.length) return;
    const first = { x: pts[0].x + 10, y: pts[0].y - 90 };
    const last  = { x: pts[pts.length-1].x + 10, y: pts[pts.length-1].y + 90 };
    const P = [first, ...pts, last];
    let d = `M ${P[0].x.toFixed(1)} ${P[0].y.toFixed(1)}`;
    for(let i = 0; i < P.length - 1; i++){
      const p0 = P[i-1] || P[i], p1 = P[i], p2 = P[i+1], p3 = P[i+2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    pathEl.setAttribute("d", d);
    svg.setAttribute("viewBox", `0 0 ${rail.clientWidth} ${rail.clientHeight}`);
  }
  function moveNub(i){
    const p = pts[i]; if(!p) return;
    nub.style.transform = `translate(${(p.x - 14).toFixed(1)}px, ${(p.y - 5.5).toFixed(1)}px)`;
  }

  function open(){
    if(isOpen) return;
    isOpen = true;
    html.classList.add("menu-open");
    btn.setAttribute("aria-expanded", "true");
    behind().forEach(el => { el.inert = true; });
    panel.inert = false;
    layoutRail();
    if(REDUCED) moveNub(currentIdx);
    else { nub.style.transform = `translate(${(pts[0] ? pts[0].x - 14 : 0)}px, ${(pts[0] ? pts[0].y - 5.5 : 0)}px)`;
           requestAnimationFrame(() => requestAnimationFrame(() => moveNub(currentIdx))); }
    requestAnimationFrame(() => closeBtn.focus());
  }
  function close(returnFocus = true){
    if(!isOpen) return;
    isOpen = false;
    html.classList.remove("menu-open");
    btn.setAttribute("aria-expanded", "false");
    panel.inert = true;
    behind().forEach(el => { el.inert = false; });
    if(returnFocus) btn.focus();
  }

  btn.addEventListener("click", () => (isOpen ? close() : open()));
  closeBtn.addEventListener("click", () => close());
  scrim.addEventListener("click", () => close());
  document.addEventListener("keydown", e => {
    if(!isOpen) return;
    if(e.key === "Escape"){ e.preventDefault(); close(); return; }
    if(e.key === "Tab"){
      const f = [...panel.querySelectorAll("a[href], button:not([disabled])")];
      if(!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });

  items.forEach((a, i) => {
    a.addEventListener("pointerenter", () => moveNub(i));
    a.addEventListener("focus", () => moveNub(i));
    a.addEventListener("pointerleave", () => moveNub(currentIdx));
    a.addEventListener("blur", () => moveNub(currentIdx));
    a.addEventListener("click", () => close(false));
  });

  /* swipe left inside the panel closes it */
  let sx = null, sy = null;
  panel.addEventListener("pointerdown", e => { if(e.pointerType === "touch"){ sx = e.clientX; sy = e.clientY; } });
  panel.addEventListener("pointermove", e => {
    if(sx === null) return;
    if(e.clientX - sx < -70 && Math.abs(e.clientY - sy) < 50){ sx = null; close(); }
  });
  panel.addEventListener("pointerup", () => { sx = null; });
  panel.addEventListener("pointercancel", () => { sx = null; });

  desktop.addEventListener("change", e => { if(e.matches) close(false); });
  window.addEventListener("resize", () => { if(isOpen) layoutRail(); });
}

/* ---------------- hero load sequence ---------------- */
function initHero(){
  const lines = document.querySelectorAll(".hero-line");
  if(!lines.length) return;
  if(REDUCED){ lines.forEach(l => l.classList.add("in")); }
  else{
    lines.forEach((l,i) => setTimeout(() => l.classList.add("in"), 150*i + 80));
  }
}

/* ---------------- "Connecting ___." cycling line ---------------- */
function initConnectCycle(){
  const el = document.getElementById("connect-word");
  if(!el) return;
  const words = ["data.", "behaviour.", "markets.", "policy.", "people."];
  if(REDUCED){ el.textContent = words[0]; return; }
  let i = 0;
  setInterval(() => {
    el.classList.add("fading");
    setTimeout(() => {
      i = (i+1) % words.length;
      el.textContent = words[i];
      el.classList.remove("fading");
    }, 380);
  }, 3000);
}

/* ---------------- scroll reveals (generic) ---------------- */
function initReveal(){
  const targets = document.querySelectorAll(".reveal, .hair, .lorenz, .timeline, .sub-timeline, .count-row");
  if(!("IntersectionObserver" in window) || REDUCED){
    targets.forEach(t => { t.classList.add("in","drawn"); });
    document.querySelectorAll(".count-item .num[data-to]").forEach(runCount);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(!e.isIntersecting) return;
      const t = e.target;
      t.classList.add("in");
      if(t.classList.contains("lorenz")) t.classList.add("drawn");
      if(t.classList.contains("timeline")) t.classList.add("drawn");
      if(t.classList.contains("sub-timeline")) t.classList.add("drawn");
      if(t.classList.contains("count-row")){
        t.querySelectorAll(".num[data-to]").forEach(runCount);
      }
      io.unobserve(t);
    });
  }, { threshold:0.18, rootMargin:"0px 0px -60px 0px" });
  targets.forEach(t => io.observe(t));
}

/* ---------------- count-up numbers ---------------- */
function runCount(el){
  const to = el.getAttribute("data-to");
  const suffix = el.getAttribute("data-suffix") || "";
  const from = parseInt(el.getAttribute("data-from") || "0", 10);
  const target = parseInt(to, 10);
  if(REDUCED || isNaN(target)){ el.textContent = to + suffix; return; }
  const dur = 1100, start = performance.now();
  function tick(now){
    const p = Math.min(1, (now-start)/dur);
    const eased = 1 - Math.pow(1-p, 3);
    const val = Math.round(from + (target-from)*eased);
    el.textContent = val + suffix;
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------------- Writing: fanned essay cards that move into focus ---------------- */
function initEssayFan(){
  const mount = document.getElementById("essay-fan");
  if(!mount) return;
  const list = sortedPosts();
  const n = list.length;
  if(!n) return;
  let active = 0;

  mount.innerHTML = `
    <div class="ef-viewport" role="group" aria-roledescription="carousel" aria-label="Essays, shown as fanned cards">
      <ul class="ef-track">
        ${list.map((p, i) => `
        <li class="ef-item" data-i="${i}">
          <a class="ef-card" href="/post.html?p=${encodeURIComponent(p.slug)}" aria-label="${esc(p.title)}, ${esc(p.tag||"Essay")}, ${esc(niceDate(p.date))}">
            ${p.cover ? `<img src="${esc(p.cover)}" alt="" draggable="false">` : ""}
            <span class="ef-meta">
              <span class="tag">${esc(p.tag||"NOTE")}</span>
              <span class="ef-title">${accentTitle(p.title, p.accent)}</span>
              <span class="ef-foot"><span>${shortDate(p.date)} &middot; ${readTime(p)}</span><span class="ef-open" aria-hidden="true">Read &rarr;</span></span>
            </span>
          </a>
        </li>`).join("")}
      </ul>
    </div>
    <div class="ef-controls">
      <button class="ef-btn glass" type="button" data-dir="-1" aria-label="Previous essay">${CHEVRON_L}</button>
      <span class="ef-count" aria-hidden="true"></span>
      <button class="ef-btn glass" type="button" data-dir="1" aria-label="Next essay">${CHEVRON_R}</button>
    </div>
    <p class="sr-only" role="status" aria-live="polite" data-status></p>`;

  const items = [...mount.querySelectorAll(".ef-item")];
  const count = mount.querySelector(".ef-count");
  const status = mount.querySelector("[data-status]");
  const prevBtn = mount.querySelector('[data-dir="-1"]');
  const nextBtn = mount.querySelector('[data-dir="1"]');

  function render(announce){
    items.forEach((li, i) => {
      const d = i - active, ad = Math.abs(d);
      li.style.setProperty("--d", d);
      li.style.setProperty("--ad", Math.min(ad, 3));
      li.classList.toggle("is-active", d === 0);
      li.classList.toggle("is-far", ad > 2);
      const a = li.firstElementChild;
      a.tabIndex = d === 0 ? 0 : -1;
      if(d === 0) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    count.textContent = `${active + 1} / ${n}`;
    prevBtn.setAttribute("aria-disabled", active === 0 ? "true" : "false");
    nextBtn.setAttribute("aria-disabled", active === n - 1 ? "true" : "false");
    if(announce) status.textContent = `Essay ${active + 1} of ${n}: ${list[active].title}`;
  }
  function go(i, announce = true){
    const t = Math.max(0, Math.min(n - 1, i));
    if(t === active) return;
    active = t;
    render(announce);
  }

  items.forEach((li, i) => {
    li.firstElementChild.addEventListener("click", e => {
      if(i !== active){ e.preventDefault(); go(i); }
    });
  });
  prevBtn.addEventListener("click", () => go(active - 1));
  nextBtn.addEventListener("click", () => go(active + 1));
  mount.addEventListener("keydown", e => {
    if(e.key === "ArrowLeft"){ e.preventDefault(); go(active - 1); }
    else if(e.key === "ArrowRight"){ e.preventDefault(); go(active + 1); }
    else if(e.key === "Home"){ e.preventDefault(); go(0); }
    else if(e.key === "End"){ e.preventDefault(); go(n - 1); }
  });
  attachSwipe(mount.querySelector(".ef-viewport"), () => go(active - 1), () => go(active + 1));
  render(false);
}

/* ---------------- story grid: the plain list of every essay ---------------- */
function renderStoryGrid(){
  const mount = document.getElementById("story-grid");
  if(!mount) return;
  const list = sortedPosts();
  mount.innerHTML = list.map(post => {
    const href = `/post.html?p=${encodeURIComponent(post.slug)}`;
    const coverHTML = post.cover ? `
      <div class="story-cover">
        <img src="${esc(post.cover)}" alt="${esc(post.title)}">
        <span class="tag cover-tag">${esc(post.tag||"NOTE")}</span>
      </div>` : `
      <div class="top">
        <span class="tag">${esc(post.tag||"NOTE")}</span>
        <span class="meta">${shortDate(post.date)}</span>
      </div>`;
    return `
    <div class="story-card reveal" data-href="${href}" tabindex="0">
      ${coverHTML}
      <div class="story-body">
        ${post.cover ? `<div class="top"><span></span><span class="meta">${shortDate(post.date)}</span></div>` : ""}
        <h3><a class="title-link" href="${href}">${accentTitle(post.title, post.accent)}</a></h3>
        <p class="ex">${esc(post.excerpt||"")}</p>
        <div class="bottom">
          <a class="read" href="${href}">Read &rarr;</a>
          <span class="meta">${readTime(post)}</span>
        </div>
        <div class="li">Originally on <a href="https://www.linkedin.com/in/pranjaldesai15/" target="_blank" rel="noopener">LinkedIn<span class="sr-only"> (opens in a new tab)</span></a></div>
      </div>
    </div>`;
  }).join("");

  mount.querySelectorAll(".story-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if(e.target.closest("a")) return;
      window.location.href = card.dataset.href;
    });
    card.addEventListener("keydown", (e) => {
      if((e.key === "Enter" || e.key === " ") && !e.target.closest("a")){
        e.preventDefault();
        window.location.href = card.dataset.href;
      }
    });
  });
}

/* ---------------- Books: shelf that moves as the selection changes ---------------- */
function initBooks(){
  const root = document.querySelector("[data-books]");
  if(!root) return;
  const arts = [...root.querySelectorAll(".book")];
  const n = arts.length;
  if(!n) return;
  const data = arts.map(a => ({
    src: a.querySelector("img").getAttribute("src"),
    ar: a.dataset.ar,
    title: a.querySelector("h3").textContent,
    by: a.querySelector(".by").textContent,
    note: a.querySelector(".note").innerHTML
  }));
  let active = 0;

  root.insertAdjacentHTML("afterbegin", `
    <div class="shelf">
      <div class="shelf-row" role="tablist" aria-label="Books">
        ${data.map((b, i) => `
        <div class="shelf-item" role="presentation" style="--ar:${b.ar}">
          <button class="shelf-cover" type="button" role="tab" id="book-tab-${i}" aria-controls="book-review"
                  aria-label="${esc(b.title)} by ${esc(b.by)}" aria-selected="false" tabindex="-1">
            <img src="${esc(b.src)}" alt="" draggable="false">
          </button>
        </div>`).join("")}
      </div>
      <div class="shelf-ledge"></div>
    </div>
    <div class="shelf-controls">
      <button class="shelf-btn glass" type="button" data-dir="-1" aria-label="Previous book">${CHEVRON_L}</button>
      <span class="shelf-count" aria-hidden="true"></span>
      <button class="shelf-btn glass" type="button" data-dir="1" aria-label="Next book">${CHEVRON_R}</button>
    </div>
    <div class="review" id="book-review" role="tabpanel" aria-labelledby="book-tab-0" tabindex="0"></div>`);
  root.classList.add("is-ready");

  const shelf = root.querySelector(".shelf");
  const tabs = [...root.querySelectorAll(".shelf-cover")];
  const items = [...root.querySelectorAll(".shelf-item")];
  const count = root.querySelector(".shelf-count");
  const review = root.querySelector(".review");
  const prevBtn = root.querySelector('[data-dir="-1"]');
  const nextBtn = root.querySelector('[data-dir="1"]');

  function render(swap){
    items.forEach((el, i) => {
      el.classList.toggle("is-active", i === active);
      if(i < active) el.dataset.side = "left";
      else if(i > active) el.dataset.side = "right";
      else delete el.dataset.side;
    });
    tabs.forEach((t, i) => {
      t.setAttribute("aria-selected", i === active ? "true" : "false");
      t.tabIndex = i === active ? 0 : -1;
    });
    count.textContent = `Book ${active + 1} of ${n}`;
    prevBtn.setAttribute("aria-disabled", active === 0 ? "true" : "false");
    nextBtn.setAttribute("aria-disabled", active === n - 1 ? "true" : "false");
    const b = data[active];
    review.setAttribute("aria-labelledby", `book-tab-${active}`);
    review.innerHTML = `<h3>${esc(b.title)}</h3><span class="by">${esc(b.by)}</span><p class="note">${b.note}</p>`;
    if(swap && !REDUCED){
      review.classList.remove("swap"); void review.offsetWidth; review.classList.add("swap");
    }
  }
  function go(i, focus){
    const t = Math.max(0, Math.min(n - 1, i));
    if(t === active) return;
    active = t;
    render(true);
    if(focus) tabs[active].focus();
  }

  tabs.forEach((t, i) => t.addEventListener("click", () => go(i, false)));
  prevBtn.addEventListener("click", () => go(active - 1, false));
  nextBtn.addEventListener("click", () => go(active + 1, false));
  root.querySelector(".shelf-row").addEventListener("keydown", e => {
    if(e.key === "ArrowLeft"){ e.preventDefault(); go(active - 1, true); }
    else if(e.key === "ArrowRight"){ e.preventDefault(); go(active + 1, true); }
    else if(e.key === "Home"){ e.preventDefault(); go(0, true); }
    else if(e.key === "End"){ e.preventDefault(); go(n - 1, true); }
  });
  attachSwipe(shelf, () => go(active - 1, false), () => go(active + 1, false));
  render(false);
}

/* ---------------- single article ---------------- */
function renderArticle(){
  const mount = document.getElementById("article");
  if(!mount) return;

  const list = sortedPosts();
  const slug = new URLSearchParams(location.search).get("p");
  const idx = list.findIndex(x => x.slug === slug);
  const post = list[idx];

  if(!post){
    mount.innerHTML = `
      <div class="article-head"><h1>That essay isn't here</h1></div>
      <div class="article-body"><p>The link may be out of date. <a href="/writing/" style="color:var(--gold)">Browse everything written so far.</a></p></div>`;
    return;
  }

  document.title = `${post.title} — Pranjal Desai`;
  const meta = document.querySelector('meta[name="description"]');
  if(meta) meta.setAttribute("content", post.excerpt || "");
  const canon = "https://pranjaldesai.in/post.html?p=" + encodeURIComponent(post.slug);
  const canonEl = document.getElementById("canon");
  if(canonEl) canonEl.setAttribute("href", canon);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if(ogUrl) ogUrl.setAttribute("content", canon);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if(ogTitle) ogTitle.setAttribute("content", post.title);

  const blocks = (post.body||[]).map(b => {
    if(b.lead)  return `<p class="lead">${esc(b.lead)}</p>`;
    if(b.quote) return `<blockquote>${esc(b.quote)}</blockquote>`;
    if(b.note)  return `<div class="article-note">${esc(b.note)}</div>`;
    if(b.img)   return `<figure><img src="${esc(b.img)}" alt="${esc(b.cap||post.title)}">${b.cap?`<figcaption>${esc(b.cap)}</figcaption>`:""}</figure>`;
    if(b.p)     return `<p>${esc(b.p)}</p>`;
    return "";
  }).join("");

  const prev = list[idx+1];
  const next = list[idx-1];

  mount.innerHTML = `
    <a class="back" href="/writing/">&larr; All writing</a>
    <div class="article-head">
      <div class="meta">
        <span class="tag">${esc(post.tag||"NOTE")}</span>
        <span class="meta" style="font-family:var(--f-mono);color:var(--muted)">${niceDate(post.date)} &nbsp;&middot;&nbsp; ${readTime(post)}</span>
      </div>
      <h1>${accentTitle(post.title, post.accent)}</h1>
    </div>
    <div class="article-body">${blocks}</div>
    <div class="byline">
      <img src="/assets/about-portrait.jpg" alt="Pranjal Desai">
      <div>
        <div class="name">Pranjal Desai</div>
        <a class="link" href="/writing/">All essays &rarr;</a>
      </div>
    </div>
    <div class="prevnext">
      <span>${prev ? `<a href="/post.html?p=${encodeURIComponent(prev.slug)}">&larr; ${esc(prev.title)}</a>` : ""}</span>
      <span>${next ? `<a href="/post.html?p=${encodeURIComponent(next.slug)}">${esc(next.title)} &rarr;</a>` : ""}</span>
    </div>`;
}

/* ---------------- boot ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initLegacyHashes();
  initNav();
  initMenu();
  initHero();
  initConnectCycle();
  initEssayFan();
  renderStoryGrid();
  initBooks();
  renderArticle();
  initReveal();

  const y = document.getElementById("year");
  if(y) y.textContent = new Date().getFullYear();
});
