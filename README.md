# Physics with Harshith

Touch-first interactive physics activities for the smartboard — built for Class 11 (JEE level) students at Nine Education.

**Live chapters**

| Chapter | Route | Activities |
|---|---|---|
| Units & Dimensions | `/units-and-dimensions` | 18 (sorts, dimension builder, equation checker, vernier & screw gauge labs…) |
| Kinematics | `/kinematics` | Projectile Playground live; more coming |

## Stack

- [Astro](https://astro.build) — static site, zero JS by default
- [p5.js](https://p5js.org) — motion simulations
- [KaTeX](https://katex.org) — equation rendering
- Deployed on Vercel

## Structure

```
src/
├─ layouts/StudioLayout.astro   shared shell: topbar, fonts, fullscreen, footer
├─ styles/global.css            brand tokens + tile grid + screen router styles
├─ data/chapters.ts             drives the landing-page chapter grid
├─ snippets/                    raw HTML screen blocks (ported studios)
├─ scripts/                     bundled chapter scripts (p5 + KaTeX)
└─ pages/
   ├─ index.astro               landing — pick a chapter
   ├─ units-and-dimensions/
   └─ kinematics/
public/
├─ js/studio-core.js            go() screen router + fullscreen (shared, classic script)
├─ js/ud-studio.js              Units & Dimensions activities
├─ sims/                        standalone iframe simulations
└─ brand/                       Nine Education logos
```

## Develop

```sh
npm install
npm run dev      # localhost:4321
npm run build    # static output in dist/
```

## Adding a chapter

1. Add an entry to `src/data/chapters.ts`
2. Create `src/pages/<slug>/index.astro` using `StudioLayout` — home screen with `.tile` grid + one `.screen` section per activity
3. Register per-screen init hooks on `window.SCREEN_INIT` from the chapter script

---
Made with love ❤️ by Harshith · Nine Education
