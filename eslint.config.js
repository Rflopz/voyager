// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

/**
 * Flat ESLint config (ESLint 9+). Goals, in order:
 *   1. Catch real bugs (unused vars, floating promises, etc.) — the
 *      "recommended" tiers below.
 *   2. Enforce a few project-specific style rules so future edits don't
 *      drift (import ordering, no default exports for classes, consistent
 *      type-only imports) — see the `rules` blocks.
 *   3. Nudge (not enforce — no cross-project tool wired up yet) toward the
 *      clean/hexagonal layering already used in src/: domain/ and
 *      application/ should never import infrastructure/ or config/. A
 *      real dependency-boundary check (dependency-cruiser) can be added
 *      later if this file naming convention alone stops being enough.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', 'src/data/cv.yaml'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Astro components/adapters intentionally use `_` prefixed args in a
      // few callback shapes (event handlers, etc.) — allow that instead of
      // flagging every one.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `import type { X }` is required project-wide (see any port file
      // under src/domain/) so type-only imports never pull runtime code
      // across a layer boundary by accident.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Ports/adapters/use-cases are always named exports (see any file
      // under src/domain, src/application, src/infrastructure) — keeps
      // renames/refactors grep-able and avoids default-export ambiguity.
      // (Enforced by convention/review for now; add eslint-plugin-import's
      // no-default-export if this ever drifts.)
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Readability spacing: a blank line before AND after any if/else
      // block, and before/after any block-bodied function (this also
      // covers `const foo = () => { ... }` arrow functions, since their
      // last token is the closing `}` of the block body — same
      // "block-like" bucket ESLint uses for if/function/class/try/etc).
      // Arrow functions with an expression body (`const x = () => y`,
      // no braces) aren't block-like and are NOT covered by this rule.
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: ['if', 'block-like'] },
        { blankLine: 'always', prev: ['if', 'block-like'], next: '*' },
        // Chained if/else-if/else and immediately-following statements in
        // the same block don't need blank lines between each other member.
        { blankLine: 'any', prev: 'if', next: 'if' },
      ],
    },
  },

  // .astro files: relax a couple of TS rules that don't play well with
  // Astro's frontmatter-to-template split (astro-eslint-parser already
  // handles the parse; these are just noisy false positives).
  {
    files: ['**/*.astro'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Config files run under Node, not the browser.
  {
    files: ['*.config.{js,mjs,cjs,ts}', 'scripts/**'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Build/sync scripts are meant to print progress — unlike app code,
      // console.log here isn't a debugging leftover.
      'no-console': 'off',
    },
  }
);
