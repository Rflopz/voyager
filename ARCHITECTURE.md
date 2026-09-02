# Voyager — Architecture Notes

Personal branding / CV landing page. Built with Astro, driven by the same
RenderCV YAML that generates the PDF resume.

## Layers (Clean / Hexagonal Architecture)

```
src/domain/            Pure types + port interfaces. No I/O, no framework.
  cv.ts                   CvData shape (mirrors what the site needs from RenderCV YAML)
  cv-repository.ts        CvRepository port — how content gets loaded
  background-animation.ts BackgroundAnimation port — how a bg animation mounts/cleans up

src/application/       Use cases. Depend only on domain/ ports.
  get-cv.ts               getCv(repository) — the one use case so far

src/infrastructure/    Adapters implementing domain/ ports. Framework/IO-aware.
  content/
    yaml-cv-repository.ts   Reads src/data/cv.yaml (RenderCV format), implements CvRepository
  animations/
    starfield-animation.ts    Adapter: drifting starfield
    nebula-drift-animation.ts Adapter: soft moving color blobs
    registry.ts               name -> adapter factory map
    mount-background-animation.ts  client bootstrap: registry + config -> mount()

src/config/             Composition root + feature switches. The ONLY files
                        that wire a concrete adapter into a use case/port.
  cv-source.ts            wires YamlCvRepository into getCv(); exports `cv`
  site.ts                 ACTIVE_BACKGROUND_ANIMATION switch

src/components/         Atomic design. Presentation only — no direct
                        infrastructure imports; pages pass data down as props.
  atoms/                  Badge, AnimatedBackground (mounts the configured animation)
  molecules/              (reserved for future small compositions, e.g. timeline row)
  organisms/              Hero, (future: Timeline, ProjectsGrid, SkillsGrid, ...)
  templates/              BaseLayout

src/pages/              Astro routes. Import `cv` from config/cv-source.ts,
                        pass plain data into organisms — never touch
                        infrastructure/ directly.
```

## The dependency rule

`pages/` → `components/` (presentation, dumb props)
`config/` → `application/` → `domain/`
`infrastructure/` → implements `domain/` ports, never the reverse
`components/` never imports from `infrastructure/` directly — only receives
data already resolved by `config/` (composition root) via page props.

## Swapping the background animation

1. Add `src/infrastructure/animations/<name>-animation.ts` implementing
   `BackgroundAnimation` (see `domain/background-animation.ts`).
2. Add one line to `src/infrastructure/animations/registry.ts`.
3. Change `ACTIVE_BACKGROUND_ANIMATION` in `src/config/site.ts`.

Nothing else changes — not the atom that renders the `<canvas>`, not the
layout, not any page.

Currently registered: `starfield` (default), `nebula-drift` (alternative,
still under evaluation).

## Swapping the CV content source

1. Add `src/infrastructure/content/<name>-cv-repository.ts` implementing
   `CvRepository` (see `domain/cv-repository.ts`).
2. Change the adapter constructed in `src/config/cv-source.ts`.

`application/get-cv.ts` and every component consuming `cv` are unaffected.

## CV data sync

`scripts/sync-cv.mjs` copies
`~/Dev/Rflopz/Docs/rendercv/Rafael_Lopez_Castillo_CV.yaml` into
`src/data/cv.yaml` before every `dev`/`build` (via pnpm pre-scripts, enabled
in `.npmrc`). `src/data/cv.yaml` is gitignored — it's a generated copy, not
source of truth. The RenderCV YAML remains canonical.
