// Checks the built site in dist/ for the addresses that must keep working. App Store Connect links to each app's
// overview, privacy and support pages, and old links point at the work and utility pages and at the old app addresses
// outside /personal/, so a change must never drop one. The list is written out here, not taken from routes.ts, so that a mistake there is caught. Run after the build.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "dist");

const apps: [string, string][] = [
  ["peek-for-safari", "Peek for Safari"],
  ["audio-balance", "Audio Balance"],
  ["front-row", "Front Row"],
];
const work = [
  "quickscores",
  "asset-management",
  "translation-approval",
  "analytics-platform",
  "nj-sharing-network",
  "briones-law-firm",
  "vision2home",
];
const personal = ["mochi-diffusion", "charge-limiter", "aperture", "coffee-ratio"];

// Each path must build to a page whose HTML contains the given text.
const required: [string, string][] = [
  ["/", "<title>Joshua Park</title>"],
  ["/work/", "<title>Work · Joshua Park</title>"],
  ["/personal/", "<title>Personal · Joshua Park</title>"],
  ["/contact/", "jpark@duck.com"],
  ...work.map((slug): [string, string] => [`/work/${slug}/`, "<h1>"]),
  ...apps.flatMap(([app, name]): [string, string][] => [
    [`/personal/${app}/`, `<title>${name} · Joshua Park</title>`],
    [`/personal/${app}/privacy/`, `<title>${name} Privacy Policy · Joshua Park</title>`],
    [`/personal/${app}/support/`, `<title>${name} Support · Joshua Park</title>`],
  ]),
  ...personal.map((slug): [string, string] => [`/personal/${slug}/`, "<h1>"]),
  // the old app addresses, from before the apps moved under /personal/, send the reader on to the new ones
  ...["peek-for-safari", "audio-balance"].flatMap((app) =>
    ["", "privacy/", "support/"].map((part): [string, string] => [
      `/${app}/${part}`,
      `<meta http-equiv="refresh" content="0; url=/personal/${app}/${part}" />`,
    ]),
  ),
];

// Separate GitHub Pages projects are served at these paths, so this site must not build anything there.
const reserved = ["/aperture/", "/coffee-ratio/"];

const page = (path: string) => join(dist, path, "index.html");
const problems: string[] = [];

for (const [path, text] of required) {
  if (!existsSync(page(path))) problems.push(`${path} is missing`);
  else if (!readFileSync(page(path), "utf8").includes(text)) problems.push(`${path} does not contain "${text}"`);
}
for (const path of reserved) {
  if (existsSync(join(dist, path))) problems.push(`${path} belongs to another project but was built here`);
}
if (!existsSync(join(dist, "404.html"))) problems.push("404.html is missing");

if (problems.length) {
  console.error(`URL check failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`URL check passed: ${required.length} pages present.`);
