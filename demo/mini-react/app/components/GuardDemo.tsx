'use client';

import { MiniGuardProvider, useMiniGuard } from 'mini-guard/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AccessMatrixPanel, QuickActionsPanel } from './RbacPanels';
import { DemoHeader } from './DemoHeader';
import { featureMap } from './rbacConfig';

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

interface PresetUser {
  label: string;
  bg: string;
  description: string;
  roles: readonly string[];
  token: string | null;
}

// ── Preset users ─────────────────────────────────────────────────────────────
const PRESET_USERS: readonly PresetUser[] = [
  {
    label: 'Admin',
    bg: 'bg-violet-600',
    description: 'Full access to everything',
    roles: ['admin'],
    token: mockToken({ sub: '1', name: 'Admin User', roles: ['admin'], exp: FAR_FUTURE }),
  },
  {
    label: 'Analyst',
    bg: 'bg-blue-600',
    description: 'Can view & export reports',
    roles: ['analyst'],
    token: mockToken({ sub: '2', name: 'Analyst User', roles: ['analyst'], exp: FAR_FUTURE }),
  },
  {
    label: 'Viewer',
    bg: 'bg-emerald-600',
    description: 'Can only edit own profile',
    roles: ['viewer'],
    token: mockToken({ sub: '3', name: 'Viewer User', roles: ['viewer'], exp: FAR_FUTURE }),
  },
  {
    label: 'Billing Mgr',
    bg: 'bg-amber-600',
    description: 'Access to billing module',
    roles: ['billing'],
    token: mockToken({ sub: '4', name: 'Billing Manager', roles: ['billing'], exp: FAR_FUTURE }),
  },
  {
    label: 'Guest',
    bg: 'bg-slate-500',
    description: 'No token — zero access',
    roles: [],
    token: null,
  },
] as const;

// ── Persisted session (survives debug toggle remount) ─────────────────────────
interface PersistedSession {
  token: string | null;
  activeLabel: string | null;
  roles: string[];
}

interface UserPickerSectionProps {
  activeLabel: string | null;
  onSelectUser: (user: PresetUser) => void;
}

function UserPickerSection({ activeLabel, onSelectUser }: UserPickerSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        1. Pick a user
      </h2>
      <div className="flex flex-col gap-2">
        {PRESET_USERS.map((u) => (
          <button
            key={u.label}
            onClick={() => onSelectUser(u)}
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
  );
}

interface CustomTokenSectionProps {
  customOpen: boolean;
  customInput: string;
  onToggleOpen: () => void;
  onInputChange: (value: string) => void;
  onApplyToken: () => void;
}

function CustomTokenSection({
  customOpen,
  customInput,
  onToggleOpen,
  onInputChange,
  onApplyToken,
}: CustomTokenSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between text-sm font-semibold text-slate-500 uppercase tracking-wider"
      >
        <span>2. Paste your JWT</span>
        <span className="text-slate-400">{customOpen ? '▲' : '▼'}</span>
      </button>
      {customOpen && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={customInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiJ9..."
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={onApplyToken}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Apply token
          </button>
        </div>
      )}
    </section>
  );
}

interface CurrentSessionSectionProps {
  activeLabel: string | null;
  roles: string[];
  tokenPreview: string | null;
  onLogout: () => void;
}

function CurrentSessionSection({
  activeLabel,
  roles,
  tokenPreview,
  onLogout,
}: CurrentSessionSectionProps) {
  return (
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
            onClick={onLogout}
            className="mt-1 text-xs text-red-500 hover:text-red-700 text-left transition-colors"
          >
            logout (clear())
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">Not logged in</p>
      )}
    </section>
  );
}

// ── Shell: owns debug flag + persisted session state ─────────────────────────
export default function GuardDemo() {
  const [debug, setDebug] = useState(false);
  const [guardKey, setGuardKey] = useState(0);
  const [session, setSession] = useState<PersistedSession>({
    token: null,
    activeLabel: null,
    roles: [],
  });

  function toggleDebug() {
    setDebug((d) => !d);
    setGuardKey((k) => k + 1);
  }

  return (
    <GuardDemoContent
      key={guardKey}
      debug={debug}
      initialSession={session}
      onSessionChange={setSession}
      onToggleDebug={toggleDebug}
    />
  );
}

// ── Content: uses useMiniGuard hook ───────────────────────────────────────────
function GuardDemoContent({
  debug,
  initialSession,
  onSessionChange,
  onToggleDebug,
}: {
  debug: boolean;
  initialSession: PersistedSession;
  onSessionChange: (s: PersistedSession) => void;
  onToggleDebug: () => void;
}) {
  const { init, clear, canAccess, instance } = useMiniGuard(featureMap, {
    defaultModule: 'dashboard',
    debug,
  });

  const [activeLabel, setActiveLabel] = useState<string | null>(initialSession.activeLabel);
  const [roles, setRoles] = useState<string[]>(initialSession.roles);
  const [tokenPreview, setTokenPreview] = useState<string | null>(initialSession.token);
  const [customInput, setCustomInput] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const hasRehydratedRef = useRef(false);

  useEffect(() => {
    if (hasRehydratedRef.current) return;
    hasRehydratedRef.current = true;
    if (initialSession.token) {
      init(initialSession.token);
    }
  }, [initialSession.token, init]);

  function resetSessionState() {
    clear();
    setRoles([]);
    setTokenPreview(null);
  }

  function applyToken(token: string | null): string[] {
    if (token) {
      init(token);
      const payload = decodePayload(token);
      const raw = payload?.['roles'];
      const newRoles = Array.isArray(raw)
        ? raw.filter((r): r is string => typeof r === 'string')
        : [];
      setRoles(newRoles);
      setTokenPreview(token);
      return newRoles;
    }
    resetSessionState();
    return [];
  }

  function loginAs(user: PresetUser) {
    const token = user.token;
    const newRoles = applyToken(token);
    setActiveLabel(user.label);
    onSessionChange({ token, activeLabel: user.label, roles: newRoles });
    setCustomOpen(false);
  }

  function loginCustom() {
    const t = customInput.trim();
    if (!t) return;
    const newRoles = applyToken(t);
    setActiveLabel('Custom');
    onSessionChange({ token: t, activeLabel: 'Custom', roles: newRoles });
    setCustomOpen(false);
  }

  function logout() {
    resetSessionState();
    setActiveLabel(null);
    onSessionChange({ token: null, activeLabel: null, roles: [] });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <DemoHeader
        title="mini-guard · React demo"
        subtitle="Ultra-lightweight RBAC · JWT decoding · zero dependencies"
        actions={
          <>
            <button
              onClick={onToggleDebug}
              title="Logs [MiniGuard] events to the browser console"
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                debug
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {debug ? 'debug: on' : 'debug: off'}
            </button>
            {debug && <span className="text-xs text-amber-600 font-medium">↳ check console</span>}
            <Link
              href="/auth0"
              className="text-xs bg-black text-white px-3 py-1 rounded-full font-medium hover:bg-slate-800 transition-colors"
            >
              Auth0 demo →
            </Link>
            <a
              href="https://www.npmjs.com/package/mini-guard"
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-red-600 text-white px-3 py-1 rounded-full font-medium hover:bg-red-700 transition-colors"
            >
              npm install mini-guard
            </a>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
        {/* ── Left panel ── */}
        <aside className="flex flex-col gap-4">
          <UserPickerSection activeLabel={activeLabel} onSelectUser={loginAs} />

          <CustomTokenSection
            customOpen={customOpen}
            customInput={customInput}
            onToggleOpen={() => setCustomOpen((o) => !o)}
            onInputChange={setCustomInput}
            onApplyToken={loginCustom}
          />

          <CurrentSessionSection
            activeLabel={activeLabel}
            roles={roles}
            tokenPreview={tokenPreview}
            onLogout={logout}
          />
        </aside>

        {/* ── Right panel ── */}
        <section className="flex flex-col gap-4">
          <AccessMatrixPanel canAccess={canAccess} roles={roles} />

          <MiniGuardProvider guard={instance}>
            <QuickActionsPanel emptyMessage={roles.length === 0 ? 'Log in to see available actions' : undefined} />
          </MiniGuardProvider>

          {/* Code snippet */}
          <div className="bg-slate-900 rounded-xl p-4 text-sm font-mono overflow-x-auto">
            <p className="text-slate-400 text-xs mb-2">{'// How this demo is wired'}</p>
            <pre className="text-slate-100 whitespace-pre text-xs leading-relaxed">{`import { Guard, MiniGuardProvider, useMiniGuard } from 'mini-guard/react';

function App() {
  const { init, clear, canAccess } = useMiniGuard(featureMap, {
    defaultModule: 'dashboard',${debug ? `\n    debug: true,         // logs [MiniGuard] events to console` : ''}
  });

  // after login — triggers re-render automatically
  init(rawJwtToken);
  canAccess('view:reports')              // → ${canAccess('view:reports', 'dashboard')}
  canAccess('edit:reports')              // → ${canAccess('edit:reports', 'dashboard')}
  canAccess('manage:users', 'settings')  // → ${canAccess('manage:users', 'settings')}
  clear();  // on logout
}`}</pre>
          </div>
        </section>
      </main>
    </div>
  );
}
