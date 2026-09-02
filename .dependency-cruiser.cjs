/**
 * Enforces this project's Clean/Hexagonal layer boundaries (see AGENTS.md
 * "Code style" + the domain/application/infrastructure/config split under
 * src/). Run via `pnpm run arch:check` (also part of `pnpm run lint`).
 *
 * Layers, inner to outer:
 *   domain/         pure types + ports (interfaces). No I/O, no framework.
 *   application/     use cases / controllers orchestrating domain/ only.
 *   infrastructure/  concrete adapters (localStorage, Three.js, YAML, i18n
 *                    dictionaries) implementing domain/ ports.
 *   config/          composition roots — the only files allowed to `new`
 *                    up a concrete adapter and hand it to an
 *                    application-layer class. May import any layer.
 *
 * NOTE: components/ (*.astro) is intentionally NOT covered here.
 * dependency-cruiser has no .astro parser (it only understands JS/TS via
 * acorn/tsc/swc), so .astro files are invisible to it — any rule with
 * `from: components/` would silently never match. The .astro import
 * discipline (go through config/ composition roots, only pull domain/
 * types directly) is enforced by code review; see AnimationSwitcher.astro
 * and StarsBackdrop.astro for the two documented, intentional exceptions
 * that read infrastructure/ directly.
 */
const SRC = 'src';

module.exports = {
  forbidden: [
    {
      name: 'domain-no-outward-imports',
      comment:
        'domain/ must not import application/, infrastructure/, or config/ — it is the innermost layer.',
      severity: 'error',
      from: { path: `^${SRC}/domain` },
      to: {
        path: [`^${SRC}/application`, `^${SRC}/infrastructure`, `^${SRC}/config`],
      },
    },
    {
      name: 'domain-no-node-modules',
      comment: 'domain/ must be framework-free — pure types and ports only, no third-party runtime deps.',
      severity: 'error',
      from: { path: `^${SRC}/domain` },
      to: { path: 'node_modules' },
    },
    {
      name: 'application-only-imports-domain',
      comment: 'application/ may only depend on domain/ (dependency inversion) — never a concrete adapter.',
      severity: 'error',
      from: { path: `^${SRC}/application` },
      to: { path: [`^${SRC}/infrastructure`, `^${SRC}/config`] },
    },
    {
      name: 'application-no-node-modules',
      comment: 'application/ orchestrates domain/ objects only — no direct framework/library dependency.',
      severity: 'error',
      from: { path: `^${SRC}/application` },
      to: { path: 'node_modules' },
    },
    {
      name: 'infrastructure-no-config',
      comment:
        'infrastructure/ adapters implement domain/ ports; they must not depend on config/ (composition roots) — that would invert the dependency direction.',
      severity: 'error',
      from: { path: `^${SRC}/infrastructure` },
      to: { path: `^${SRC}/config` },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.astro', '.js', '.mjs'],
    },
  },
};
