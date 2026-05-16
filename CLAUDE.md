# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build:check   # TypeScript type check (no emit)
npm test              # run all tests
npm run test:watch    # run tests in watch mode
npm run build         # compile to dist/ via tsup
npm run size:gz       # build + print gzipped bundle size (must stay < 1024 bytes)
npm run test:coverage # test coverage report
```

Run a single test file:
```bash
npx vitest run tests/jwt.test.ts
```

## Local demo development (demo/mini-react)

One-time setup — run from mini-guard root:
```bash
npm run link:setup   # build + npm link (registers package globally)
```

Then two terminals:

```bash
# Terminal 1 — mini-guard root: rebuild on every save
npm run dev

# Terminal 2 — demo/mini-react: link local build + start Next.js
npm run dev:local
```

`npm run dev:local` symlinks the local mini-guard build into mini-react's `node_modules` via `npm link`. After the first run, subsequent `npm run dev` in mini-react will keep using the symlink — no reinstall needed. Every save to `src/` triggers a tsup rebuild; Next.js picks it up on the next page reload.

## Architecture

### Source layout

```
src/
  types.ts       — all exported TypeScript types (FeatureMap, MiniGuardOptions, JwtPayload)
  jwt.ts         — decodeJwt() and isExpired(); pure functions, no state
  mini-guard.ts  — MiniGuard class; imports from jwt.ts and types.ts
  index.ts       — barrel: re-exports MiniGuard + all public types
```

### Key design constraints

- **Zero runtime dependencies** — `atob()` only; no `Buffer`, no Node built-ins.
- **ESM-only** (`"type": "module"`). All internal imports must use explicit `.js` extensions (NodeNext resolution requires this even in `.ts` source files).
- **Bundle size gate** — `npm run size:gz` must print ≤ 1024. The current footprint is ~689 bytes gzipped.

### How MiniGuard works

1. `new MiniGuard(featureMap, optionsOrModule?)` — stores the feature map and compiles any `roleTemplate` string into a regex extractor once at construction time (`buildRoleExtractor`).
2. `guard.init(token)` — decodes the JWT payload via `decodeJwt`, rejects expired tokens via `isExpired`, walks `rolesClaim` (dot-notation) to extract raw roles, then applies `_roleNormalize` (compiled from `roleTemplate` or `roleTransform`) before caching the normalized role list.
3. `guard.canAccess(feature, module?)` — resolves module → feature → allowed roles from the feature map, then checks if any cached role is in the allowed list.

### Role normalization priority

`roleTransform` (custom fn) → `roleTemplate` (compiled to fn at construction) → no-op (roles used as-is).

`buildRoleExtractor(template)` converts `'{appid}_{env}_{role}'` into a regex: infers separator from chars between `{...}` groups, turns `{role}` into a capture group, and turns all other `{x}` into wildcard segments. Roles that don't match the pattern are returned unchanged (safe fallback).

### Build tooling

- **tsup** (wraps esbuild) — produces a single minified ESM file + `.d.ts` declarations in `dist/`.
- **vitest** with `environment: 'jsdom'` — provides `atob`/`btoa` globals that match the browser target.
- Tests use a `makeJwt()` helper in `tests/helpers.ts` to create unsigned fake JWTs; these are for unit testing only, not cryptographic validation.
