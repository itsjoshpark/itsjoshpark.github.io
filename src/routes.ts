// Every address the site answers. The screen shows sections and lists; a project, an app or the contact page is
// printed on paper over the list it belongs to. An app's support and privacy addresses print the app's page and
// scroll it to that part, so the links in App Store Connect keep working.
import { type App, apps, contact, profile, type Work, work } from "./content.ts";

export type Section = "about" | "work" | "personal";

export interface Route {
  path: string;
  section: Section;
  /** The page title; the document title is "<title> · Joshua Park", except on the home page. */
  title: string;
  /** The screen this one sits on (a list), or for a printed page the list it prints over. */
  parent: string | null;
  /** A printed page instead of a screen. */
  print: boolean;
  /** The printout this address shows: the support and privacy addresses share their app's printout. */
  doc: string;
  /** Where in the printout to scroll to. */
  anchor: "support" | "privacy" | null;
  description: string;
  app?: App;
  work?: Work;
}

/** The first screen of each section, where its key goes. */
export const ROOT: Record<Section, string> = { about: "/", work: "/work/", personal: "/personal/" };

const screen = (path: string, section: Section, title: string, description: string): Route => ({
  path,
  section,
  title,
  parent: null,
  print: false,
  doc: path,
  anchor: null,
  description,
});

const printed = (
  path: string,
  section: Section,
  title: string,
  description: string,
  extra: Partial<Route> = {},
): Route => ({
  path,
  section,
  title,
  parent: ROOT[section],
  print: true,
  doc: path,
  anchor: null,
  description,
  ...extra,
});

export const routes: Route[] = [
  screen("/", "about", profile.name, `${profile.role}. ${profile.intro}`),
  screen("/work/", "work", "Work", "Projects I have built."),
  screen("/personal/", "personal", "Personal", "Apps and utilities I have made."),
  printed("/contact/", "about", contact.title, contact.intro),
  ...work.map((p) => printed(`/work/${p.slug}/`, "work", p.name, p.desc, { work: p })),
  ...apps.flatMap((p) => [
    printed(p.path, "personal", p.name, p.desc, { app: p }),
    ...(p.support
      ? [
          printed(`${p.path}support/`, "personal", `${p.name} Support`, `Help with ${p.name}.`, {
            app: p,
            doc: p.path,
            anchor: "support",
          }),
          printed(`${p.path}privacy/`, "personal", `${p.name} Privacy Policy`, `How ${p.name} handles your data.`, {
            app: p,
            doc: p.path,
            anchor: "privacy",
          }),
        ]
      : []),
  ]),
];

/** Old app addresses from before the apps moved under /personal/, and where each one moved to. Old links and App
 * Store Connect still point at them, so the build writes a page at each one that sends the reader on. */
export const redirects: Record<string, string> = Object.fromEntries(
  ["peek-for-safari", "audio-balance"].flatMap((slug) =>
    ["", "support/", "privacy/"].map((part) => [`/${slug}/${part}`, `/personal/${slug}/${part}`]),
  ),
);

export const routeByPath: Record<string, Route> = Object.fromEntries(routes.map((r) => [r.path, r]));

/** "Peek for Safari · Joshua Park", or just the name on the home page. */
export const documentTitle = (r: Route) => (r.path === "/" ? profile.name : `${r.title} · ${profile.name}`);
