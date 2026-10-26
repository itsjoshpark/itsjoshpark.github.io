// Writes one HTML file per address into dist/, after `vp build`. GitHub Pages serves files only (an unknown path gets
// 404.html), so every address needs its own file. Each file has the page's title and description, and its full text
// in <main>: readers without scripts, search engines and link previews get the page, and the device draws the same
// content from content.ts.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type App, type Block, contact, EMAIL, jobs, parseLinks, profile, work } from "../src/content.ts";
import { documentTitle, redirects, type Route, routeByPath, routes } from "../src/routes.ts";

const SITE = "https://joshuapark.dev";
const dist = join(import.meta.dirname, "..", "dist");
const shell = readFileSync(join(dist, "index.html"), "utf8");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const code = (s: string) => esc(s).replace(/`([^`]*)`/g, "<code>$1</code>");
// running text: `code` becomes <code>, and [label](url) links and email addresses become links
function rich(s: string) {
  const { text, links } = parseLinks(s);
  let html = "",
    last = 0;
  for (const k of links) {
    html += code(text.slice(last, k.start)) + link(k.url, text.slice(k.start, k.end));
    last = k.end;
  }
  return html + code(text.slice(last));
}
const link = (url: string, label: string) => `<a href="${esc(url)}">${esc(label)}</a>`;

const nav = `<nav aria-label="Sections">${link("/", "About")}${link("/work/", "Work")}${link("/personal/", "Personal")}</nav>`;

function blocks(list: Block[]) {
  let html = "",
    inList = false;
  for (const [kind, text] of list) {
    if (kind === "li" && !inList) html += "<ul>";
    if (kind !== "li" && inList) html += "</ul>";
    inList = kind === "li";
    if (kind === "h") html += `<h3>${rich(text)}</h3>`;
    else if (kind === "p") html += `<p>${rich(text)}</p>`;
    else if (kind === "li") html += `<li>${rich(text)}</li>`;
    else html += `<pre><code>${esc(text)}</code></pre>`;
  }
  return html + (inList ? "</ul>" : "");
}

function appPage(p: App) {
  let html = `<h1>${esc(p.name)}</h1><p>${esc(p.uses)}</p><p>${esc(p.desc)}</p>`;
  html += `<ul>${p.links.map(([label, url]) => `<li>${link(url, label)}</li>`).join("")}</ul>`;
  if (p.features) html += `<h2>Features</h2><ul>${p.features.map((f) => `<li>${rich(f)}</li>`).join("")}</ul>`;
  if (p.req) html += `<h2>Requirements</h2><p>${esc(p.req)}</p>`;
  if (p.support) html += `<h2 id="support">Support</h2>${blocks(p.support)}`;
  if (p.privacy) html += `<h2 id="privacy">Privacy policy</h2>${blocks(p.privacy)}`;
  return html;
}

function body(r: Route) {
  // the support and privacy addresses show the whole app page, so they start with a link to their part
  if (r.app && r.anchor) {
    const part = r.anchor === "support" ? "Support" : "Privacy policy";
    return `<p>${link(`#${r.anchor}`, `Go to ${part}`)}</p>${appPage(r.app)}`;
  }
  if (r.app) return appPage(r.app);
  if (r.work) {
    const p = r.work;
    return `<h1>${esc(p.name)}</h1><p>${esc(p.uses)}</p><p>${esc(p.desc)}</p>${p.url ? `<p>${link(p.url, "Visit the site")}</p>` : ""}`;
  }
  switch (r.path) {
    case "/":
      return (
        `<h1>${esc(profile.name)}</h1><p>${esc(profile.role)}</p><p>${esc(profile.intro)}</p><p>${esc(profile.skills)}</p>` +
        `<h2>Experience</h2><ul>${jobs.map((j) => `<li>${esc(j.when)}: ${esc(j.role)}, ${esc(j.at)}</li>`).join("")}</ul>` +
        `<h2>Links</h2><ul><li>${link("/contact/", "Contact me")}</li>${profile.links.map((l) => `<li>${link(l.url, l.name)}</li>`).join("")}</ul>`
      );
    case "/work/":
      return `<h1>Work</h1><ul>${work.map((p) => `<li>${link(`/work/${p.slug}/`, p.name)}: ${esc(p.uses)}</li>`).join("")}</ul>`;
    case "/personal/":
      return `<h1>Personal</h1><p>Apps and utilities I have made.</p><ul>${routes
        .filter((x) => x.app && x.doc === x.path)
        .map((x) => `<li>${link(x.path, x.title)}: ${esc(x.app?.uses ?? "")}</li>`)
        .join("")}</ul>`;
    case "/contact/":
      return `<h1>${esc(contact.title)}</h1><p>${esc(contact.intro)}</p><p>${link(`mailto:${EMAIL}`, EMAIL)}</p>`;
  }
  throw new Error(`no text for ${r.path}`);
}

function page(path: string, title: string, description: string, main: string) {
  const head = [
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${SITE}${path}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${SITE}${path}" />`,
    `<meta property="og:type" content="website" />`,
  ].join("\n    ");
  const html = shell
    .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`)
    .replace("<!--head-->", () => head)
    .replace("<!--doc-->", () => nav + main);
  if (html === shell || html.includes("<!--doc-->"))
    throw new Error("dist/index.html has no <!--head--> or <!--doc--> mark");
  return html;
}

for (const r of routes) {
  const file = join(dist, r.path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(r.path, documentTitle(r), r.description, body(r)));
}
// GitHub Pages cannot send a real redirect, so each old address gets a page that goes on to the new one at once. Search
// engines read an instant refresh as a permanent move, and the canonical link names the new address.
function redirect(to: string) {
  const url = esc(to),
    abs = esc(SITE + to);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(documentTitle(routeByPath[to]))}</title>
    <link rel="canonical" href="${abs}" />
    <script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script>
    <meta http-equiv="refresh" content="0; url=${url}" />
  </head>
  <body>
    <p>This page moved to <a href="${url}">${abs}</a>.</p>
  </body>
</html>
`;
}
for (const [from, to] of Object.entries(redirects)) {
  if (!routeByPath[to]) throw new Error(`${from} redirects to ${to}, which is not an address`);
  const file = join(dist, from, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, redirect(to));
}
// GitHub Pages serves this for any unknown address; the device then shows the first screen
writeFileSync(
  join(dist, "404.html"),
  page(
    "/",
    `Page not found · ${profile.name}`,
    "This page does not exist.",
    `<h1>Page not found</h1><p>This page does not exist. ${link("/", "Go to the first page")}.</p>`,
  ).replace(/<link rel="canonical"[^>]*>\n\s*/, ""),
);
console.log(`prerender: wrote ${routes.length} pages, ${Object.keys(redirects).length} redirects and 404.html`);
