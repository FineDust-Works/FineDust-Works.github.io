/* FineDust Works — /projects/ : category index and project detail pages.
   One page, two views: /projects/ (list) and /projects/?id=<id>&tab=<tab> (detail).
   Everything is rendered from the content JSON (see /content/README.md). */
(() => {
  "use strict";
  const C = window.FDContent;
  const { esc, inline, md } = C;
  const root = document.getElementById("projects");
  const params = new URLSearchParams(location.search);

  const BASE_TABS = [
    { key: "overview", title: "Overview" },
    { key: "features", title: "Features" },
    { key: "architecture", title: "Architecture" },
    { key: "development", title: "Development" },
    { key: "changelog", title: "Changelog" },
  ];
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const has = (v) => (Array.isArray(v) ? v.length > 0 : !!v);
  const pad = (n) => String(n).padStart(2, "0");

  /* ---------- reveal for rendered content (main.js only sees the initial DOM) ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
  function reveal(scope) {
    scope.querySelectorAll(".reveal:not(.is-in)").forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 60}ms`;
      io.observe(el);
    });
  }

  const sec = (kicker, title, body, extra = "") =>
    `<section class="psec${extra}"><header class="psec__head reveal"><p class="kicker">${esc(kicker)}</p>${title ? `<h2 class="psec__title">${title}</h2>` : ""}</header>${body}</section>`;

  function setMeta(title, desc) {
    document.title = title;
    const m = document.querySelector('meta[name="description"]');
    if (m && desc) m.setAttribute("content", desc);
  }

  function fail(msg) {
    root.innerHTML = `<section class="pempty wrap"><p class="kicker">Projects</p><h1 class="pempty__title">${msg}</h1>
      <a class="btn btn--ghost" href="/projects/"><span class="btn__face">모든 프로젝트 보기<span class="btn__arrow" aria-hidden="true">→</span></span></a></section>`;
  }

  /* =====================================================================
     LIST VIEW
     ===================================================================== */
  function card(p, cats) {
    const cat = cats.find((c) => c.id === p.category);
    const cover = p.cover ? `<div class="pcard__media"><img src="${esc(C.media(p, p.cover.src))}" alt="${esc(p.cover.alt || "")}" loading="lazy" /></div>`
      : `<div class="pcard__media pcard__media--empty" aria-hidden="true"><span>${esc(p.name)}</span></div>`;
    return `<li class="pcard reveal">
      <a class="pcard__link" href="${C.projectUrl(p.id)}">
        ${cover}
        <div class="pcard__body">
          <div class="pcard__meta">${C.statusHTML(p.status)}<span>${esc(cat ? cat.name : "")}${p.version ? ` · v${esc(p.version)}` : ""}</span></div>
          <h3 class="pcard__name">${esc(p.name)}<span class="lab__arrow" aria-hidden="true">↗</span></h3>
          <p class="pcard__tagline">${esc(p.tagline)}</p>
          ${has(p.stack) ? `<ul class="tags">${p.stack.slice(0, 5).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
        </div>
      </a>
    </li>`;
  }

  async function renderList() {
    const [s, list] = await Promise.all([C.site(), C.projects()]);
    const cats = s.categories;
    let active = params.get("category");
    if (!cats.some((c) => c.id === active)) active = null;
    setMeta("Projects — FineDust Works", "FineDust Works의 모든 프로젝트를 로보틱스, 디바이스, 툴, AI 에이전트, 소프트웨어, 게임 여섯 개 영역으로 나눠 소개합니다.");

    const count = (id) => list.filter((p) => p.category === id).length;
    const chips = [`<button class="chip" data-cat="" aria-pressed="${!active}">All <span>${list.length}</span></button>`]
      .concat(cats.map((c) => `<button class="chip" data-cat="${c.id}" aria-pressed="${active === c.id}">${esc(c.name)} <span>${count(c.id)}</span></button>`));

    const groups = cats.map((c) => {
      const items = list.filter((p) => p.category === c.id);
      return `<section class="pgroup${items.length ? "" : " pgroup--empty"}" data-cat="${c.id}" id="${c.id}">
        <header class="pgroup__head reveal">
          <span class="card__no">/${esc(c.no)}</span>
          <h2 class="pgroup__name">${esc(c.name)}</h2>
          <p class="pgroup__summary">${esc(c.summary)}</p>
          <span class="pgroup__count">${items.length ? pad(items.length) : `<span class="pgroup__soon">Coming soon</span>`}</span>
        </header>
        ${items.length ? `<ul class="pcards">${items.map((p) => card(p, cats)).join("")}</ul>` : ""}
      </section>`;
    }).join("");

    root.innerHTML = `
      <section class="section plist">
        <div class="wrap">
          <header class="section__head section__head--row reveal">
            <div>
              <p class="kicker">Projects</p>
              <h1 class="h2">모든 입자를 <em>여섯 개의 영역</em>으로</h1>
            </div>
            <p class="section__note">FineDust Works에서 만들고 있는 프로젝트입니다. 각 프로젝트의 기능, 기술 구조, 개발 과정, 업데이트 기록을 볼 수 있습니다.</p>
          </header>
          <div class="chips reveal" role="group" aria-label="카테고리 필터">${chips.join("")}</div>
          <div class="pgroups">${groups}</div>
        </div>
      </section>`;

    const apply = (cat) => {
      root.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.cat || null) === cat)));
      root.querySelectorAll(".pgroup").forEach((g) => { g.hidden = !!cat && g.dataset.cat !== cat; });
      const u = new URL(location.href);
      if (cat) u.searchParams.set("category", cat); else u.searchParams.delete("category");
      history.replaceState(null, "", u);
    };
    root.querySelector(".chips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (b) apply(b.dataset.cat || null);
    });
    apply(active);
    reveal(root);
  }

  /* =====================================================================
     DETAIL VIEW — panels
     ===================================================================== */
  function mediaHTML(p, m) {
    if (!m || !m.src) return "";
    const src = esc(C.media(p, m.src));
    let el;
    if (m.type === "video") el = `<video src="${src}" ${m.poster ? `poster="${esc(C.media(p, m.poster))}"` : ""} autoplay muted loop playsinline preload="metadata" aria-label="${esc(m.alt || "")}"></video>`;
    else if (m.type === "embed") el = `<iframe src="${src}" title="${esc(m.alt || "")}" loading="lazy" allowfullscreen></iframe>`;
    else el = `<img src="${src}" alt="${esc(m.alt || "")}" loading="lazy" data-zoom />`;
    return `<figure class="pmedia pmedia--${esc(m.type || "image")}"><div class="pmedia__frame">${el}</div>${m.caption ? `<figcaption>${inline(m.caption)}</figcaption>` : ""}</figure>`;
  }

  const panels = {
    overview(p, ctx) {
      const o = p.overview || {};
      const facts = [
        ["Status", C.status(p.status).label],
        ["Domain", ctx.cat ? ctx.cat.name : "—"],
        ["Version", p.version || "—"],
        ["Updated", p.updated || "—"],
      ];
      return `
        <dl class="pfacts reveal">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <div class="pcols">
          ${o.concept ? sec("Concept", "핵심 컨셉", `<div class="prose reveal">${md(o.concept)}</div>`) : ""}
          ${o.motivation ? sec("Motivation", "개발 동기", `<div class="prose reveal">${md(o.motivation)}</div>`) : ""}
        </div>
        ${has(o.highlights) ? sec("Highlights", "한눈에 보기", `<ol class="plist-rows">${o.highlights.map((h, i) => `<li class="reveal"><span class="card__no">/${pad(i + 1)}</span><span>${inline(h)}</span></li>`).join("")}</ol>`) : ""}
        ${has(p.stack) ? sec("Stack", "", `<ul class="tags tags--lg reveal">${p.stack.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`) : ""}
        ${has(p.links) ? sec("Links", "", `<ul class="plinks reveal">${p.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span><span class="plinks__url">${esc(l.url.replace(/^https?:\/\//, ""))}</span><span class="lab__arrow" aria-hidden="true">↗</span></a></li>`).join("")}</ul>`) : ""}`;
    },

    features(p) {
      const list = p.features || [];
      if (!list.length) return emptyPanel();
      return `<ol class="pfeats">${list.map((f, i) => `
        <li class="pfeat${f.media ? "" : " pfeat--text"}">
          ${f.media ? `<div class="pfeat__media reveal">${mediaHTML(p, f.media)}</div>` : ""}
          <div class="pfeat__body reveal">
            <span class="card__no">/${pad(i + 1)}</span>
            <h2 class="pfeat__title">${esc(f.title)}</h2>
            <p class="pfeat__summary">${inline(f.summary)}</p>
            <dl class="pfeat__dl">
              ${f.how ? `<div><dt>How it works</dt><dd>${inline(f.how)}</dd></div>` : ""}
              ${f.useCase ? `<div><dt>Use case</dt><dd>${inline(f.useCase)}</dd></div>` : ""}
              ${f.edge ? `<div><dt>Why it's different</dt><dd>${inline(f.edge)}</dd></div>` : ""}
            </dl>
          </div>
        </li>`).join("")}</ol>`;
    },

    architecture(p) {
      const a = p.architecture || {};
      return `
        ${a.intro ? `<div class="prose prose--lead reveal">${md(a.intro)}</div>` : ""}
        ${has(a.stack) ? sec("Tech stack", "기술 스택", `<ul class="pstack">${a.stack.map((s) => `
          <li class="reveal"><span class="pstack__layer">${esc(s.layer)}</span>
            <ul class="tags">${(s.items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
            <p>${inline(s.why)}</p></li>`).join("")}</ul>`) : ""}
        ${a.diagram && has(a.diagram.groups) ? sec("System", "시스템 아키텍처", diagramHTML(a.diagram)) : ""}
        ${has(a.flow) ? sec("Data flow", "데이터 흐름", `<ol class="pflow">${a.flow.map((s, i) => `
          <li class="step reveal"><span class="step__no">${pad(i + 1)} · ${esc(s.title)}</span><p>${inline(s.body)}</p></li>`).join("")}</ol>`) : ""}
        ${has(a.decisions) ? sec("Decisions", "기술 선택 이유", `<div class="pcards2">${a.decisions.map((d) => `
          <article class="pbox reveal"><h3>${esc(d.title)}</h3><dl>
            <div><dt>Choice</dt><dd>${inline(d.choice)}</dd></div>
            ${d.alternatives ? `<div><dt>Instead of</dt><dd>${inline(d.alternatives)}</dd></div>` : ""}
            <div><dt>Why</dt><dd>${inline(d.reason)}</dd></div></dl></article>`).join("")}</div>`) : ""}
        ${has(a.algorithms) ? sec("Core", "핵심 알고리즘", a.algorithms.map((g) => `
          <article class="palgo reveal"><h3>${esc(g.title)}</h3><div class="prose">${md(g.body)}</div>
            ${g.code ? `<pre class="pcode"><code>${esc(g.code)}</code></pre>` : ""}</article>`).join("")) : ""}`;
    },

    development(p) {
      const d = p.development || {};
      return `
        ${d.intro ? `<div class="prose prose--lead reveal">${md(d.intro)}</div>` : ""}
        ${has(d.timeline) ? sec("Timeline", "아이디어에서 지금까지", `<ol class="ptimeline">${d.timeline.map((t) => `
          <li class="reveal"><span class="ptimeline__phase">${esc(t.phase)}</span><h3>${esc(t.title)}</h3><div class="prose">${md(t.body)}</div></li>`).join("")}</ol>`) : ""}
        ${has(d.challenges) ? sec("Problems solved", "해결한 문제", `<div class="pcards2">${d.challenges.map((c, i) => `
          <article class="pbox reveal"><span class="card__no">/${pad(i + 1)}</span><dl>
            <div><dt>Problem</dt><dd>${inline(c.problem)}</dd></div>
            <div><dt>Approach</dt><dd>${inline(c.approach)}</dd></div>
            <div><dt>Result</dt><dd>${inline(c.result)}</dd></div></dl></article>`).join("")}</div>`) : ""}
        ${has(d.abandoned) ? sec("Dead ends", "버린 접근법", `<ul class="plist-rows plist-rows--split">${d.abandoned.map((x) => `
          <li class="reveal"><strong>${inline(x.approach)}</strong><span>${inline(x.why)}</span></li>`).join("")}</ul>`) : ""}
        ${has(d.lessons) ? sec("Lessons", "개발하며 배운 점", `<ol class="plist-rows">${d.lessons.map((l, i) => `
          <li class="reveal"><span class="card__no">/${pad(i + 1)}</span><span>${inline(l)}</span></li>`).join("")}</ol>`) : ""}`;
    },

    changelog(p) {
      const c = p.changelog || {};
      const TYPE = { added: "Added", changed: "Changed", fixed: "Fixed", removed: "Removed" };
      const ROAD = [["next", "Next"], ["later", "Later"], ["exploring", "Exploring"]];
      const road = (c.roadmap || []);
      return `
        ${has(c.releases) ? sec("Releases", "업데이트 기록", `<ol class="prel">${c.releases.map((r) => `
          <li class="prel__item reveal${r.milestone ? " is-milestone" : ""}">
            <div class="prel__side"><span class="prel__ver">${esc(r.version)}</span><time>${esc(r.date || "")}</time>${r.milestone ? `<span class="prel__badge">Milestone</span>` : ""}</div>
            <div class="prel__main"><h3>${esc(r.title)}</h3>
              <ul class="prel__changes">${(r.changes || []).map((x) => `<li><span class="ptype ptype--${esc(x.type)}">${esc(TYPE[x.type] || x.type)}</span><span>${inline(x.text)}</span></li>`).join("")}</ul>
            </div></li>`).join("")}</ol>`) : ""}
        ${road.length ? sec("Roadmap", "앞으로의 계획", `<div class="proad">${ROAD.filter(([k]) => road.some((r) => r.status === k)).map(([k, label]) => `
          <div class="proad__col reveal"><p class="kicker">${label}</p>${road.filter((r) => r.status === k).map((r) => `
            <article class="pbox"><h3>${esc(r.title)}</h3>${r.body ? `<p>${inline(r.body)}</p>` : ""}</article>`).join("")}</div>`).join("")}</div>`) : ""}`;
    },

    /* ---------- extras ---------- */
    gallery(p, ctx, x) {
      return `${x.intro ? `<div class="prose prose--lead reveal">${md(x.intro)}</div>` : ""}
        <ul class="pgallery">${(x.items || []).map((g, i) => `
        <li class="reveal"><button class="pgallery__btn" data-index="${i}" aria-label="${esc(g.alt || g.caption || "")} 크게 보기">
          <img src="${esc(C.media(p, g.src))}" alt="${esc(g.alt || "")}" loading="lazy" /></button>
          ${g.caption ? `<p>${inline(g.caption)}</p>` : ""}</li>`).join("")}</ul>`;
    },
    playground(p, ctx, x) {
      const src = esc(C.media(p, x.src));
      return `${x.intro ? `<div class="prose prose--lead reveal">${md(x.intro)}</div>` : ""}
        <div class="pplay reveal">
          <div class="pplay__bar"><span class="pplay__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="pplay__url">${esc(x.src.replace(/^https?:\/\//, ""))}</span>
            <a href="${src}" target="_blank" rel="noopener">새 탭에서 열기<span class="lab__arrow" aria-hidden="true">↗</span></a></div>
          <div class="pplay__frame" style="aspect-ratio:${esc(x.aspect || "16 / 10")}"><iframe data-src="${src}" title="${esc(x.title || "Playground")}" allow="fullscreen; clipboard-write" loading="lazy"></iframe></div>
        </div>
        ${x.note ? `<p class="pnote reveal">${inline(x.note)}</p>` : ""}`;
    },
    downloads(p, ctx, x) {
      return `${x.intro ? `<div class="prose prose--lead reveal">${md(x.intro)}</div>` : ""}
        <ul class="plinks">${(x.items || []).map((d) => `<li class="reveal"><a href="${esc(C.media(p, d.url))}" target="_blank" rel="noopener">
          <span>${esc(d.label)}</span><span class="plinks__url">${inline(d.note || "")}</span><span class="lab__arrow" aria-hidden="true">↓</span></a></li>`).join("")}</ul>`;
    },
    notes(p, ctx, x) {
      return (x.sections || []).map((s) => sec(x.title, esc(s.heading), `<div class="prose reveal">${md(s.body)}</div>`)).join("");
    },
  };
  const emptyPanel = () => `<p class="pgroup__empty">이 항목은 아직 정리 중입니다.</p>`;

  /* ---------- architecture diagram: HTML boxes + SVG connectors ---------- */
  function diagramHTML(d) {
    return `<div class="pdiag reveal" data-edges='${esc(JSON.stringify(d.edges || []))}' style="--cols:${d.groups.length}">
      <svg class="pdiag__wires" aria-hidden="true"><defs><marker id="pdArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" /></marker></defs></svg>
      ${d.groups.map((g) => `<div class="pdiag__group"><p class="pdiag__title">${esc(g.title)}</p>
        ${(g.nodes || []).map((n) => `<div class="pdiag__node" data-node="${esc(n.id)}"><strong>${esc(n.label)}</strong>${n.note ? `<span>${esc(n.note)}</span>` : ""}</div>`).join("")}</div>`).join("")}
    </div>`;
  }
  function wireDiagram(el) {
    const svg = el.querySelector(".pdiag__wires");
    const edges = JSON.parse(el.dataset.edges || "[]");
    const NS = "http://www.w3.org/2000/svg";
    function draw() {
      svg.querySelectorAll("g").forEach((g) => g.remove());
      const box = el.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
      const rect = (id) => {
        const n = el.querySelector(`[data-node="${CSS.escape(id)}"]`);
        if (!n) return null;
        const r = n.getBoundingClientRect();
        return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2 };
      };
      edges.forEach(([from, to, label]) => {
        const a = rect(from), b = rect(to);
        if (!a || !b) return;
        let d, lx, ly, side = false;
        if (a.r + 6 < b.l) { // left → right
          const k = (b.l - a.r) / 2;
          d = `M${a.r} ${a.cy} C${a.r + k} ${a.cy} ${b.l - k} ${b.cy} ${b.l} ${b.cy}`;
          lx = (a.r + b.l) / 2; ly = (a.cy + b.cy) / 2;
        } else if (b.r + 6 < a.l) { // right → left
          const k = (a.l - b.r) / 2;
          d = `M${a.l} ${a.cy} C${a.l - k} ${a.cy} ${b.r + k} ${b.cy} ${b.r} ${b.cy}`;
          lx = (a.l + b.r) / 2; ly = (a.cy + b.cy) / 2;
        } else if (Math.abs(a.cy - b.cy) < (a.b - a.t) * 1.8 && Math.abs(a.cx - b.cx) < 8) { // stacked neighbours
          const down = b.t > a.b;
          d = down ? `M${a.cx} ${a.b} L${b.cx} ${b.t}` : `M${a.cx} ${a.t} L${b.cx} ${b.b}`;
          lx = a.cx + 8; ly = (down ? (a.b + b.t) / 2 : (b.b + a.t) / 2) + 9; side = true;
        } else { // same column, far apart: loop round the right-hand side
          const x = Math.max(a.r, b.r);
          const bulge = Math.min(46, 14 + Math.abs(a.cy - b.cy) * 0.12);
          d = `M${a.r} ${a.cy} C${x + bulge} ${a.cy} ${x + bulge} ${b.cy} ${b.r} ${b.cy}`;
          lx = x + bulge * 0.75 + 6; ly = (a.cy + b.cy) / 2 + 9; side = true;
        }
        const g = document.createElementNS(NS, "g");
        g.dataset.from = from; g.dataset.to = to;
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", d); path.setAttribute("marker-end", "url(#pdArrow)");
        g.appendChild(path);
        if (label) {
          const t = document.createElementNS(NS, "text");
          t.setAttribute("x", lx); t.setAttribute("y", ly - 6); t.setAttribute("text-anchor", side ? "start" : "middle");
          t.textContent = label;
          g.appendChild(t);
        }
        svg.appendChild(g);
      });
    }
    draw();
    new ResizeObserver(draw).observe(el);
    // hovering a node lights up its connections
    el.addEventListener("pointerover", (e) => {
      const n = e.target.closest(".pdiag__node");
      const id = n && n.dataset.node;
      el.classList.toggle("is-focus", !!id);
      el.querySelectorAll(".pdiag__node").forEach((x) => x.classList.toggle("is-on", x === n));
      svg.querySelectorAll("g").forEach((g) => g.classList.toggle("is-on", !!id && (g.dataset.from === id || g.dataset.to === id)));
    });
    el.addEventListener("pointerleave", () => {
      el.classList.remove("is-focus");
      el.querySelectorAll(".is-on").forEach((x) => x.classList.remove("is-on"));
    });
  }

  /* ---------- lightbox for gallery + feature images ---------- */
  const lightbox = (() => {
    let dlg, img, cap, items = [], i = 0;
    function build() {
      dlg = document.createElement("dialog");
      dlg.className = "plight";
      dlg.innerHTML = `<button class="plight__close" aria-label="닫기">×</button>
        <button class="plight__nav plight__nav--prev" aria-label="이전">←</button>
        <figure><img alt="" /><figcaption></figcaption></figure>
        <button class="plight__nav plight__nav--next" aria-label="다음">→</button>`;
      document.body.appendChild(dlg);
      img = dlg.querySelector("img"); cap = dlg.querySelector("figcaption");
      dlg.addEventListener("click", (e) => {
        if (e.target.closest(".plight__nav--prev")) show(i - 1);
        else if (e.target.closest(".plight__nav--next")) show(i + 1);
        else if (e.target === dlg || e.target.closest(".plight__close")) dlg.close();
      });
      dlg.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") show(i - 1);
        if (e.key === "ArrowRight") show(i + 1);
      });
      dlg.addEventListener("close", () => { document.body.style.overflow = ""; });
    }
    function show(n) {
      i = (n + items.length) % items.length;
      img.src = items[i].src; img.alt = items[i].alt || "";
      cap.innerHTML = items[i].caption ? inline(items[i].caption) : "";
      dlg.classList.toggle("is-single", items.length < 2);
    }
    return (list, start) => {
      if (!dlg) build();
      items = list; show(start);
      dlg.showModal();
      document.body.style.overflow = "hidden";
    };
  })();

  /* =====================================================================
     DETAIL VIEW — page
     ===================================================================== */
  async function renderDetail(id) {
    let p, s, all;
    try { [p, s, all] = await Promise.all([C.project(id), C.site(), C.projects()]); }
    catch (e) { fail("찾는 프로젝트가 없습니다."); return; }
    if (!s.projects.includes(id)) { fail("찾는 프로젝트가 없습니다."); return; }

    const cat = s.categories.find((c) => c.id === p.category);
    const ctx = { cat };
    const extras = (p.extras || []).filter((x) => panels[x.type]).map((x) => ({ key: slug(x.title || x.type), title: x.title || x.type, extra: x }));
    const tabs = [...BASE_TABS, ...extras];
    const want = params.get("tab");
    let current = tabs.some((t) => t.key === want) ? want : "overview";

    setMeta(`${p.name} — FineDust Works`, `${p.name}: ${p.tagline}`);
    const primary = (p.links || []).filter((l) => l.primary);
    const rest = (p.links || []).filter((l) => !l.primary);
    const idx = all.findIndex((x) => x.id === id);
    const prev = all[idx - 1], next = all[idx + 1];
    const tabLinks = (suffix = "") => tabs.map((t, i) => `<a class="ptab" role="tab" id="tab-${t.key}${suffix}" href="${C.projectUrl(id, t.key)}" data-tab="${t.key}" aria-controls="panel-${t.key}"><span>${pad(i + 1)}</span>${esc(t.title)}</a>`).join("");

    root.innerHTML = `
      <section class="phero">
        <div class="wrap phero__grid">
          <div class="phero__text">
            <nav class="pcrumb" aria-label="위치"><a href="/projects/">Projects</a><span>/</span><a href="/projects/?category=${esc(p.category)}">${esc(cat ? cat.name : p.category)}</a></nav>
            <div class="phero__meta">${C.statusHTML(p.status)}${p.version ? `<span>v${esc(p.version)}</span>` : ""}${p.updated ? `<span>Updated ${esc(p.updated)}</span>` : ""}</div>
            <h1 class="phero__title">${esc(p.name)}</h1>
            ${p.fullName ? `<p class="phero__full">${esc(p.fullName)}</p>` : ""}
            <p class="phero__tagline">${esc(p.tagline)}</p>
            <div class="prose phero__summary">${md(p.summary)}</div>
            ${(primary.length || rest.length || p.github) ? `<div class="hero__actions phero__actions">
              ${primary.map((l) => `<a class="btn btn--solid" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="btn__face">${esc(l.label)}<span class="btn__arrow" aria-hidden="true">↗</span></span></a>`).join("")}
              ${p.github ? `<a class="btn btn--ghost" href="${esc(p.github)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(p.name)} GitHub 저장소 (새 탭)"><span class="btn__face">GitHub<span class="btn__arrow" aria-hidden="true">↗</span></span></a>` : ""}
              ${rest.slice(0, 2).map((l) => `<a class="btn btn--ghost" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="btn__face">${esc(l.label)}</span></a>`).join("")}
            </div>` : ""}
          </div>
          ${p.cover ? `<figure class="phero__cover"><button class="pgallery__btn" data-cover aria-label="대표 이미지 크게 보기"><img src="${esc(C.media(p, p.cover.src))}" alt="${esc(p.cover.alt || "")}" /></button></figure>` : ""}
        </div>
      </section>
      <nav class="ptabs" aria-label="프로젝트 섹션"><div class="wrap"><div class="ptabs__inner" role="tablist">
        ${tabLinks()}
      </div></div></nav>
      <div class="ppanels wrap">
        ${tabs.map((t) => `<section class="ppanel" role="tabpanel" id="panel-${t.key}" aria-labelledby="tab-${t.key}" hidden></section>`).join("")}
        <nav class="ptabs ptabs--bottom" aria-label="프로젝트 섹션 하단"><div class="ptabs__inner" role="tablist" aria-label="프로젝트 섹션 하단">
          ${tabLinks("-bottom")}
        </div></nav>
      </div>
      <nav class="pnext wrap" aria-label="다른 프로젝트">
        ${prev ? `<a href="${C.projectUrl(prev.id)}"><span class="kicker">← Previous</span><strong>${esc(prev.name)}</strong></a>` : "<span></span>"}
        <a class="pnext__all" href="/projects/"><span class="kicker">All projects</span><strong>모든 프로젝트</strong></a>
        ${next ? `<a href="${C.projectUrl(next.id)}" class="pnext__r"><span class="kicker">Next →</span><strong>${esc(next.name)}</strong></a>` : "<span></span>"}
      </nav>`;

    const rendered = new Set();
    const tabsEl = root.querySelector(".ptabs");
    function show(key, push) {
      current = key;
      const t = tabs.find((x) => x.key === key);
      const panel = root.querySelector(`#panel-${key}`);
      if (!rendered.has(key)) {
        rendered.add(key);
        const fn = t.extra ? panels[t.extra.type] : panels[key];
        panel.innerHTML = `<header class="ppanel__head"><p class="kicker">${pad(tabs.indexOf(t) + 1)} — ${esc(t.title)}</p></header>` + fn(p, ctx, t.extra);
        panel.querySelectorAll(".pdiag").forEach(wireDiagram);
        panel.querySelectorAll("iframe[data-src]").forEach((f) => { f.src = f.dataset.src; });
        reveal(panel);
      }
      root.querySelectorAll(".ppanel").forEach((x) => { x.hidden = x !== panel; });
      root.querySelectorAll(".ptab").forEach((a) => {
        const on = a.dataset.tab === key;
        a.setAttribute("aria-selected", String(on));
        a.tabIndex = on ? 0 : -1;
        if (on) { // bring the active tab into the strip's view without scrolling the page
          const strip = a.parentElement;
          if (a.offsetLeft < strip.scrollLeft || a.offsetLeft + a.offsetWidth > strip.scrollLeft + strip.clientWidth) {
            strip.scrollTo({ left: a.offsetLeft - 16, behavior: push ? "smooth" : "auto" });
          }
        }
      });
      if (push) {
        history.pushState({ tab: key }, "", C.projectUrl(id, key === "overview" ? "" : key));
        // switching from further down the page: start the new panel right under the pinned tab bar
        const panels = root.querySelector(".ppanels");
        const pinned = (document.getElementById("nav").offsetHeight || 0) + tabsEl.offsetHeight;
        const top = panels.getBoundingClientRect().top + window.scrollY - pinned;
        if (window.scrollY > top) window.scrollTo({ top, behavior: "instant" });
      }
    }
    root.querySelectorAll(".ptabs__inner").forEach((strip) => {
      strip.addEventListener("click", (e) => {
        const a = e.target.closest(".ptab");
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        show(a.dataset.tab, true);
        if (strip.closest(".ptabs--bottom")) root.querySelector(`#tab-${a.dataset.tab}`).focus({ preventScroll: true });
      });
      strip.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const i = tabs.findIndex((t) => t.key === current) + (e.key === "ArrowRight" ? 1 : -1);
        const t = tabs[(i + tabs.length) % tabs.length];
        show(t.key, true);
        root.querySelector(`#tab-${t.key}`).focus({ preventScroll: true });
      });
    });
    window.addEventListener("popstate", () => {
      const k = new URLSearchParams(location.search).get("tab");
      show(tabs.some((t) => t.key === k) ? k : "overview", false);
    });
    // sticky tab bar gets a backdrop once it pins under the nav
    new IntersectionObserver(([e]) => tabsEl.classList.toggle("is-stuck", e.intersectionRatio < 1),
      { threshold: 1, rootMargin: `-${(document.getElementById("nav").offsetHeight || 60) + 1}px 0px 0px 0px` }).observe(tabsEl);

    // images open in the lightbox (gallery items as one set, others alone)
    root.addEventListener("click", (e) => {
      const btn = e.target.closest(".pgallery__btn");
      if (btn && btn.dataset.index != null) {
        const x = extras.find((t) => t.extra.type === "gallery").extra;
        lightbox(x.items.map((g) => ({ ...g, src: C.media(p, g.src) })), Number(btn.dataset.index));
        return;
      }
      if (btn && btn.hasAttribute("data-cover")) { lightbox([{ src: C.media(p, p.cover.src), alt: p.cover.alt }], 0); return; }
      const z = e.target.closest("img[data-zoom]");
      if (z) lightbox([{ src: z.src, alt: z.alt, caption: z.closest("figure")?.querySelector("figcaption")?.textContent }], 0);
    });

    show(current, false);
    reveal(root);
  }

  const id = params.get("id");
  const run = id ? renderDetail(id) : renderList();
  run.catch((e) => { console.error(e); fail("프로젝트를 불러오지 못했습니다."); });
})();
