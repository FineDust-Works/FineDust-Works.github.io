/* FineDust Works — project content loader
   Project data lives in github.com/cheesedongjin/finedust-works-content and is fetched at
   runtime, so editing a JSON file there updates the site without redeploying it.
   `?content=local` reads /content/ instead — a git-ignored local clone of that repo,
   for previewing drafts before pushing them. */
window.FDContent = (() => {
  "use strict";

  const REMOTE = "https://raw.githubusercontent.com/cheesedongjin/finedust-works-content/main/";
  const LOCAL = "/content/";
  const forceLocal = new URLSearchParams(location.search).get("content") === "local";
  const SOURCES = forceLocal ? [LOCAL] : [REMOTE];

  let base = null;
  let sitePromise = null;
  const projectCache = new Map();

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }

  /** site.json from the first source that answers; later files come from the same source. */
  function site() {
    if (!sitePromise) {
      sitePromise = (async () => {
        let lastErr;
        for (const src of SOURCES) {
          try {
            const data = await fetchJSON(src + "site.json");
            base = src;
            return data;
          } catch (e) { lastErr = e; }
        }
        throw lastErr;
      })();
    }
    return sitePromise;
  }

  async function project(id) {
    if (!/^[a-z0-9-]+$/.test(id || "")) throw new Error("bad id");
    if (!projectCache.has(id)) {
      projectCache.set(id, site().then(() => fetchJSON(`${base}projects/${id}/project.json`)));
    }
    return projectCache.get(id);
  }

  /** Every listed project, in site.json order. Projects that fail to load are skipped. */
  async function projects() {
    const s = await site();
    const list = await Promise.all(s.projects.map((id) => project(id).catch(() => null)));
    return list.filter(Boolean);
  }

  /** Resolve a media path relative to the project folder. */
  function media(p, src) {
    if (!src) return "";
    if (/^(https?:)?\/\//.test(src) || src.startsWith("/") || src.startsWith("data:")) return src;
    return `${base}projects/${p.id}/${src}`;
  }

  /* ---------- tiny text format: **bold**, `code`, [link](url), blank line = paragraph ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function md(s) {
    return String(s ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      .map((p) => `<p>${inline(p).replace(/\n/g, "<br />")}</p>`).join("");
  }

  const STATUS = {
    idea: { label: "Idea", live: false },
    prototype: { label: "Prototype", live: false },
    "in-progress": { label: "In progress", live: true },
    beta: { label: "Beta", live: true },
    live: { label: "Live", live: true },
    paused: { label: "Paused", live: false },
    archived: { label: "Archived", live: false },
  };
  const status = (key) => STATUS[key] || { label: key || "—", live: false };
  const statusHTML = (key) => {
    const s = status(key);
    return `<span class="lab__status${s.live ? " lab__status--live" : ""}">${esc(s.label)}</span>`;
  };

  const projectUrl = (id, tab) => `/projects/?id=${encodeURIComponent(id)}${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`;

  return { site, project, projects, media, esc, inline, md, status, statusHTML, projectUrl };
})();
