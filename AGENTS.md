# AGENTS.md

Astro 4 + Tailwind personal site, written in TypeScript, built with npm, deployed to GitHub Pages at [joshuapark.dev](https://joshuapark.dev). Node version is pinned in `.node-version`.

## Commands

| Command                | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Start the dev server                             |
| `npm run build`        | Type check (`astro check`) then build to `dist/` |
| `npm run preview`      | Serve the production build locally               |
| `npm run check`        | Lint with Biome — **read-only**                  |
| `npm run check:fix`    | Lint and apply fixes, including unsafe ones      |
| `npm run format:check` | Verify formatting with Prettier — **read-only**  |
| `npm run format`       | Format with Prettier, writing changes            |

`check`, `format:check`, and `build` are exactly what CI runs. Run them before pushing.

## Code style

- **Prettier formats everything**, including `.astro` files. It is the only formatter — Biome's formatter is explicitly disabled in `biome.json` so the two can't disagree.
- **Biome lints and organizes imports.** Recommended rules only.
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

`.github/workflows/ci.yml` runs lint, format check, type check, and build on every pull request against `main`. All of it must pass before merge.

`.github/workflows/astro.yml` type-checks and deploys to GitHub Pages on push to `main`.
