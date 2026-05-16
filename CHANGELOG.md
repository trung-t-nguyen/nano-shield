# Changelog

## [1.1.0] — 2026-05-16

### Added

- **React adapter** (`mini-guard/react`) — `MiniGuardProvider` context provider and `useMiniGuard` hook. The hook can consume a shared `MiniGuard` instance from context or create a local one; it triggers re-renders reactively after `init` and `clear`.
- **Angular adapter** (`mini-guard/angular`) — `MiniGuardService` injectable service for managing guard lifecycle (`configure`, `init`, `clear`, `canAccess`) and `MiniGuardDirective` structural directive (`*miniGuard`) for template-level access control.
- Subpath exports: `mini-guard/react` and `mini-guard/angular` are tree-shakeable and do not affect the core bundle size.
- Optional peer dependencies declared for `react >=17` and `@angular/core >=15`.

### Unchanged

- Core (`mini-guard`) is unmodified — zero runtime dependencies, bundle size remains ≤ 1 KB gzipped.

---

## [1.0.0] — initial release

- `MiniGuard` class with JWT decoding, role normalization (`roleTemplate` / `roleTransform`), dot-notation `rolesClaim`, multi-module feature maps, and `any` / `all` strategies.
