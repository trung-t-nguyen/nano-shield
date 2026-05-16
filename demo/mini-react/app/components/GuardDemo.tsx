'use client';

import { MiniGuard } from 'mini-guard';
import { useState } from 'react';

// ── Feature map ──────────────────────────────────────────────────────────────
const featureMap = {
  dashboard: {
    'view:reports': ['admin', 'analyst'],
    'edit:reports': ['admin'],
    'export:data': ['admin', 'analyst'],
  },
  settings: {
    'manage:users': ['admin'],
    'view:logs': ['admin', 'analyst'],
    'edit:profile': ['admin', 'analyst', 'viewer'],
  },
  billing: {
    'view:invoices': ['admin', 'billing'],
    'manage:subscriptions': ['admin'],
    'view:billing': ['admin', 'billing', 'analyst'],
  },
};

// ── Demo token builder (unsigned — for demo only) ────────────────────────────
function b64url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function mockToken(payload: object): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.demo_sig`;
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1] ?? '';
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

const FAR_FUTURE = 9_999_999_999; // year ~2286

// ── Preset users ─────────────────────────────────────────────────────────────
const PRESET_USERS = [
  {
    label: 'Admin',
    bg: 'bg-violet-600',
    badge: 'bg-violet-100 text-violet-800',
    description: 'Full access to everything',
    roles: ['admin'],
    token: mockToken({ sub: '1', name: 'Admin User', roles: ['admin'], exp: FAR_FUTURE }),
  },
  {
    label: 'Analyst',
    bg: 'bg-blue-600',
    badge: 'bg-blue-100 text-blue-800',
    description: 'Can view & export reports',
    roles: ['analyst'],
    token: mockToken({ sub: '2', name: 'Analyst User', roles: ['analyst'], exp: FAR_FUTURE }),
  },
  {
    label: 'Viewer',
    bg: 'bg-emerald-600',
    badge: 'bg-emerald-100 text-emerald-800',
    description: 'Can only edit own profile',
    roles: ['viewer'],
    token: mockToken({ sub: '3', name: 'Viewer User', roles: ['viewer'], exp: FAR_FUTURE }),
  },
  {
    label: 'Billing Mgr',
    bg: 'bg-amber-600',
    badge: 'bg-amber-100 text-amber-800',
    description: 'Access to billing module',
    roles: ['billing'],
    token: mockToken({ sub: '4', name: 'Billing Manager', roles: ['billing'], exp: FAR_FUTURE }),
  },
  {
    label: 'Guest',
    bg: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-800',
    description: 'No token — zero access',
    roles: [],
    token: null,
  },
] as const;

// ── Module labels ─────────────────────────────────────────────────────────────
const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  billing: 'Billing',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function GuardDemo() {
  const [guard] = useState(
    () => new MiniGuard(featureMap, { defaultModule: 'dashboard' })
  );
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [tick, setTick] = useState(0); // forces re-render after guard state change

  function applyToken(token: string | null) {
    if (token) {
      guard.init(token);
      const payload = decodePayload(token);
      const raw = payload?.['roles'];
      setRoles(Array.isArray(raw) ? raw.filter((r): r is string => typeof r === 'string') : []);
      setTokenPreview(token);
    } else {
      guard.clear();
      setRoles([]);
      setTokenPreview(null);
    }
    setTick((t) => t + 1);
  }

  function loginAs(user: (typeof PRESET_USERS)[number]) {
    applyToken(user.token as string | null);
    setActiveLabel(user.label);
    setCustomOpen(false);
  }

  function loginCustom() {
    const t = customInput.trim();
    if (!t) return;
    applyToken(t);
    setActiveLabel('Custom');
    setCustomOpen(false);
  }

  const canAccess = (feat: string, mod: string) => guard.canAccess(feat, mod);

  const allEntries = Object.entries(featureMap) as [
    keyof typeof featureMap,
    Record<string, string[]>,
  ][];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🛡️</span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">mini-guard demo</h1>
          <p className="text-xs text-slate-500">
            Ultra-lightweight RBAC · JWT decoding · zero dependencies
          </p>
        </div>
        <a
          href="https://www.npmjs.com/package/mini-guard"
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs bg-red-600 text-white px-3 py-1 rounded-full font-medium hover:bg-red-700 transition-colors"
        >
          npm install mini-guard
        </a>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
        {/* ── Left panel ── */}
        <aside className="flex flex-col gap-4">
          {/* User picker */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              1. Pick a user
            </h2>
            <div className="flex flex-col gap-2">
              {PRESET_USERS.map((u) => (
                <button
                  key={u.label}
                  onClick={() => loginAs(u)}
                  className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition-all ${
                    activeLabel === u.label
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`${u.bg} text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0`}
                  >
                    {u.label[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.label}</p>
                    <p className="text-xs text-slate-400 truncate">{u.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Custom token */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <button
              onClick={() => setCustomOpen((o) => !o)}
              className="w-full flex items-center justify-between text-sm font-semibold text-slate-500 uppercase tracking-wider"
            >
              <span>2. Paste your JWT</span>
              <span className="text-slate-400">{customOpen ? '▲' : '▼'}</span>
            </button>
            {customOpen && (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiJ9..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={loginCustom}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                >
                  Apply token
                </button>
              </div>
            )}
          </section>

          {/* Current session */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Current session
            </h2>
            {activeLabel ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">User:</span>
                  <span className="text-sm font-semibold">{activeLabel}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {roles.length > 0 ? (
                    roles.map((r) => (
                      <span
                        key={r}
                        className="bg-violet-100 text-violet-800 text-xs font-mono px-2 py-0.5 rounded-full"
                      >
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">no roles</span>
                  )}
                </div>
                {tokenPreview && (
                  <div className="mt-1">
                    <p className="text-xs text-slate-400 mb-1">JWT (truncated)</p>
                    <p className="text-xs font-mono text-slate-600 bg-slate-50 rounded p-2 break-all line-clamp-3">
                      {tokenPreview.slice(0, 120)}
                      {tokenPreview.length > 120 ? '…' : ''}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    guard.clear();
                    setRoles([]);
                    setTokenPreview(null);
                    setActiveLabel(null);
                    setTick((t) => t + 1);
                  }}
                  className="mt-1 text-xs text-red-500 hover:text-red-700 text-left transition-colors"
                >
                  logout (guard.clear())
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Not logged in</p>
            )}
          </section>
        </aside>

        {/* ── Right panel — access matrix ── */}
        <section className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Feature access matrix
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Live result of <code className="bg-slate-100 px-1 rounded">guard.canAccess(feature, module)</code>
            </p>

            <div className="flex flex-col gap-6">
              {allEntries.map(([mod, features]) => (
                <div key={mod}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                    <span className="w-px h-4 bg-slate-300 inline-block" />
                    {MODULE_LABELS[mod] ?? mod}
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {Object.entries(features).map(([feat, allowedRoles]) => {
                      const allowed = canAccess(feat, mod);
                      return (
                        <div
                          key={feat}
                          className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
                            allowed
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                allowed
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-300 text-white'
                              }`}
                            >
                              {allowed ? '✓' : '✕'}
                            </span>
                            <code className="text-sm font-mono text-slate-700 truncate">
                              {feat}
                            </code>
                          </div>
                          <div className="flex gap-1 flex-wrap justify-end ml-2">
                            {(allowedRoles as string[]).map((r) => (
                              <span
                                key={r}
                                className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                  roles.includes(r)
                                    ? 'bg-emerald-200 text-emerald-900 font-bold'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code snippet */}
          <div className="bg-slate-900 rounded-xl p-4 text-sm font-mono overflow-x-auto">
            <p className="text-slate-400 text-xs mb-2">// How this demo is wired</p>
            <pre className="text-slate-100 whitespace-pre text-xs leading-relaxed">{`import { MiniGuard } from 'mini-guard';

const guard = new MiniGuard(featureMap, {
  defaultModule: 'dashboard',
});

guard.init(rawJwtToken);       // after login
guard.canAccess('view:reports');          // → ${canAccess('view:reports', 'dashboard')}
guard.canAccess('edit:reports');          // → ${canAccess('edit:reports', 'dashboard')}
guard.canAccess('manage:users', 'settings'); // → ${canAccess('manage:users', 'settings')}
guard.clear();                 // on logout`}</pre>
          </div>
        </section>
      </main>
    </div>
  );
}
