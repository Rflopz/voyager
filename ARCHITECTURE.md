# Voyager — Architecture Notes

Personal branding / CV landing page. Built with Astro, driven by the same
RenderCV YAML that generates the PDF resume.

## Layers (Clean / Hexagonal Architecture)

```
src/domain/            Pure types + port interfaces. No I/O, no framework.
  cv.ts                   CvData shape (mirrors what the site needs from RenderCV YAML)
  cv-repository.ts        CvRepository port — how content gets loaded
  background-animation.ts BackgroundAnimation port — how a bg animation mounts/cleans up
  animation-preference.ts AnimationPreferenceStore port — how the chosen animation persists

src/application/       Use cases. Depend only on domain/ ports.
  get-cv.ts               getCv(repository) — the one CV use case
  background-animation-controller.ts
                          BackgroundAnimationController — mounts/switches animations,
                          persists choice via an AnimationPreferenceStore, generic
                          over an AnimationCatalog shape (list/create/isValidName)

src/infrastructure/    Adapters implementing domain/ ports. Framework/IO-aware.
  content/
    yaml-cv-repository.ts   Reads src/data/cv.yaml (RenderCV format), implements CvRepository
  animations/
    starfield-animation.ts    Adapter: drifting starfield
    nebula-drift-animation.ts Adapter: soft moving color blobs
    registry.ts               name -> {label, factory} map; listAnimations()/createAnimation()/isAnimationName()
    local-storage-animation-preference-store.ts
                              localStorage adapter for AnimationPreferenceStore

src/config/             Composition root + feature switches. The ONLY files
                        that wire a concrete adapter into a use case/port.
  cv-source.ts            wires YamlCvRepository into getCv(); exports `cv`
  site.ts                 ACTIVE_BACKGROUND_ANIMATION default switch
  background-animation-client.ts
                          client-side composition root: wires the registry +
                          localStorage store into one BackgroundAnimationController
                          singleton, shared by AnimatedBackground and AnimationSwitcher

src/components/         Atomic design. Presentation only — no direct
                        infrastructure imports; pages pass data down as props.
  atoms/                  Badge, AnimatedBackground (starts the controller),
                          AnimationOptionButton (one clickable menu row)
  molecules/              AnimationSwitcher (hover-reveal menu, listed from the registry)
  organisms/              Hero, (future: Timeline, ProjectsGrid, SkillsGrid, ...)
  templates/              BaseLayout (mounts AnimatedBackground + AnimationSwitcher)

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
   `BackgroundAnimation` (see `domain/background-animation.ts` — `mount()`
   returns a `MountedAnimation` with `pause()`/`resume()`/`unmount()`).
2. Add one entry to `src/infrastructure/animations/registry.ts` (name, label, factory).
3. (Optional) Change the default in `ACTIVE_BACKGROUND_ANIMATION`
   (`src/config/site.ts`) — not required for it to appear in the switcher,
   only to change what loads before any user choice/localStorage kicks in.

Nothing else changes — not the atom that renders the `<canvas>`, not the
switcher UI, not the layout, not any page. The top-right controls
(`components/molecules/AnimationSwitcher.astro`) are a rocket icon button
(hover reveals the animation list, generated from the registry) plus a
separate play/pause icon button that pauses/resumes the currently mounted
animation in place (freezes the canvas, doesn't tear it down). Choice
persists via `localStorage` (`LocalStorageAnimationPreferenceStore`) across
reloads; play/pause state is session-only (resets to playing on reload).

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
