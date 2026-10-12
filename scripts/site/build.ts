/**
 * Builds forja's website into one static folder: the landing page
 * (site/index.html), the documentation (site/docs/*.md, rendered with a
 * sidebar, search and working links) and the assets.
 *
 *   npx tsx scripts/site/build.ts [--out _site]
 *
 * The look is Specgate's documentation site (docs.css, docs.js, the
 * highlighter and the icons are its own files), so the two tools read as one
 * family. Nothing here needs a server: the output can be opened from disk or
 * published to any static host.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked, type Tokens } from "marked";
import { highlight } from "./highlight.js";
import { icon } from "./icons.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = path.join(ROOT, "site");
const DOCS = path.join(SITE, "docs");
const REPO = "https://github.com/rsaglobaltech/forja";
const NPM = "https://www.npmjs.com/package/@rsaglobaltech/forja";

interface NavEntry {
  slug: string;
  label: string;
  blurb: string;
}
interface NavSection {
  title: string;
  icon: string;
  summary: string;
  entries: NavEntry[];
}

/** The sidebar, in the order a reader needs it. A page missing here fails the build. */
const NAV: NavSection[] = [
  {
    title: "Start",
    icon: "rocket",
    summary: "From an empty folder to a running project, then the commands you use every day.",
    entries: [
      { slug: "getting-started", label: "Getting started", blurb: "Install forja and generate a web + mobile monorepo in TypeScript." },
      { slug: "java", label: "Java backends", blurb: "A Spring Boot or Quarkus API, a Next.js web app and Keycloak sign-in." },
      { slug: "daily-use", label: "Daily use", blurb: "forja add for use cases, entities and ports; forja doctor for the setup." },
      { slug: "specgate", label: "forja + Specgate", blurb: "Requirements with scenarios, and tests that name them." },
      { slug: "e2e", label: "End-to-end tests", blurb: "Playwright drives the sign-in flow in a real browser." },
    ],
  },
  {
    title: "Reference",
    icon: "book",
    summary: "Every command, flag and configuration field, and what each one generates.",
    entries: [
      { slug: "cli", label: "Command line", blurb: "init, add, doctor: every flag and the values it accepts." },
      { slug: "config", label: "forja.config.json", blurb: "Every field, its values and its defaults." },
      { slug: "generated-project", label: "What it generates", blurb: "Recipe by recipe: the folders, the files, the versions." },
    ],
  },
  {
    title: "Background",
    icon: "compass",
    summary: "Why the projects look the way they do, and how to work on forja itself.",
    entries: [
      { slug: "architecture", label: "Architecture", blurb: "The hexagon forja generates and the rules that keep it." },
      { slug: "contributing", label: "Contributing", blurb: "Develop forja, write a recipe, verify what it generates." },
    ],
  },
];

const ENTRIES = NAV.flatMap((s) => s.entries);
const entryOf = (slug: string) => ENTRIES.find((e) => e.slug === slug);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stripTags = (html: string) => html.replace(/<[^>]+>/g, "");
const decodeEntities = (value: string) =>
  value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function slugify(text: string, taken: Set<string>): string {
  const base =
    decodeEntities(text)
      .toLowerCase()
      .replace(/[`'"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "section";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

/** `daily-use.md#add` → `daily-use.html#add`; links that leave the docs stay as they are. */
function rewriteLink(href: string): string {
  if (/^(https?:|mailto:|#)/i.test(href)) return href;
  const [file, hash] = href.split("#");
  if (file.endsWith(".md")) {
    const slug = path.posix.basename(file, ".md");
    if (entryOf(slug)) return `${slug}.html${hash ? `#${hash}` : ""}`;
    // A repository file (README.md, CHANGELOG.md): it lives on GitHub, not on the site.
    return `${REPO}/blob/develop/${file.replace(/^(\.\.\/)+/, "")}${hash ? `#${hash}` : ""}`;
  }
  return href;
}

interface Heading {
  id: string;
  text: string;
  level: number;
}

function codeBlock(code: string, language: string, label: string): string {
  return (
    `<figure class="code" data-lang="${escapeHtml(language)}">` +
    `<figcaption class="code__head"><span class="code__lang">${escapeHtml(label || language)}</span>` +
    `<button class="code__copy" type="button" aria-label="Copy to clipboard">Copy</button></figcaption>` +
    `<pre><code class="language-${escapeHtml(language)}">${highlight(code, language)}</code></pre></figure>\n`
  );
}

function render(source: string): { html: string; headings: Heading[]; title: string } {
  const headings: Heading[] = [];
  const taken = new Set<string>();
  let title = "";
  const renderer = new marked.Renderer();

  renderer.heading = function ({ tokens, depth }: Tokens.Heading) {
    const text = this.parser.parseInline(tokens);
    const plain = decodeEntities(stripTags(text));
    if (depth === 1 && !title) title = plain;
    const id = slugify(stripTags(text), taken);
    if (depth === 2 || depth === 3) headings.push({ id, text: plain, level: depth });
    return `<h${depth} id="${id}">${text}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`;
  };

  renderer.link = function ({ href, title: linkTitle, tokens }: Tokens.Link) {
    const text = this.parser.parseInline(tokens);
    const target = rewriteLink(href ?? "");
    const external = /^https?:/i.test(target);
    return (
      `<a href="${escapeHtml(target)}"` +
      (linkTitle ? ` title="${escapeHtml(linkTitle)}"` : "") +
      (external ? ' target="_blank" rel="noreferrer"' : "") +
      `>${text}</a>`
    );
  };

  // ```bash Install → language `bash`, header label "Install".
  renderer.code = ({ text, lang }: Tokens.Code) => {
    const [language = "text", ...label] = (lang ?? "").trim().split(/\s+/);
    return codeBlock(text, language || "text", label.join(" "));
  };

  renderer.table = function ({ header, rows }: Tokens.Table) {
    const cell = (c: Tokens.TableCell, tag: string) => `<${tag}>${this.parser.parseInline(c.tokens)}</${tag}>`;
    const head = header.map((c) => cell(c, "th")).join("");
    const body = rows.map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`).join("");
    return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
  };

  const html = marked.parse(source, { renderer, gfm: true, async: false }) as string;
  return { html, headings, title };
}

function sidebar(current: string): string {
  return NAV.map((section) => {
    const open = section.entries.some((e) => e.slug === current);
    const items = section.entries
      .map((e) => {
        const active = e.slug === current ? ' class="is-active" aria-current="page"' : "";
        return `<li><a href="${e.slug}.html"${active}>${escapeHtml(e.label)}</a></li>`;
      })
      .join("");
    return (
      `<details class="side__group" data-group="${escapeHtml(section.title)}"${open ? " open" : ""}>` +
      `<summary class="side__head">${icon(section.icon, "icon side__icon")}<span>${escapeHtml(section.title)}</span></summary>` +
      `<ul>${items}</ul></details>`
    );
  }).join("");
}

function breadcrumbs(slug: string): string {
  const section = NAV.find((s) => s.entries.some((e) => e.slug === slug));
  const entry = entryOf(slug);
  if (!section || !entry) return "";
  return (
    `<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="docs.html">Docs</a></li>` +
    `<li>${escapeHtml(section.title)}</li><li aria-current="page">${escapeHtml(entry.label)}</li></ol></nav>`
  );
}

function onThisPage(headings: Heading[]): string {
  if (headings.length < 2) return '<div class="rail" aria-hidden="true"></div>';
  const items = headings
    .map((h) => `<li class="toc__l${h.level}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`)
    .join("");
  return `<div class="rail"><nav class="toc" aria-label="On this page"><h2>On this page</h2><ul>${items}</ul></nav></div>`;
}

function pager(slug: string): string {
  const at = ENTRIES.findIndex((e) => e.slug === slug);
  if (at === -1) return "";
  const prev = ENTRIES[at - 1];
  const next = ENTRIES[at + 1];
  return (
    (prev ? `<a class="pager__prev" href="${prev.slug}.html"><span>Previous</span>${escapeHtml(prev.label)}</a>` : "<span></span>") +
    (next ? `<a class="pager__next" href="${next.slug}.html"><span>Next</span>${escapeHtml(next.label)}</a>` : "<span></span>")
  );
}

/** The forja mark: an anvil, drawn (a glyph would depend on the reader's fonts). */
export const MARK =
  '<svg class="mark" viewBox="0 0 64 64" aria-hidden="true" width="18" height="18">' +
  '<path d="M8 20h42v9h-7c-3 0-5 2-5 5v5h6v7H20v-7h6v-5c0-3-3-5-7-5-6 0-10-4-11-9Z" fill="currentColor"/></svg>';

interface Page {
  slug: string;
  title: string;
  description: string;
  html: string;
  headings: Heading[];
}

function shell(page: Page, version: string): string {
  return `<!doctype html>
<html lang="en" data-slug="${escapeHtml(page.slug)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)} — forja</title>
<meta name="description" content="${escapeHtml(page.description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${escapeHtml(page.title)} — forja">
<meta property="og:description" content="${escapeHtml(page.description)}">
<link rel="stylesheet" href="assets/docs.css">
<link rel="stylesheet" href="assets/forja.css">
<script>
  (function () {
    try { var t = localStorage.getItem("forja-theme"); if (t) document.documentElement.setAttribute("data-theme", t); } catch (e) {}
  })();
</script>
</head>
<body>
<a class="skip" href="#content">Skip to content</a>

<header class="top">
  <button class="top__menu" type="button" aria-label="Open navigation" aria-expanded="false"><span aria-hidden="true">☰</span></button>
  <a class="top__brand" href="index.html">${MARK} forja<span class="top__brand-sub">/docs</span></a>
  <span class="top__version">v${escapeHtml(version)}</span>
  <button class="top__search" id="search" type="button" aria-label="Search documentation" aria-keyshortcuts="Meta+K Control+K">
    ${icon("search", "icon")}
    <span class="top__search-label">search docs</span>
    <kbd class="top__kbd"><span class="top__kbd-mod">⌘</span>K</kbd>
  </button>
  <nav class="top__links">
    <a href="docs.html">Docs</a>
    <a href="${REPO}" target="_blank" rel="noreferrer">GitHub</a>
    <a href="${NPM}" target="_blank" rel="noreferrer">npm</a>
  </nav>
  <button class="top__theme" type="button" aria-label="Switch theme">◐</button>
</header>

<div class="shell">
  <aside class="side" id="side"><nav aria-label="Documentation">${sidebar(page.slug)}</nav></aside>
  <main class="content" id="content">
    ${breadcrumbs(page.slug)}
    <article class="prose">
${page.html}
    </article>
    <nav class="pager" aria-label="Neighbouring pages">${pager(page.slug)}</nav>
    <footer class="page-foot">
      <a href="${REPO}/edit/develop/site/docs/${escapeHtml(page.slug)}.md" target="_blank" rel="noreferrer">Edit this page</a>
      <span aria-hidden="true">·</span>
      <a href="${REPO}/issues/new" target="_blank" rel="noreferrer">Something wrong? Open an issue</a>
    </footer>
  </main>
  ${onThisPage(page.headings)}
</div>

<div class="palette" id="palette" hidden>
  <div class="palette__scrim" data-close="1"></div>
  <div class="palette__box" role="dialog" aria-modal="true" aria-label="Search documentation">
    <div class="palette__field">
      ${icon("search", "icon")}
      <input type="search" id="palette-input" placeholder="Search the documentation…" autocomplete="off" spellcheck="false" aria-label="Search documentation" aria-controls="results" aria-expanded="true">
      <kbd class="palette__esc">Esc</kbd>
    </div>
    <div class="palette__results" id="results" role="listbox" aria-label="Results"></div>
    <p class="palette__hint"><kbd>↑</kbd><kbd>↓</kbd> to navigate · <kbd>↵</kbd> to open · <kbd>Esc</kbd> to close</p>
  </div>
</div>

<script src="assets/docs.js" defer></script>
</body>
</html>
`;
}

function docsHome(version: string): Page {
  const groups = NAV.map((section) => {
    const cards = section.entries
      .map(
        (e) =>
          `<a class="card" href="${e.slug}.html"><strong class="card__title">${escapeHtml(e.label)}</strong>` +
          `<span class="card__body">${escapeHtml(e.blurb)}</span></a>`,
      )
      .join("");
    return (
      `<section class="home__group"><h2 id="${slugify(section.title, new Set())}">${icon(section.icon, "icon")}${escapeHtml(section.title)}</h2>` +
      `<p class="home__summary">${escapeHtml(section.summary)}</p><div class="cards" data-cols="2">${cards}</div></section>`
    );
  }).join("");
  return {
    slug: "docs",
    title: "Documentation",
    description: "forja's documentation: generate a hexagonal project, then grow it with forja add.",
    headings: NAV.map((s) => ({ id: slugify(s.title, new Set()), text: s.title, level: 2 })),
    html:
      `<h1>Documentation</h1>` +
      `<p class="home__lede">forja generates a project whose architecture is already in place, then adds to it ` +
      `without breaking it. Start with <a href="getting-started.html">Getting started</a>, or ` +
      `<a href="java.html">Java backends</a> for a Spring Boot or Quarkus API.</p>` +
      codeBlock("npx @rsaglobaltech/forja init", "bash", "Try it") +
      `<div class="home">${groups}</div>`,
  };
}

const plainText = (markdown: string) =>
  markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/[#*`>|_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** One search record per `##`/`###` section, so a hit lands on the paragraph. */
function sections(markdown: string, headings: Heading[]) {
  const out: { section: string; hash: string; text: string }[] = [];
  let current: { section: string; hash: string; body: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const text = plainText(current.body.join("\n")).slice(0, 600);
    if (text) out.push({ section: current.section, hash: current.hash, text });
  };
  for (const line of markdown.split("\n")) {
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (m) {
      flush();
      const plain = m[2].replace(/`/g, "");
      const heading = headings.find((h) => h.text === plain);
      current = heading ? { section: plain, hash: heading.id, body: [] } : null;
      continue;
    }
    current?.body.push(line);
  }
  flush();
  return out;
}

/** Where forja's documentation lives now: a section of Specgate's site (ADR-0033). */
export const DOCS_HOME = "https://rsaglobaltech.github.io/specgate/forja/";

/** A page that sends the reader to the same page on Specgate's site. */
function redirect(target: string, title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} — forja</title>
<meta http-equiv="refresh" content="0; url=${target}">
<link rel="canonical" href="${target}">
</head>
<body>
<p>forja's documentation moved to <a href="${target}">${target}</a>.</p>
</body>
</html>
`;
}

export function buildSite(outDir: string): { pages: number } {
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version as string;
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, "assets"), { recursive: true });

  // The documentation is published once, on Specgate's site; every old URL
  // here keeps working by sending the reader there.
  for (const e of ENTRIES) {
    fs.writeFileSync(path.join(outDir, `${e.slug}.html`), redirect(`${DOCS_HOME}${e.slug}.html`, e.label));
  }
  fs.writeFileSync(
    path.join(outDir, "docs.html"),
    redirect(`${DOCS_HOME}getting-started.html`, "Documentation"),
  );

  for (const f of fs.readdirSync(path.join(SITE, "assets"))) {
    fs.copyFileSync(path.join(SITE, "assets", f), path.join(outDir, "assets", f));
  }
  // The landing page is written by hand; only the version is filled in.
  const landing = fs.readFileSync(path.join(SITE, "index.html"), "utf8").replaceAll("{{version}}", version);
  fs.writeFileSync(path.join(outDir, "index.html"), landing);
  fs.writeFileSync(path.join(outDir, ".nojekyll"), "");
  return { pages: ENTRIES.length + 2 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf("--out");
  const outDir = path.resolve(at !== -1 ? process.argv[at + 1] : path.join(ROOT, "_site"));
  const { pages } = buildSite(outDir);
  process.stdout.write(`site: ${pages} pages in ${outDir}\n`);
}
