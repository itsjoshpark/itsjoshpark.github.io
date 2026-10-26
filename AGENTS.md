# AGENTS.md

Personal site, written in plain TypeScript and built with [Vite+](https://viteplus.dev) (`vp`), deployed to GitHub Pages at [joshuapark.dev](https://joshuapark.dev). Node version is pinned in `.node-version` (Vite+ needs Node 22.18 or later).

## How the site works

- One page, `index.html`. `src/main.ts` picks a device for the window and loads it: the desktop wall (`src/device/desktop.ts`) for a large window, the handheld (`src/device/phone.ts`) for a phone or a narrow window. Both run the same engine, `src/device/engine.ts`.
- All the words are in `src/content.ts`. Every address is in `src/routes.ts`.
- GitHub Pages serves files only, so after `vp build`, `scripts/prerender.ts` writes one `dist/<path>/index.html` per address, with the title, description and full text, plus `dist/404.html`. Then `scripts/check-urls.ts` checks that the addresses that must keep working are there.
- The device art is Blender renders in `src/device/assets/`. `src/device/desk-metas.json` says where each part is in each desktop render.

## Addresses that must keep working

- App Store Connect links to the overview, `privacy/` and `support/` page of each app: `/personal/peek-for-safari/`, `/personal/audio-balance/` and `/personal/front-row/`.
- The old addresses `/peek-for-safari/` and `/audio-balance/`, with their `privacy/` and `support/` pages, are still in old links. `redirects` in `src/routes.ts` lists them, and the build writes a page at each one that goes on to the new address.
- `/work/<slug>/`, `/personal/<slug>/`, `/work/`, `/personal/`, `/contact/`.
- `/aperture/` and `/coffee-ratio/` are separate GitHub Pages projects. Never build anything at those paths.

`vp run build` fails when one of these breaks.

## Commands

Use the Vite+ commands (`vp`). The package manager is pnpm, pinned in `package.json`; `vp install` uses it. The `package.json` scripts are the same commands for tools that expect them.

| Command          | What it does                                                       |
| ---------------- | ------------------------------------------------------------------ |
| `vp install`     | Install dependencies                                               |
| `vp dev`         | Start the dev server                                               |
| `vp run build`   | Type check, build to `dist/`, write a page per address, check URLs |
| `vp preview`     | Serve the production build locally                                 |
| `vp lint`        | Lint with Oxlint (type-aware) — **read-only**                      |
| `vp lint --fix`  | Lint and apply fixes                                               |
| `vp fmt --check` | Verify formatting with Oxfmt — **read-only**                       |
| `vp fmt`         | Format with Oxfmt, writing changes                                 |

`vp build` alone runs only Vite's build: use `vp run build` for the full build.

`vp lint`, `vp fmt --check`, and `vp run build` are exactly what CI runs. Run them before pushing.

## Code style

- **Oxfmt formats everything.** It is the only formatter. Settings are in the `fmt` block of `vite.config.ts`.
- **Oxlint lints**, with the recommended rules and type-aware rules. Settings are in the `lint` block of `vite.config.ts`.
- `tsconfig.json` has `strictNullChecks` and `noImplicitAny` off, because the device engine is ported from the prototypes with loose types. Write new code with full types.
- 2-space indent, LF line endings, final newline, no trailing whitespace — enforced by `.editorconfig`.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject
```

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Scope is optional; subject is imperative, lowercase, and has no trailing period
- Breaking changes take a `!` after the type/scope and/or a `BREAKING CHANGE:` footer

**Pull request titles must follow the same convention.** PRs are squash-merged, so the title becomes the commit message on `main`.

This convention is not enforced by a linter — it's on you to follow it.

## CI

`.github/workflows/ci.yml` runs lint, format check, and build (which includes the type check and the URL check) on every pull request against `main`. All of it must pass before merge.

`.github/workflows/deploy.yml` builds with `vp run build` and deploys `dist/` to GitHub Pages on push to `main`. Both workflows set up Vite+ with `voidzero-dev/setup-vp`.
