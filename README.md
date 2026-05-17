# mini-guard

Ultra-lightweight, zero-dependency, frontend-focused RBAC (Role-Based Access Control) utility. Safely decodes JWTs in the browser and matches the user's roles against a centralized feature-to-role configuration map.

[![bundle size](https://img.shields.io/badge/gzipped-~1042B-brightgreen)](https://bundlephobia.com/package/mini-guard)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![github](https://img.shields.io/badge/github-mini--guard-181717?logo=github)](https://github.com/trung-t-nguyen/mini-guard)

## Features

- **Zero dependencies** — uses browser-native `atob()`, no external packages
- **ESM-only** — tree-shakeable, works with Vite, Next.js, Webpack 5
- **Multi-module support** — group permissions by app module or micro-frontend
- **Multi-environment support** — normalize env-prefixed roles (`dev_admin` → `admin`) via templates
- **JWT expiry guard** — expired tokens are automatically treated as unauthorized
- **Nested claim paths** — extract roles from deep JWT structures via dot-notation
- **TypeScript-first** — ships with full type declarations
- **React adapter** — `useMiniGuard` hook + `MiniGuardProvider` context (`mini-guard/react`)
- **Angular adapter** — `MiniGuardService` + `*miniGuard` structural directive (`mini-guard/angular`)

---

## Installation

```bash
npm install mini-guard
```

---

## Framework Adapters

| Import | Framework | What you get |
|---|---|---|
| `mini-guard` | Any | `MiniGuard` core class |
| `mini-guard/react` | React ≥ 17 | `useMiniGuard` hook, `MiniGuardProvider` |
| `mini-guard/angular` | Angular ≥ 15 | `MiniGuardService`, `MiniGuardDirective` |

Adapters are separate subpath exports — importing `mini-guard/react` does **not** add Angular to your bundle, and vice versa. The core `mini-guard` entry remains framework-free and under 1 KB.

---

## Quick Start

```typescript
import { MiniGuard } from 'mini-guard';

const featureMap = {
  dashboard: {
    'view:reports': ['admin', 'analyst'],
    'edit:reports': ['admin'],
  },
  settings: {
    'manage:users': ['admin'],
  },
};

const guard = new MiniGuard(featureMap, 'dashboard');

// Call once after login
guard.init(rawJwtToken);

// Check access anywhere in your UI
guard.canAccess('view:reports');              // true/false — uses default module
guard.canAccess('view:reports', 'dashboard'); // explicit module
guard.canAccess('manage:users', 'settings'); // cross-module check

// Call on logout
guard.clear();
```

---

## API

### `new MiniGuard(featureMap, optionsOrModule?)`

Creates a guard instance.

| Parameter | Type | Description |
|---|---|---|
| `featureMap` | `FeatureMap` | Map of `module → feature → allowed roles` |
| `optionsOrModule` | `string \| MiniGuardOptions` | Default module name (shorthand) or full options object |

### `guard.init(token: string): GuardContext`

Parses and stores a raw JWT string. Roles are extracted and optionally normalized. Call this after login or token refresh. Returns `{ roles: string[], payload: JwtPayload | null }`, or `{ roles: [], payload: null }` if the token is invalid or expired.

### `guard.canAccess(feature: string, module?: string): boolean`

Returns `true` if the current user has a role that is allowed to access `feature` in `module`. Falls back to `defaultModule` if `module` is omitted. Returns `false` if the token is absent, expired, or the user has no matching role.

### `guard.getRoles(): string[]`

Returns a copy of the normalized role list stored from the last `init()` call. Returns `[]` if no token has been initialized.

### `guard.getTokenPayload(): JwtPayload | null`

Returns a copy of the decoded JWT payload from the last `init()` call. Returns `null` if no token has been initialized or if the token was expired.

### `guard.clear(): void`

Wipes the stored token and roles. Call this on logout.

---

## Options

```typescript
interface MiniGuardOptions {
  defaultModule?: string;
  rolesClaim?: string;
  roleTemplate?: string;
  roleTransform?: (role: string) => string;
  strategy?: 'any' | 'all';
  debug?: boolean;
}
```

| Option | Default | Description |
|---|---|---|
| `defaultModule` | — | Module key used when `canAccess()` is called without an explicit module |
| `rolesClaim` | `'roles'` | Dot-notation path to the roles field in the JWT payload (RFC 7519 claim) |
| `roleTemplate` | — | Role naming convention template — see [Multi-environment support](#multi-environment-support) |
| `roleTransform` | — | Custom role normalizer function — overrides `roleTemplate` when both are set |
| `strategy` | `'any'` | `'any'`: grant access if **at least one** user role is in the allowed list. `'all'`: grant only if **every** user role is in the allowed list |
| `debug` | `false` | Emit `console.debug` logs for each key decision (`init`, `canAccess`, `clear`) |

### Debug logging

Enable per-instance with the `debug` option:

```typescript
const guard = new MiniGuard(featureMap, {
  defaultModule: 'dashboard',
  debug: import.meta.env.DEV, // Vite: enabled in dev, stripped in prod
});
```

Each operation logs to `console.debug` with a `[MiniGuard]` prefix:

```
[MiniGuard] init: roles = [ 'admin', 'analyst' ]
[MiniGuard] canAccess(edit:reports, dashboard): false
[MiniGuard] clear
```

In Node / test environments you can also set the `MINI_GUARD_DEBUG` environment variable to activate logging across all instances without changing any constructor call:

```bash
MINI_GUARD_DEBUG=1 npx vitest run
```

---

## Feature Map Structure

```typescript
const featureMap = {
  // top-level keys are module identifiers
  dashboard: {
    'view:reports':   ['admin', 'analyst'],
    'edit:reports':   ['admin'],
    'delete:reports': ['superadmin'],
  },
  settings: {
    'manage:users':  ['admin'],
    'view:settings': ['admin', 'analyst', 'user'],
  },
};
```

Feature names can be any string. A common convention is `action:resource` (e.g. `edit:reports`, `manage:users`).

---

## Multi-environment Support

In many deployments, backends prefix or suffix role names with the environment (e.g. `dev_admin`, `app1_stg_analyst`). Use `roleTemplate` to define your naming convention — mini-guard extracts only the canonical role name for matching.

### Using `roleTemplate`

Define placeholders with `{name}`. Place `{role}` where the canonical role sits; all other `{placeholders}` match any segment.

```typescript
// JWT roles: ["dev_admin", "dev_analyst"]
const guard = new MiniGuard(featureMap, {
  defaultModule: 'dashboard',
  roleTemplate: '{env}_{role}',
});
guard.init(token);
guard.canAccess('view:reports'); // true — "dev_analyst" → "analyst"
```

```typescript
// JWT roles: ["app1_prod_admin"]
const guard = new MiniGuard(featureMap, {
  defaultModule: 'dashboard',
  roleTemplate: '{appid}_{env}_{role}',
});
```

```typescript
// JWT roles: ["admin_prod"]
const guard = new MiniGuard(featureMap, {
  defaultModule: 'dashboard',
  roleTemplate: '{role}_{env}',
});
```

Roles that do not match the template are passed through unchanged — safe for mixed environments or canonical roles stored alongside prefixed ones.

### Using `roleTransform` (escape hatch)

For custom logic not expressible as a template:

```typescript
const guard = new MiniGuard(featureMap, {
  defaultModule: 'dashboard',
  roleTransform: (role) => role.replace(/^(dev|stg|prod)_/, ''),
});
```

`roleTransform` takes precedence over `roleTemplate` when both are provided.

---

## Nested JWT Claims

Use dot-notation in `rolesClaim` to extract roles from deeply nested JWT payloads:

```typescript
// JWT payload: { "user": { "auth": { "roles": ["admin"] } } }
const guard = new MiniGuard(featureMap, {
  defaultModule: 'dashboard',
  rolesClaim: 'user.auth.roles',
});
```

Keycloak example:
```typescript
const guard = new MiniGuard(featureMap, {
  defaultModule: 'dashboard',
  rolesClaim: 'realm_access.roles',
});
```

---

## JWT Decoding

mini-guard decodes the JWT payload client-side using the browser's built-in `atob()`. **No signature verification is performed** — this is intentional. The server is responsible for issuing and validating tokens; mini-guard only reads claims to make UI decisions.

Token expiry (`exp` claim) is checked automatically. An expired token is treated the same as no token.

---

## React

Install peer dependency:

```bash
npm install react
```

### `useMiniGuard(featureMap?, options?)`

A hook that manages a `MiniGuard` instance and triggers re-renders after `init` and `clear`.

Returns `{ init, clear, canAccess, getRoles, getTokenPayload, instance }`:

| Return | Description |
|---|---|
| `init(token)` | Decode a JWT and cache roles; triggers re-render; returns `GuardContext` |
| `clear()` | Wipe roles; triggers re-render |
| `canAccess(feature, module?)` | Check access; stable reference, re-evaluated after each `init`/`clear` |
| `getRoles()` | Get a copy of the current cached roles array |
| `getTokenPayload()` | Get a copy of the current JWT payload or `null` |
| `instance` | The underlying `MiniGuard` — escape hatch for direct access |

Must be called with either `featureMap` or inside a `MiniGuardProvider` — throws if neither is provided.

```tsx
import { useMiniGuard } from 'mini-guard/react';

const featureMap = {
  dashboard: { 'view:reports': ['admin', 'analyst'], 'export': ['admin'] },
};

function App() {
  const { init, clear, canAccess } = useMiniGuard(featureMap, { defaultModule: 'dashboard' });

  useEffect(() => { init(rawJwtToken); }, []);

  return (
    <>
      {canAccess('view:reports') && <ReportsPanel />}
      {canAccess('export') && <ExportButton />}
      <button onClick={clear}>Logout</button>
    </>
  );
}
```

### `Guard`

A declarative alternative to `canAccess` — renders `children` when access is granted, `fallback` otherwise. Must be inside a `MiniGuardProvider`.

```tsx
import { Guard } from 'mini-guard/react';

<Guard feature="export" module="dashboard" fallback={<span>No access</span>}>
  <ExportButton />
</Guard>
```

| Prop | Type | Description |
|---|---|---|
| `feature` | `string` (required) | Feature key to check |
| `module` | `string` | Module override — uses `defaultModule` if omitted |
| `fallback` | `ReactNode` | Rendered when access is denied (default: `null`) |

### `MiniGuardProvider` + `useMiniGuard()` (shared instance)

For app-wide sharing, create one `MiniGuard` instance and pass it through context. Calls to `init`/`clear` from any `useMiniGuard()` inside the provider automatically re-render all sibling `Guard` components.

```tsx
import { MiniGuard } from 'mini-guard';
import { MiniGuardProvider, useMiniGuard, Guard } from 'mini-guard/react';

const guard = new MiniGuard(featureMap, { defaultModule: 'dashboard' });

// App root
function Root() {
  return (
    <MiniGuardProvider guard={guard}>
      <LoginButton />
      <Guard feature="export" module="dashboard">
        <ExportButton />
      </Guard>
    </MiniGuardProvider>
  );
}

// init() here propagates to every Guard in the same provider
function LoginButton() {
  const { init } = useMiniGuard();
  return <button onClick={() => init(rawJwtToken)}>Login</button>;
}
```

---

## Angular

Install peer dependency:

```bash
npm install @angular/core
```

### `MiniGuardService`

An `Injectable` service (provided in root) for managing the guard lifecycle.

```typescript
import { MiniGuardService } from 'mini-guard/angular';

@Component({ ... })
export class AppComponent {
  constructor(private miniGuard: MiniGuardService) {
    // one-call form — configure and load token together
    miniGuard.configure(featureMap, { defaultModule: 'dashboard' }, rawJwtToken);
  }

  logout() {
    this.miniGuard.clear();
  }
}
```

To swap the feature map mid-session (e.g. after a role change), call `configure()` again with the new token — the previous session is replaced atomically:

```typescript
miniGuard.configure(newFeatureMap, { defaultModule: 'dashboard' }, freshJwtToken);
```

| Method | Description |
|---|---|
| `configure(featureMap, options?, token?)` | Creates (or replaces) the underlying `MiniGuard` instance; pass `token` to initialise in one call; returns `GuardContext \| undefined` |
| `init(token)` | Decodes the JWT and caches roles; returns `GuardContext \| undefined` |
| `clear()` | Wipes roles — call on logout |
| `canAccess(feature, module?)` | Returns `true` if the current user can access the feature |
| `getRoles()` | Returns a copy of the current cached roles array |
| `getTokenPayload()` | Returns a copy of the current JWT payload or `null` |

### `MiniGuardDirective` (`*miniGuard`)

A standalone structural directive that renders its host element only when access is granted.

```typescript
import { MiniGuardDirective } from 'mini-guard/angular';

@Component({
  standalone: true,
  imports: [MiniGuardDirective],
  template: `
    <button *miniGuard="'export'">Export</button>
    <a *miniGuard="'edit'; module: 'settings'" routerLink="/settings">Settings</a>
  `,
})
export class DashboardComponent {}
```

| Input | Type | Description |
|---|---|---|
| `miniGuard` | `string` (required) | Feature key to check |
| `miniGuardModule` | `string` | Module override — uses `defaultModule` if omitted |

---

## TypeScript

All types are exported from the core entry:

```typescript
import type { FeatureMap, FeatureRoles, MiniGuardOptions, JwtPayload, GuardContext } from 'mini-guard';
```

| Type | Description |
|---|---|
| `FeatureMap` | `Record<string, FeatureRoles>` — map of module names to feature permissions |
| `FeatureRoles` | `Record<string, string[]>` — map of feature names to allowed role arrays |
| `MiniGuardOptions` | Configuration options for `MiniGuard` constructor |
| `JwtPayload` | Decoded JWT payload with optional `exp` claim; any other claims are available as `[key: string]` |
| `GuardContext` | Return type of `init()` — `{ roles: string[], payload: JwtPayload \| null }` |

---

## License

MIT — see [LICENSE](./LICENSE)
