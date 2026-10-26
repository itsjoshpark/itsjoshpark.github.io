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

`main` always has exactly one commit, with the message `feat!: website`. There are no branches or pull requests. When asked to commit, commit on `main`, fold the change into that one commit, and force-push.

Other sessions push to `main` too, and each push replaces the one commit, so your local `main` and `origin/main` are unrelated commits whenever either side has pushed. `git pull` can't reconcile them. Sync before you start, and again right before you push:

```sh
git fetch origin
git stash                      # only if you have uncommitted work
git reset --hard origin/main
git stash pop                  # only if you stashed
```

Then commit and push, pinning the lease to the `origin/main` you just synced to. If anyone pushes in the meantime, the push fails instead of overwriting their work. A bare `--force-with-lease` after a fetch doesn't protect you, because the fetch moves the lease. If the push fails, sync again and retry.

```sh
vp lint && vp fmt --check && vp run build
git add <files>
git commit --amend -m "feat!: website"
git push --force-with-lease=main:$(git rev-parse origin/main) origin main
```

Run the last line straight after the sync. Don't fetch in between, or the lease moves again.

If the history ever has more than one commit, squash it back to one:

```sh
git reset --soft $(git rev-list --max-parents=0 HEAD) && git commit --amend -m "feat!: website"
```

After every push to `main`, wait for the deploy, then delete every GitHub Actions run except the newest of each workflow, and every deployment except the live one. Waiting first means the new deploy run and deployment are the ones kept, and a failed deploy is reported before anything is deleted. Do it in separate steps, and delete by explicit ID, never with a list computed while the delete runs, so you can see exactly what goes.

1. Find the deploy run for the commit you pushed (its `headSha` must match), and wait for it:

   ```sh
   gh run list -R itsjoshpark/itsjoshpark.github.io -w deploy.yml -L 1 --json databaseId,headSha
   gh run watch --exit-status <deploy run id> -R itsjoshpark/itsjoshpark.github.io
   ```

2. List the runs that aren't the newest of their workflow:

   ```sh
   gh run list -R itsjoshpark/itsjoshpark.github.io -L 1000 --json databaseId,workflowName,headSha,createdAt \
     --jq 'group_by(.workflowName)[] | sort_by(.createdAt) | reverse | .[1:][] | "\(.databaseId) \(.workflowName) \(.headSha[:7])"'
   ```

3. Delete each listed run by its ID:

   ```sh
   gh run delete <id> -R itsjoshpark/itsjoshpark.github.io
   ```

4. List the deployments. Keep the newest one, which is the deploy you just waited for, with the `sha` of the commit you pushed:

   ```sh
   gh api "repos/itsjoshpark/itsjoshpark.github.io/deployments?per_page=100" --jq '.[] | "\(.id) \(.environment) \(.sha[:7]) \(.created_at)"'
   ```

5. Delete every other deployment by its ID. GitHub only deletes inactive deployments. If a delete fails with HTTP 422, mark that deployment inactive first, then delete it again:

   ```sh
   gh api -X DELETE repos/itsjoshpark/itsjoshpark.github.io/deployments/<id>
   gh api -X POST repos/itsjoshpark/itsjoshpark.github.io/deployments/<id>/statuses -f state=inactive   # only after a 422
   ```

## CI

`.github/workflows/ci.yml` runs lint, format check, and build (which includes the type check and the URL check) on every push to `main`. It runs after the push, so it can't block a change: run `vp lint`, `vp fmt --check`, and `vp run build` locally before every push, and push only when all three pass.

`.github/workflows/deploy.yml` builds with `vp run build` and deploys `dist/` to GitHub Pages on push to `main`, including a force-push. Both workflows set up Vite+ with `voidzero-dev/setup-vp`.
