# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static Astro site of touch-first interactive lessons ("studios") for a classroom smartboard — Class 11 / JEE physics (Harshith) and chemistry (Ashish) at Nine Education. Everything is rendered at build time; interactivity is plain DOM code, p5.js sketches and KaTeX. Deployed on Vercel (project `harshith-physics-smartboard`).

## Commands

```sh
npm run dev       # localhost:4321
npm run build     # static output to dist/
npm run preview   # serve the built dist/
```

There is no test suite, linter, or `astro check` setup (`@astrojs/check`/`typescript` are not installed) — `npm run build` is the only automated verification. Verify activities by opening the page and clicking through the screens; canvases and layout only behave correctly at smartboard width, so check wide viewports.

## Architecture

### Screen router

Every studio page is a single HTML document containing many `<section class="screen">` blocks; exactly one carries `.active`. `public/js/studio-core.js` is loaded as a classic `is:inline` script by the layout and defines the two globals every page depends on:

- `go(id)` — swaps `.active` to the target screen, scrolls to top, then calls `window.SCREEN_INIT[id]` if registered. Tiles and back buttons call it via inline `onclick="go('...')"`.
- `toggleFS()` — fullscreen toggle wired to the topbar button.

A chapter script registers its per-screen init hooks by assigning `window.SCREEN_INIT = { screenId: fn, ... }` (see `src/scripts/kinematics-studio.ts:265`, `src/scripts/periodic-classification.ts:170`, `public/js/ud-studio.js:1069`). **Lazy init matters**: inactive screens are `display:none`, so a p5 canvas created before its screen opens gets zero width. The established pattern is to construct the `p5` instance inside the hook on first open and call `windowResized()` on subsequent opens.

### Page composition

`src/layouts/StudioLayout.astro` is the only shell: topbar with logo + optional `chapterChip`, Google Fonts, a default `<slot />` for screens, a `slot="scripts"` for classic scripts, and the footer. It imports `src/styles/global.css`, which holds the brand tokens (`--nine-dark`, `--nine-accent`, …) and the shared `.tile` / `.screen` / `.scr-head` / `.hero` / `.grid` classes every page reuses. Chapter-specific CSS (`kinematics.css`, `chemistry.css`) is imported in the page frontmatter.

Two ways a page supplies its markup, both in use:

- Written inline in the `.astro` file (`src/pages/kinematics/index.astro`, the chemistry pages).
- Imported as raw HTML from `src/snippets/*.html` via `?raw` and injected with `<Fragment set:html={screens} />` — these are ported-from-standalone studios; keep editing them as plain HTML.

### Two script pipelines

- **Bundled TS** (`src/scripts/*.ts`), pulled in with a bare `<script>import '../../scripts/x'</script>` in the page. Astro bundles it as a module; `import p5 from 'p5'`, `import katex from 'katex'` and `import 'katex/dist/katex.min.css'` only work here. All new chapter code goes this way.
- **Classic scripts in `public/js/`** (`studio-core.js`, `ud-studio.js`), loaded with `<script is:inline src="/js/...">`. Unbundled, no imports, globals shared across files. Units & Dimensions predates the TS pipeline; leave it as-is unless porting it deliberately.

`src/scripts/kinematics-studio.ts` is the entry point for the whole Kinematics page — it imports the per-activity modules (`kinematics-gravity`, `-graphs`, `-relative`, `-plane`, `-revision`, `-practice`) and each exports a single `*ScreenInit()` that the registry maps to a screen id. `kinematics-revision`'s init takes a config object so `revision-drill.astro` can reuse it with different chips/labels.

### Data-driven pages

`src/data/` holds the content that drives generated markup, so these edits are data-only:

- `chapters.ts` — landing-page chapter grid.
- `resources.ts` — `/notes` and `/worksheets`; each entry points at PDFs under `public/downloads/<slug>/`.
- `pyq-units-dimensions.ts` — the JEE PYQ bank rendered by `src/pages/jee-pyqs/units-and-dimensions.astro` and driven by `src/scripts/pyq-viewer.ts` (answers stay hidden until "Check answer").
- `kinematics-practice.ts` — the 50-question practice drill.

`public/sims/*.html` are fully standalone simulations embedded via `<iframe>`; they share nothing with the studio core.

## Conventions

- Brand palette is duplicated in JS as a `C = { navy, dark, accent, ... }` object at the top of p5 scripts — keep it in sync with the CSS tokens in `global.css`.
- `title` / `titleAccent` in the data files split a heading so the second half renders in the accent colour; include any needed trailing space in `title`.
- Copy uses plain ASCII hyphens rather than em dashes, and the pages are pitched at students — short, concrete, exam-facing sentences.
- Non-null assertions (`document.getElementById('x')!`) are used freely in chapter scripts since the markup is co-located and static.

## Adding a chapter

1. Add an entry to `src/data/chapters.ts`.
2. Create `src/pages/<slug>/index.astro` using `StudioLayout`: a `#home` screen with the `.tile` grid, then one `<section class="screen">` per activity, tiles wired with `onclick="go('<screenId>')"`.
3. Create `src/scripts/<slug>-studio.ts`, register `window.SCREEN_INIT`, and import it from a `<script>` block on the page.
