## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Code style

Before considering a change done, run:

```
pnpm run lint
```

ESLint config is `eslint.config.js` (flat config, TS + Astro). `pnpm run lint:fix` auto-fixes what it can.

`pnpm run lint` also runs `arch:check` (dependency-cruiser, config in `.dependency-cruiser.cjs`), which enforces the domain → application → infrastructure/config layering: `domain/` can't import `application/`/`infrastructure/`/`config/` or any node_modules package, and `application/` can't import `infrastructure/`/`config/`. Run it alone with `pnpm run arch:check`. Note: dependency-cruiser has no `.astro` parser, so `components/` import discipline is still enforced by code review only.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
