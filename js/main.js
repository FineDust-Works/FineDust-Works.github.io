/* FineDust Works — interactions & particle field */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;

  /* ---------------- value noise (3D) ---------------- */
  const perm = new Uint8Array(512);
  (() => {
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const fade = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const h = (x, y, z) => perm[(perm[(perm[x & 255] + y) & 255] + z) & 255] / 255;
  function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const x00 = lerp(h(xi, yi, zi), h(xi + 1, yi, zi), xf);
    const x10 = lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf);
    const x01 = lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf);
    const x11 = lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf);
    return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf);
  }

  /* ---------------- logo geometry (from finedust-works-logo.svg) ---------------- */
  const LOGO_VB = { x: -7, y: -7, w: 54.75, h: 61.5 };
  const LOGO_CIRCLES = [
    [0, 0, 7], [14, 0, 5.75], [0, 9.5, 5.75], [14, 9.5, 5.25], [26, 9.5, 4.75],
    [0, 19, 5.25], [14, 19, 4.75], [26, 19, 3.5], [0, 28.5, 5.25], [30, 28.5, 3.5],
    [42, 28.5, 4.75], [0, 38, 5.75], [30, 38, 4.75], [42, 38, 5.25], [0, 47.5, 7], [42, 47.5, 5.75],
  ];
  const LOGO_PATHS = [
    "M-5.69129,4.07544 C-4.68339,5.48296 -4.70142,5.89704 -5.27014,7.2004 L5.27014,7.2004 C4.70142,5.89704 4.68339,5.48296 5.69129,4.07544 Z",
    "M9.52851,3.61501 C10.48012,4.79208 10.47528,5.37099 9.68721,6.50628 L18.31279,6.50628 C17.52472,5.37099 17.51988,4.79208 18.47149,3.61501 Z",
    "M-4.47149,13.11501 C-3.51988,14.29208 -3.52472,14.87099 -4.31279,16.00628 L4.31279,16.00628 C3.52472,14.87099 3.51988,14.29208 4.47149,13.11501 Z",
    "M10.35709,13.28043 C11.30572,14.19456 11.30954,14.90798 10.50292,15.78552 L17.49708,15.78552 C16.69046,14.90798 16.69428,14.19456 17.64291,13.28043 Z",
    "M-4.02123,22.37524 C-3.13739,23.42823 -3.13739,24.07177 -4.02123,25.12476 L4.02123,25.12476 C3.13739,24.07177 3.13739,23.42823 4.02123,22.37524 Z",
    "M-4.31279,31.49372 C-3.52472,32.62901 -3.51988,33.20792 -4.47149,34.38499 L4.47149,34.38499 C3.51988,33.20792 3.52472,32.62901 4.31279,31.49372 Z",
    "M38.50292,31.71448 C39.30954,32.59202 39.30572,33.30544 38.35709,34.21957 L45.64291,34.21957 C44.69428,33.30544 44.69046,32.59202 45.49708,31.71448 Z",
    "M-5.27014,40.2996 C-4.70142,41.60296 -4.68339,42.01704 -5.69129,43.42456 L5.69129,43.42456 C4.68339,42.01704 4.70142,41.60296 5.27014,40.2996 Z",
    "M37.68721,40.99372 C38.47528,42.12901 38.48012,42.70792 37.52851,43.88499 L46.47149,43.88499 C45.51988,42.70792 45.52472,42.12901 46.31279,40.99372 Z",
  ];

  /** Rasterise the logo once and return points (in logo units) inside the shape. */
  function sampleLogo(count) {
    const S = 8; // px per logo unit for the sampling raster
    const c = document.createElement("canvas");
    c.width = Math.ceil(LOGO_VB.w * S); c.height = Math.ceil(LOGO_VB.h * S);
    const g = c.getContext("2d");
    g.setTransform(S, 0, 0, S, -LOGO_VB.x * S, -LOGO_VB.y * S);
    g.fillStyle = "#fff";
    LOGO_CIRCLES.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    if (typeof Path2D !== "undefined") LOGO_PATHS.forEach((d) => g.fill(new Path2D(d)));
    const data = g.getImageData(0, 0, c.width, c.height).data;
    const inside = [];
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
      if (data[(y * c.width + x) * 4 + 3] > 128) inside.push([x / S + LOGO_VB.x, y / S + LOGO_VB.y]);
    }
    const pts = [];
    for (let i = 0; i < count; i++) {
      const p = inside[(Math.random() * inside.length) | 0];
      pts.push([p[0] + (Math.random() - 0.5) * 0.25, p[1] + (Math.random() - 0.5) * 0.25]);
    }
    return pts;
  }

  /* ---------------- global pointer (viewport coords) ----------------
     Interactive elements read this every frame / on scroll, so they stay
     correct when the page scrolls under a cursor that isn't moving. */
  const pointer = { x: -9999, y: -9999, has: false };
  const pointerSubs = [];
  let pointerQueued = false;
  const notifyPointer = () => {
    if (pointerQueued) return;
    pointerQueued = true;
    requestAnimationFrame(() => { pointerQueued = false; pointerSubs.forEach((fn) => fn()); });
  };
  const setPointer = (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true; notifyPointer(); };
  window.addEventListener("pointermove", setPointer, { passive: true });
  window.addEventListener("pointerdown", setPointer, { passive: true });
  const dropTouch = (e) => { if (e.pointerType !== "mouse") { pointer.has = false; notifyPointer(); } };
  window.addEventListener("pointerup", dropTouch, { passive: true });
  window.addEventListener("pointercancel", dropTouch, { passive: true });
  document.documentElement.addEventListener("mouseleave", () => { pointer.has = false; notifyPointer(); });
  window.addEventListener("blur", () => { pointer.has = false; notifyPointer(); });
  window.addEventListener("scroll", notifyPointer, { passive: true });

  /* ---------------- hero dust field ---------------- */
  const canvas = document.getElementById("dust");
  const coord = document.getElementById("coord");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, DPR = 1;
    let logoPts = [];
    let shape = [];   // particles that form the logo
    let ambient = []; // smoke particles drifting through
    // cursor in canvas space; `hover` eases 0→1 so the spread breathes in/out
    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false, hover: 0 };
    function readMouse() {
      const r = canvas.getBoundingClientRect();
      const x = pointer.x - r.left, y = pointer.y - r.top;
      mouse.active = pointer.has && x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      if (mouse.active) {
        if (mouse.sx < -999) { mouse.sx = x; mouse.sy = y; }
        mouse.x = x; mouse.y = y;
      }
    }
    let scatter = 0;  // 0 = fully formed, 1 = fully dispersed (driven by scroll)
    let t = 0;
    let visible = true;

    const isMobile = () => W < 1024;

    function layout() {
      // where the logo sits in the hero
      const VH = Math.min(H, window.innerHeight); // hero can be taller than the viewport on mobile
      const scale = isMobile() ? Math.min(W * 0.5, VH * 0.3) / LOGO_VB.h : Math.min(VH * 0.62, W * 0.36) / LOGO_VB.h;
      const lw = LOGO_VB.w * scale, lh = LOGO_VB.h * scale;
      const cx = isMobile() ? W * 0.5 : W * 0.72;
      const cy = isMobile() ? 72 + lh / 2 + VH * 0.02 : H * 0.5;
      return { scale, ox: cx - lw / 2 - LOGO_VB.x * scale, oy: cy - lh / 2 - LOGO_VB.y * scale };
    }

    function build() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const nShape = isMobile() ? 1200 : 1800;
      const nAmb = isMobile() ? 260 : 520;
      if (logoPts.length !== nShape) logoPts = sampleLogo(nShape);
      const L = layout();

      const prev = shape;
      shape = logoPts.map(([lx, ly], i) => {
        const tx = L.ox + lx * L.scale, ty = L.oy + ly * L.scale;
        const old = prev[i];
        return {
          tx, ty,
          x: old ? old.x : Math.random() * W,
          y: old ? old.y : H + Math.random() * H * 0.6,
          vx: 0, vy: 0,
          s: 0.5 + Math.random() * 1.3,
          a: 0.35 + Math.random() * 0.6,
          k: 0.012 + Math.random() * 0.02,   // spring stiffness – staggered arrival
          seed: Math.random() * 1000,
          // idle float: each mote bobs on its own slow, slightly elliptical orbit
          fa: 1.2 + Math.random() * 2.6,     // amplitude (px)
          fx: 5 + Math.random() * 7,         // x frequency
          fy: 4 + Math.random() * 6,         // y frequency
        };
      });
      if (ambient.length !== nAmb) {
        ambient = Array.from({ length: nAmb }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          s: 0.4 + Math.random() * 2.2,
          a: 0.04 + Math.random() * 0.16,
          sp: 0.15 + Math.random() * 0.5,
        }));
      }
    }

    function step() {
      t += 0.0035;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      // ambient smoke: flow-field drift, rising slowly
      for (const p of ambient) {
        const n = noise3(p.x * 0.0025, p.y * 0.0025, t);
        const ang = n * TAU * 2 - Math.PI / 2;
        p.x += Math.cos(ang) * p.sp * 0.8;
        p.y += Math.sin(ang) * p.sp * 0.6 - p.sp * 0.35;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        ctx.fillStyle = `rgba(169,169,162,${p.a})`;
        ctx.fillRect(p.x, p.y, p.s, p.s);
      }

      // logo particles
      readMouse();
      mouse.hover += ((mouse.active ? 1 : 0) - mouse.hover) * 0.08;
      if (mouse.active) {
        mouse.sx += (mouse.x - mouse.sx) * 0.18;
        mouse.sy += (mouse.y - mouse.sy) * 0.18;
      }
      const R = isMobile() ? 60 : 95;          // spread radius
      const SPREAD = (isMobile() ? 16 : 26) * mouse.hover; // max push in px
      const R2 = R * R;
      const disp = scatter;
      for (const p of shape) {
        const n = noise3(p.x * 0.004, p.y * 0.004, t + p.seed * 0.0001);
        const ang = n * TAU * 2;
        let jitter = 0.04 + disp * 1.6;

        // hover: nudge this particle's resting spot outward from the cursor,
        // so the dust loosens locally and settles back when the cursor leaves
        // idle float: personal orbit + a slow shared current so the mark breathes as a whole
        const cur = (noise3(p.tx * 0.008, p.ty * 0.008, t * 1.5) - 0.5) * 7;
        let gx = p.tx + Math.sin(t * p.fx + p.seed) * p.fa + cur;
        let gy = p.ty + Math.cos(t * p.fy + p.seed * 1.3) * p.fa - cur * 0.6;
        if (SPREAD > 0.1) {
          const dx = p.tx - mouse.sx, dy = p.ty - mouse.sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1;
            const fall = (1 - d / R) * (1 - d / R);
            const push = fall * SPREAD;
            const wob = Math.sin(t * 40 + p.seed) * 0.35 + 0.65; // uneven, dusty edge
            gx += (dx / d) * push * wob;
            gy += (dy / d) * push * wob;
            jitter += fall * 0.35 * mouse.hover;
          }
        }

        // spring toward (possibly spread) target, weakened as scroll disperses the mark
        const k = p.k * (1 - disp * 0.92);
        p.vx += (gx - p.x) * k + Math.cos(ang) * jitter;
        p.vy += (gy - p.y) * k + Math.sin(ang) * jitter - disp * 0.25;
        p.vx *= 0.9; p.vy *= 0.9;
        p.x += p.vx; p.y += p.vy;

        const dist = Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y);
        const settle = Math.max(0.25, 1 - dist / 260);
        ctx.fillStyle = `rgba(231,231,226,${p.a * settle})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    let raf = 0;
    function loop() {
      if (visible) step();
      raf = requestAnimationFrame(loop);
    }

    // The field always runs (it's the brand's core visual, and motion is gentle).
    // With reduced-motion on we only skip the big fly-in and the scroll dispersal.
    build();
    if (reduceMotion) shape.forEach((p) => { p.x = p.tx; p.y = p.ty; });
    loop();

    let rt;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(build, 120);
    });

    const hero = canvas.parentElement;
    // coordinate readout follows pointer moves *and* scrolling
    pointerSubs.push(() => {
      readMouse();
      if (coord && mouse.active) coord.textContent = `x ${(mouse.x / W).toFixed(3)} · y ${(mouse.y / H).toFixed(3)}`;
    });

    window.addEventListener("scroll", () => {
      scatter = reduceMotion ? 0 : Math.min(1, Math.max(0, window.scrollY / (H * 0.9)));
    }, { passive: true });

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
  }

  /* ---------------- approach mini-fields ----------------
     Each stage gives every particle a "home" that is recomputed every frame,
     then springs it there with zero-mean jitter. Because homes are defined
     explicitly (no flow-field sinks, no wrap-around), each animation stays in
     the same steady state forever: it can't collapse to a dot or pile up on an edge. */
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const rand = (a, b) => a + Math.random() * (b - a);

  const MODES = {
    // evenly scattered dust, each mote wandering around its own patch
    disperse: {
      n: 120, alpha: 0.5,
      init(p, w, h) { p.hx = rand(10, w - 10); p.hy = rand(10, h - 10); p.ph = rand(0, TAU); p.sp = rand(0.3, 0.8); },
      home(p, w, h, t) {
        return [p.hx + Math.sin(t * p.sp + p.ph) * 9, p.hy + Math.cos(t * p.sp * 0.8 + p.ph * 1.7) * 7];
      },
      k: 0.03, jit: 0.12,
    },
    // a few loose clusters forming, with a handful of strays drifting between them
    gather: {
      n: 140, alpha: 0.6,
      init(p, w, h, i) {
        p.cl = i % 4; p.stray = Math.random() < 0.15;
        p.r = Math.sqrt(Math.random()) * h * rand(0.1, 0.2); p.a0 = rand(0, TAU); p.sp = rand(0.15, 0.45) * (Math.random() < 0.5 ? -1 : 1);
        p.hx = rand(10, w - 10); p.hy = rand(10, h - 10); p.ph = rand(0, TAU);
      },
      home(p, w, h, t) {
        if (p.stray) return [p.hx + Math.sin(t * 0.4 + p.ph) * 14, p.hy + Math.cos(t * 0.3 + p.ph) * 10];
        const C = [[0.2, 0.38], [0.45, 0.66], [0.66, 0.32], [0.84, 0.62]][p.cl];
        const cx = C[0] * w + Math.sin(t * 0.35 + p.cl * 2) * 6, cy = C[1] * h + Math.cos(t * 0.3 + p.cl) * 5;
        const a = p.a0 + t * p.sp;
        return [cx + Math.cos(a) * p.r, cy + Math.sin(a) * p.r * 0.85];
      },
      k: 0.04, jit: 0.1,
    },
    // one dense, slowly rotating body — clearly solid but never a single point
    condense: {
      n: 160, alpha: 0.8,
      init(p, w, h, i, n) { p.i = i; p.n = n; },
      home(p, w, h, t) {
        const R = Math.min(h * 0.34, w * 0.2) * (1 + Math.sin(t * 0.9) * 0.04);
        const r = R * Math.sqrt((p.i + 0.5) / p.n), a = p.i * GOLDEN + t * 0.25;
        return [w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r];
      },
      k: 0.06, jit: 0.05,
    },
    // a compact core that keeps emitting particles outward, which fade as they travel
    release: {
      n: 160, alpha: 0.8,
      init(p, w, h, i, n) {
        p.core = i < n * 0.35; p.i = i; p.n = Math.round(n * 0.35);
        p.life = Math.random(); p.dir = rand(0, TAU); p.spd = rand(0.18, 0.32);
      },
      home(p, w, h, t, dt) {
        const cx = w / 2, cy = h / 2, R0 = Math.min(h * 0.16, w * 0.1);
        if (p.core) {
          const r = R0 * Math.sqrt((p.i + 0.5) / p.n), a = p.i * GOLDEN - t * 0.3;
          return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
        }
        p.life += dt * p.spd;
        if (p.life > 1) { p.life -= 1; p.dir = rand(0, TAU); p.x = cx; p.y = cy; p.vx = p.vy = 0; }
        const maxR = Math.hypot(w, h) * 0.5;
        const r = R0 + (1 - (1 - p.life) * (1 - p.life)) * maxR;
        return [cx + Math.cos(p.dir) * r, cy + Math.sin(p.dir) * r * 0.9];
      },
      fade(p) { return p.core ? 1 : Math.max(0, 1 - p.life) ** 1.4; },
      k: 0.08, jit: 0.06,
    },
  };

  document.querySelectorAll(".step__viz").forEach((el) => {
    const mode = MODES[el.dataset.mode] || MODES.disperse;
    const c = document.createElement("canvas");
    el.appendChild(c);
    const g = c.getContext("2d");
    let w = 0, hgt = 0, pts = [], on = false, tt = rand(0, 20);
    const DT = 1 / 60;

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = el.clientWidth; hgt = el.clientHeight;
      c.width = w * dpr; c.height = hgt * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = Array.from({ length: mode.n }, (_, i) => {
        const p = { x: rand(0, w), y: rand(0, hgt), vx: 0, vy: 0, s: rand(0.7, 1.7), a: rand(0.5, 1) };
        mode.init(p, w, hgt, i, mode.n);
        return p;
      });
    }
    function frame() {
      tt += DT;
      g.clearRect(0, 0, w, hgt);
      for (const p of pts) {
        const [hx, hy] = mode.home(p, w, hgt, tt, DT);
        p.vx += (hx - p.x) * mode.k + (Math.random() - 0.5) * mode.jit;
        p.vy += (hy - p.y) * mode.k + (Math.random() - 0.5) * mode.jit;
        p.vx *= 0.82; p.vy *= 0.82;
        p.x += p.vx; p.y += p.vy;
        const f = mode.fade ? mode.fade(p) : 1;
        if (f <= 0.01) continue;
        g.fillStyle = `rgba(231,231,226,${mode.alpha * p.a * f})`;
        g.beginPath(); g.arc(p.x, p.y, p.s * 0.75, 0, TAU); g.fill();
      }
    }
    function settle() { for (let i = 0; i < 240; i++) frame(); }
    function loop() { if (on) frame(); requestAnimationFrame(loop); }
    size(); settle();
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { size(); settle(); }, 120); });
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(el);
    loop();
  });

  /* ---------------- reveal on scroll ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    io.observe(el);
  });

  /* ---------------- hover state + card glow, driven by the global pointer ----------------
     Recomputed on pointer move AND scroll, so a still cursor stays accurate. */
  const hotEls = [...document.querySelectorAll(".card, .lab__item")];
  pointerSubs.push(() => {
    for (const el of hotEls) {
      const r = el.getBoundingClientRect();
      const x = pointer.x - r.left, y = pointer.y - r.top;
      const inside = pointer.has && x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      el.classList.toggle("is-hot", inside);
      if (inside && el.classList.contains("card")) {
        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);
      }
    }
  });

  /* ---------------- in-page links: quick eased scroll ----------------
     Hand-rolled instead of CSS `scroll-behavior` so it's fast, consistent
     across browsers, and still animates when the OS asks for reduced motion
     (native smooth scrolling just jumps then). Any wheel/touch/key input cancels it. */
  let scrollAnim = 0;
  const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function cancelScroll() { if (scrollAnim) { cancelAnimationFrame(scrollAnim); scrollAnim = 0; } }
  ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, cancelScroll, { passive: true }));

  function scrollToY(targetY) {
    cancelScroll();
    const startY = window.scrollY;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const endY = Math.max(0, Math.min(targetY, maxY));
    const dist = Math.abs(endY - startY);
    if (dist < 2) return;
    // short hops ~350ms, page-spanning jumps cap at ~750ms
    const dur = Math.min(750, 320 + Math.sqrt(dist) * 7);
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, startY + (endY - startY) * easeInOutCubic(k));
      scrollAnim = k < 1 ? requestAnimationFrame(tick) : 0;
    };
    scrollAnim = requestAnimationFrame(tick);
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = a.getAttribute("href").slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    const y = id === "top" ? 0 : target.getBoundingClientRect().top + window.scrollY;
    scrollToY(y);
    history.pushState(null, "", "#" + id);
    // move keyboard focus to the section without a second (instant) scroll
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  /* ---------------- nav ---------------- */
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    links.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------------- copy email on click (mailto still opens) ---------------- */
  const mail = document.querySelector(".contact__mail");
  if (mail) {
    const address = mail.getAttribute("href").replace(/^mailto:/, "");
    const fallbackCopy = (text) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) {}
      ta.remove();
      return ok;
    };
    let hideTimer;
    const showCopied = () => {
      mail.classList.add("is-copied");
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => mail.classList.remove("is-copied"), 1800);
    };
    mail.addEventListener("click", () => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(address).then(showCopied, () => { if (fallbackCopy(address)) showCopied(); });
      } else if (fallbackCopy(address)) {
        showCopied();
      }
    });
  }

  /* ---------------- nav: mark the section in view ---------------- */
  const navMap = new Map();
  links.querySelectorAll('a[href^="#"]').forEach((a) => {
    const sec = document.getElementById(a.getAttribute("href").slice(1));
    if (sec) navMap.set(sec, a);
  });
  const setCurrent = (a) => navMap.forEach((link) => {
    if (link === a) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
  // a section counts as "current" while it crosses the middle band of the viewport
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setCurrent(navMap.get(e.target)); });
  }, { rootMargin: "-45% 0px -50% 0px" });
  navMap.forEach((_, sec) => spy.observe(sec));
  const hero = document.getElementById("top");
  if (hero) new IntersectionObserver(([e]) => { if (e.isIntersecting) setCurrent(null); },
    { rootMargin: "-45% 0px -50% 0px" }).observe(hero);

  /* placeholder links that aren't live yet */
  document.querySelectorAll('a[aria-disabled="true"]').forEach((a) =>
    a.addEventListener("click", (e) => e.preventDefault()));

  console.log(
    "%c· · FineDust Works\n%cSmall particles. Shaped into things that work.\nhello@finedustworks.com",
    "font: 600 14px/1.6 monospace; color: #e7e7e2",
    "font: 12px/1.6 monospace; color: #a9a9a2"
  );

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
