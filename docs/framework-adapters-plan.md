# Framework Adapters: mini-guard/react · mini-guard/angular

> **Status: shipped.** Vue was deferred — React and Angular adapters are live in v1.1.0.

## Context

mini-guard is a <1KB zero-dependency RBAC library. This adds React and Angular adapter bindings packaged as subpath exports in the same npm package — users import `mini-guard/react` or `mini-guard/angular` without touching the core bundle size.

---

## Packaging

Two new source entry points, each compiled to its own file in `dist/`. Framework packages are `peerDependencies` (optional) so they are never bundled into mini-guard itself. Core size gate (`dist/index.js` ≤ 1024B gzipped) is unaffected.

---

## Source Files

### `src/react.tsx`

```tsx
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { MiniGuard } from './index.js';
import type { FeatureMap, MiniGuardOptions } from './types.js';

interface MiniGuardCtxValue {
  guard: MiniGuard;
  rev: number;
  notify: () => void;
}

const MiniGuardCtx = createContext<MiniGuardCtxValue | null>(null);

export function MiniGuardProvider({ guard, children }: { guard: MiniGuard; children: ReactNode }) {
  const [rev, setRev] = useState(0);
  const notify = useCallback(() => setRev((r) => r + 1), []);
  const value = useMemo(() => ({ guard, rev, notify }), [guard, rev, notify]);
  return <MiniGuardCtx.Provider value={value}>{children}</MiniGuardCtx.Provider>;
}

export function useMiniGuard(featureMap?: FeatureMap, options?: MiniGuardOptions) {
  const ctx = useContext(MiniGuardCtx);
  const [instance] = useState(() => {
    if (!ctx && !featureMap)
      throw new Error('[MiniGuard] useMiniGuard: pass featureMap or wrap with MiniGuardProvider');
    return ctx?.guard ?? new MiniGuard(featureMap!, options);
  });
  const [rev, setRev] = useState(0);

  // Written on every render so callbacks always read the current notifier — no stale closure.
  const notifyRef = useRef<(() => void) | null>(null);
  notifyRef.current = ctx?.notify ?? null;

  const init = useCallback(
    (token: string) => {
      instance.init(token);
      setRev((r) => r + 1);
      notifyRef.current?.();
    },
    [instance],
  );

  const clear = useCallback(() => {
    instance.clear();
    setRev((r) => r + 1);
    notifyRef.current?.();
  }, [instance]);

  // rev is intentional: forces canAccess to re-evaluate after init/clear
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canAccess = useCallback(
    (feature: string, mod?: string) => instance.canAccess(feature, mod),
    [instance, rev],
  );

  return { init, clear, canAccess, instance };
}

export function Guard({
  feature, module, children, fallback = null,
}: {
  feature: string; module?: string; children: ReactNode; fallback?: ReactNode;
}) {
  const ctx = useContext(MiniGuardCtx);
  const show = ctx?.guard.canAccess(feature, module) ?? false;
  return <>{show ? children : fallback}</>;
}
```

**Exports:** `MiniGuardProvider`, `useMiniGuard`, `Guard`

Key design decisions:
- Context holds `{ guard, rev, notify }` — `rev` is bumped by `notify()` so sibling `Guard` components re-render when any `useMiniGuard` calls `init`/`clear`, even across component boundaries.
- `notifyRef` is written synchronously on every render (not in `useEffect`) so callbacks never close over a stale notifier if a provider is conditionally mounted.
- `init`/`clear` always call both `setRev` (local hook reactivity) and `notifyRef.current?.()` (provider reactivity). React 18 batches the two updates.
- `useMiniGuard()` with no args and no provider throws a descriptive error immediately.
- `useMiniGuard()` returns `instance` for escape-hatch access to the underlying `MiniGuard`.

### `src/angular.ts`

```ts
import { Directive, type DoCheck, Injectable, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { MiniGuard } from './index.js';
import type { FeatureMap, MiniGuardOptions } from './types.js';

@Injectable({ providedIn: 'root' })
export class MiniGuardService {
  private _guard: MiniGuard | null = null;

  configure(featureMap: FeatureMap, options?: MiniGuardOptions, token?: string): void {
    this._guard = new MiniGuard(featureMap, options);
    if (token) this._guard.init(token);
  }

  init(token: string): void {
    if (!this._guard) { console.warn('[MiniGuard] call configure() before init()'); return; }
    this._guard.init(token);
  }

  clear(): void {
    if (!this._guard) { console.warn('[MiniGuard] call configure() before clear()'); return; }
    this._guard.clear();
  }

  canAccess(feature: string, mod?: string): boolean {
    return this._guard?.canAccess(feature, mod) ?? false;
  }
}

@Directive({ selector: '[miniGuard]', standalone: true })
export class MiniGuardDirective implements DoCheck {
  @Input({ required: true }) miniGuard!: string;
  @Input() miniGuardModule?: string;

  private readonly svc = inject(MiniGuardService);
  private readonly tpl = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);

  ngDoCheck(): void {
    const hasAccess = this.svc.canAccess(this.miniGuard, this.miniGuardModule);
    if (hasAccess && this.vcr.length === 0) this.vcr.createEmbeddedView(this.tpl);
    else if (!hasAccess && this.vcr.length > 0) this.vcr.clear();
  }
}
```

**Exports:** `MiniGuardService`, `MiniGuardDirective`

Key design decisions:
- `inject()` instead of constructor injection — no `emitDecoratorMetadata` required, compatible with Angular 15+ standalone mode.
- Directive uses `ngDoCheck` (not `ngOnInit`) so it responds to token changes after initial render, including in zoneless apps with signals.
- `configure(featureMap, options?, token?)` accepts an optional token — callers can swap the feature map and restore the session in one call.
- `init()`/`clear()` emit `console.warn` (not throw) when called before `configure()`, to guide developers without crashing production.

---

## Modified Files

### `tsup.config.ts`

```ts
export default defineConfig({
  entry: { index: 'src/index.ts', react: 'src/react.tsx', angular: 'src/angular.ts' },
  external: ['react', '@angular/core', '@angular/common'],
  format: ['esm'],
  target: 'es2022',
  dts: true,
  sourcemap: false,
  clean: true,
  minify: true,
  treeshake: true,
  splitting: false,
  outDir: 'dist',
});
```

### `package.json`

```json
"exports": {
  ".":         { "import": "./dist/index.js",   "types": "./dist/index.d.ts" },
  "./react":   { "import": "./dist/react.js",   "types": "./dist/react.d.ts" },
  "./angular": { "import": "./dist/angular.js", "types": "./dist/angular.d.ts" }
},
"peerDependencies": {
  "react": ">=17",
  "@angular/core": ">=15"
},
"peerDependenciesMeta": {
  "react":         { "optional": true },
  "@angular/core": { "optional": true }
}
```

---

## Tests

| File | Coverage |
|------|----------|
| `tests/react.test.tsx` | `useMiniGuard` standalone and via provider; `Guard` component; sibling re-render after `init`/`clear`; `instance` stability; error on missing args |
| `tests/angular.test.ts` | `MiniGuardService` configure/init/canAccess/clear/re-configure; warn on unconfigured calls; `configure()` with token; `MiniGuardDirective` show/hide lifecycle |

Dev dependencies added: `react`, `@types/react`, `@testing-library/react`, `@angular/core`, `@angular/common`, `@angular/platform-browser`, `@angular/compiler`, `zone.js`.

---

## Usage

**React — provider pattern (app-wide guard):**
```tsx
const guard = new MiniGuard(featureMap, { defaultModule: 'dashboard' });

// root
<MiniGuardProvider guard={guard}>
  <App />
</MiniGuardProvider>

// any component — init/clear propagate to all Guard siblings
const { init, clear } = useMiniGuard();
init(token);

// declarative gating
<Guard feature="export"><ExportButton /></Guard>
```

**React — standalone hook (component-local guard):**
```tsx
const { init, canAccess } = useMiniGuard(featureMap, { defaultModule: 'dashboard' });
init(token);
if (canAccess('export')) { /* ... */ }
```

**Angular:**
```ts
// AppComponent
constructor(private guard: MiniGuardService) {
  // one-call configure + init
  guard.configure(featureMap, { defaultModule: 'dashboard' }, token);
}

// or separately
guard.configure(featureMap, { defaultModule: 'dashboard' });
guard.init(token);
```

```html
<button *miniGuard="'export'; module: 'dashboard'">Export</button>
```

---

## Verification

```bash
npm run build:check   # TypeScript must pass for both entry points
npm run build         # dist/ contains index.js, react.js, angular.js
npm run size:gz       # dist/index.js ≤ 1024B gzipped
npm test              # 86 tests green
```
