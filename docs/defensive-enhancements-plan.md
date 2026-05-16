# Defensive Enhancements Plan

Four improvements surfaced by security review — none are exploitable vulnerabilities (client-side RBAC only), but each strengthens robustness or developer experience.

---

## Enhancement 1 — `_getByPath`: `Object.hasOwn` guard

**File:** `src/mini-guard.ts` line 101

```ts
// before
if (cur !== null && typeof cur === 'object') return (cur as Record<string, unknown>)[key];

// after
if (cur !== null && typeof cur === 'object' && Object.hasOwn(cur as object, key))
  return (cur as Record<string, unknown>)[key];
```

Prevents traversing prototype-chain properties (`__proto__`, `constructor`) — only own properties are walked. `Object.hasOwn` is ES2022, matching `tsconfig.json` and `tsup.config.ts` targets. No new imports.

**New test** in `tests/mini-guard.test.ts` (inside `describe('MiniGuard — rolesClaim')`):
```ts
it('returns no roles when rolesClaim is a prototype-chain key', () => {
  const guard = new MiniGuard(featureMap, { defaultModule: 'dashboard', rolesClaim: '__proto__' });
  guard.init(makeJwt({ sub: '123', exp: futureExp() }));
  expect(guard.canAccess('view:reports')).toBe(false);
});
```

---

## Enhancement 2 — Empty string role filter

**File:** `src/mini-guard.ts` line 66

```ts
// before
roles = raw.filter((v): v is string => typeof v === 'string');

// after
roles = raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
```

Empty strings pass `typeof === 'string'` but can never match a real role. Filtering them early is strictly safer.

**New tests** in `tests/mini-guard.test.ts` (inside `describe('MiniGuard — role normalization')`):
```ts
it('ignores empty string values in the roles array', () => {
  const guard = new MiniGuard(featureMap, 'dashboard');
  guard.init(makeJwt({ roles: ['', 'analyst', ''], exp: futureExp() }));
  expect(guard.canAccess('view:reports')).toBe(true);
  expect(guard.canAccess('edit:reports')).toBe(false);
});

it('denies access when roles array contains only empty strings', () => {
  const guard = new MiniGuard(featureMap, 'dashboard');
  guard.init(makeJwt({ roles: ['', ''], exp: futureExp() }));
  expect(guard.canAccess('view:reports')).toBe(false);
});
```

---

## Enhancement 3 — React `Guard`: dev warning outside provider

**File:** `src/react.tsx` — Guard function body, after the `useContext` call

```tsx
const ctx = useContext(MiniGuardCtx);
if (ctx === null && process.env.NODE_ENV !== 'production')
  console.warn('[MiniGuard] <Guard> used outside MiniGuardProvider — renders fallback');
const show = ctx?.guard.canAccess(feature, module) ?? false;
return <>{show ? children : fallback}</>;
```

`process.env.NODE_ENV !== 'production'` is dead-code-eliminated in production builds by Vite/webpack. In vitest (`NODE_ENV=test`) the warning fires — correct for testing.

**Tests in `tests/react.test.tsx`:**
- Add `vi` to the `vitest` import
- Add new test asserting the warning fires when no provider is present
- Wrap the two existing no-provider `<Guard>` tests with a `console.warn` spy to suppress and assert the warning

---

## Enhancement 4 — Angular `configure()`: warn on reconfiguration

**File:** `src/angular.ts` — first line of `configure()` body

```ts
configure(featureMap: FeatureMap, options?: MiniGuardOptions, token?: string): void {
  if (this._guard)
    console.warn('[MiniGuard] configure() called more than once — replacing guard and clearing session');
  this._guard = new MiniGuard(featureMap, options);
  if (token) this._guard.init(token);
}
```

Follows the identical pattern already used in `init()` and `clear()`.

**Tests in `tests/angular.test.ts`:**
- Add new test: "warns when configure() is called a second time"
- Update "re-configure with token" and "re-configure replaces the guard instance" tests to spy on `console.warn` around the second `configure()` call

---

## Files to change

| File | Change |
|---|---|
| `src/mini-guard.ts` | Enhancements 1 & 2 |
| `src/react.tsx` | Enhancement 3 |
| `src/angular.ts` | Enhancement 4 |
| `tests/mini-guard.test.ts` | 3 new tests |
| `tests/react.test.tsx` | 1 new test, 2 updated, add `vi` import |
| `tests/angular.test.ts` | 1 new test, 2 updated |

---

## Verification

```bash
npm test             # 86 existing + ~6 new ≈ 92 tests green
npm run size:gz      # dist/index.js must stay ≤ 1024B
npm run build:check  # TypeScript must pass
```
