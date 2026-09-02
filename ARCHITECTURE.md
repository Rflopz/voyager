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
  animation-settings.ts   ConfigurableAnimation port (optional capability, Interface
                          Segregation) — per-animation tunable numeric params (e.g. speed)
  animation-settings-store.ts
                          AnimationSettingsStore port — how tunable setting values persist

src/application/       Use cases. Depend only on domain/ ports.
  get-cv.ts               getCv(repository) — the one CV use case
  background-animation-controller.ts
                          BackgroundAnimationController — mounts/switches animations,
                          persists choice via an AnimationPreferenceStore, generic
                          over an AnimationCatalog shape (list/create/isValidName);
                          also exposes getSettingsSchema()/getSetting()/setSetting()
                          for the currently mounted animation when it implements
                          ConfigurableAnimation, persisting values via AnimationSettingsStore

src/infrastructure/    Adapters implementing domain/ ports. Framework/IO-aware.
  content/
    yaml-cv-repository.ts   Reads src/data/cv.yaml (RenderCV format), implements CvRepository
  animations/
    starfield-animation.ts    Adapter: drifting starfield
    nebula-drift-animation.ts Adapter: soft moving color blobs
    registry.ts               name -> {label, factory} map; listAnimations()/createAnimation()/isAnimationName()
    local-storage-animation-preference-store.ts
                              localStorage adapter for AnimationPreferenceStore
    local-storage-animation-settings-store.ts
                              localStorage adapter for AnimationSettingsStore, keyed by
                              (animation name, setting key) so different animations'
                              settings never collide

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
(`components/molecules/AnimationSwitcher.astro`) are a fixed-size (h-9 w-9)
rocket icon button that never resizes, with the animation list as an
absolutely-positioned dropdown anchored directly beneath it (zero gap,
same background/blur/border color, no border between them while open) so
it reads as one continuous shape rather than two separate boxes — the
dropdown's top-left corner rounds like its other three corners, but the
top-right segment (directly under the button) has no border/corner at
all, so the outline closes into a single unbroken L-shape instead of
looking like two stacked boxes — plus a separate matching-size play/pause
icon button beside it that stays in a
fixed position regardless of whether the menu is open. The list generated
from the registry grows open on hover (grid-template-rows 0fr->1fr) — since
the dropdown sits directly under the button with no gap, moving the
pointer from the button down into the list never exits the hoverable
region, so the panel stays open while hovering the list itself, no
click-to-pin needed, and pauses/resumes the currently mounted animation in
place (freezes the canvas, doesn't tear it down). Choice persists via
`localStorage` (`LocalStorageAnimationPreferenceStore`) across reloads;
play/pause state is session-only (resets to playing on reload).

Currently registered: `starfield` (default), `nebula-drift` (alternative,
still under evaluation).

## Adding a tunable setting to an animation (the "gear icon" capability)

Any animation can expose tunable numeric parameters (currently: Speed on
both `starfield` and `nebula-drift`) without changing any UI code:

1. In the adapter, `implements BackgroundAnimation, ConfigurableAnimation`
   (see `domain/animation-settings.ts`).
2. Implement `getSettingsSchema()` returning an `AnimationSettingParam[]`
   (key, label, min, max, step, defaultValue) — one entry per slider.
3. Implement `getSetting(key)` / `setSetting(key, value)` reading/writing
   whatever internal field(s) the animation's render loop already uses
   (e.g. `this.speed`).

That's it — `AnimationSwitcher.astro` only shows a gear icon next to the
row for whichever animation is CURRENTLY MOUNTED and reports a non-empty
schema (`isConfigurable()` type guard); clicking it reads the schema and
renders one `<input type="range">` per param entirely generically, with no
per-animation UI code anywhere. Values are persisted per
(animation name, setting key) via `AnimationSettingsStore` and restored
automatically the next time that animation is mounted.

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
