'use client';

import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { MiniGuardProvider, useMiniGuard } from 'mini-guard/react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DemoHeader } from './DemoHeader';
import { AccessMatrixPanel, QuickActionsPanel } from './RbacPanels';
import { featureMap, featureMapRoles } from './rbacConfig';

// ── Config check ─────────────────────────────────────────────────────────────
const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN ?? '';
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ?? '';
const AUTH0_AUDIENCE = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;
const AUTH0_ROLES_CLAIM = process.env.NEXT_PUBLIC_AUTH0_ROLES_CLAIM ?? 'roles';

interface AuthStatusSectionProps {
  isAuthenticated: boolean;
  error: Error | undefined;
  user: {
    name?: string;
    email?: string;
    picture?: string;
  } | undefined;
  roles: string[];
  tokenError: string | null;
  tokenPreview: string | null;
  decodedPayload: Record<string, unknown> | null;
  onLogin: () => void;
  onSignup: () => void;
  onLogout: () => void;
}

function AuthStatusSection({
  isAuthenticated,
  error,
  user,
  roles,
  tokenError,
  tokenPreview,
  decodedPayload,
  onLogin,
  onSignup,
  onLogout,
}: AuthStatusSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Auth0 session
      </h2>

      {!isAuthenticated ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            Log in with your Auth0 account. Your access token is passed directly to{' '}
            <code className="bg-slate-100 px-1 rounded text-xs">mini-guard</code>.
          </p>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded p-2">
              Error: {error.message}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onLogin}
              className="flex-1 bg-black hover:bg-slate-800 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Log in
            </button>
            <button
              onClick={onSignup}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Sign up
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {user?.picture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt={user.name ?? 'avatar'}
                className="w-9 h-9 rounded-full border border-slate-200"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1">Roles used by mini-guard</p>
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
                <span className="text-xs text-slate-400 italic">
                  no roles found in token
                </span>
              )}
            </div>
          </div>

          {tokenError && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">{tokenError}</p>
          )}

          {tokenPreview && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Access token</p>
              <p className="text-xs font-mono text-slate-600 bg-slate-50 rounded p-2 break-all">
                {tokenPreview}
              </p>
            </div>
          )}

          {decodedPayload && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Decoded token payload</p>
              <pre className="text-xs font-mono text-slate-700 bg-slate-50 rounded p-2 overflow-x-auto whitespace-pre-wrap wrap-break-word">
                {JSON.stringify(decodedPayload, null, 2)}
              </pre>
            </div>
          )}

          <button
            onClick={onLogout}
            className="text-xs text-red-500 hover:text-red-700 text-left transition-colors"
          >
            logout (clear())
          </button>
        </div>
      )}
    </section>
  );
}

interface ConfigurationSectionProps {
  domain: string;
  audience?: string;
  rolesClaim: string;
  activeRoles: string[];
}

function ConfigurationSection({
  domain,
  audience,
  rolesClaim,
  activeRoles,
}: ConfigurationSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Configuration
      </h2>
      <div className="flex flex-col gap-1.5 text-xs font-mono">
        <div className="flex gap-2">
          <span className="text-slate-400 shrink-0">domain</span>
          <span className="text-slate-700 truncate">{domain}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-400 shrink-0">audience</span>
          <span className="text-slate-500 truncate">{audience ?? '(not set)'}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-400 shrink-0">rolesClaim</span>
          <span className="text-slate-700 truncate">{rolesClaim}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Roles in feature map
        </p>
        <div className="flex flex-wrap gap-1">
          {featureMapRoles.map((role) => (
            <span
              key={role}
              className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                activeRoles.includes(role)
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              {role}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Not-configured placeholder ────────────────────────────────────────────────
function NotConfigured() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-lg bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <h1 className="text-xl font-bold">Auth0 not configured</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Copy <code className="bg-slate-100 px-1 rounded">.env.local.example</code> to{' '}
          <code className="bg-slate-100 px-1 rounded">.env.local</code> and fill in your Auth0
          credentials.
        </p>
        <div className="bg-slate-900 rounded-lg p-4 text-xs font-mono text-slate-100 leading-relaxed">
          <span className="text-slate-400"># .env.local</span>
          {'\n'}
          <span className="text-emerald-400">NEXT_PUBLIC_AUTH0_DOMAIN</span>=your-tenant.auth0.com{'\n'}
          <span className="text-emerald-400">NEXT_PUBLIC_AUTH0_CLIENT_ID</span>=your_client_id{'\n'}
          <span className="text-slate-400"># optional — needed for access token JWT</span>
          {'\n'}
          <span className="text-emerald-400">NEXT_PUBLIC_AUTH0_AUDIENCE</span>=https://your-api{'\n'}
          <span className="text-emerald-400">NEXT_PUBLIC_AUTH0_ROLES_CLAIM</span>=https://your-domain.com/roles
        </div>
        <p className="text-slate-400 text-xs">
          In Auth0 dashboard: create a <strong>Single Page Application</strong> and set callback /
          logout URL to <code className="bg-slate-100 px-1 rounded">http://localhost:3000/auth0</code>.
          To add roles to tokens, use an <strong>Auth0 Action</strong> that sets a custom namespace
          claim on the access token.
        </p>
        <Link
          href="/"
          className="text-sm text-violet-600 hover:text-violet-800 transition-colors"
        >
          ← Back to mock demo
        </Link>
      </div>
    </div>
  );
}

// ── Inner component: has access to useAuth0 ───────────────────────────────────
function Auth0DemoInner() {
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect: login,
    logout: auth0Logout,
    user,
    getAccessTokenSilently,
  } = useAuth0();

  const { init, clear, canAccess, instance } = useMiniGuard(featureMap, {
    defaultModule: 'dashboard',
    rolesClaim: AUTH0_ROLES_CLAIM,
  });

  const [roles, setRoles] = useState<string[]>([]);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);
  const [decodedPayload, setDecodedPayload] = useState<Record<string, unknown> | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const initializedSubRef = useRef<string | null>(null);

  const resetAuthState = useCallback(() => {
    clear();
    setRoles([]);
    setTokenPreview(null);
    setDecodedPayload(null);
    setTokenError(null);
  }, [clear]);

  const hydrateFromGuard = useCallback(() => {
    setRoles(instance.getRoles());
    setDecodedPayload(instance.getTokenPayload());
  }, [instance]);

  const fetchAndInitToken = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently(
        AUTH0_AUDIENCE ? { authorizationParams: { audience: AUTH0_AUDIENCE } } : undefined,
      );
      init(token);
      hydrateFromGuard();
      setTokenPreview(token);
      setTokenError(null);
    } catch (err) {
      // No audience configured — fall back to ID token for display only
      setTokenError(
        err instanceof Error ? err.message : 'Could not get access token — set NEXT_PUBLIC_AUTH0_AUDIENCE',
      );
      resetAuthState();
      hydrateFromGuard();
    }
  }, [getAccessTokenSilently, hydrateFromGuard, init, resetAuthState]);

  const signup = () => login({ authorizationParams: { screen_hint: 'signup' } });
  const logout = () => {
    resetAuthState();
    initializedSubRef.current = null;
    auth0Logout({ logoutParams: { returnTo: `${window.location.origin}/auth0` } });
  };

  useEffect(() => {
    const userSub = user?.sub ?? null;
    if (!isAuthenticated || !userSub) return;
    if (initializedSubRef.current === userSub) return;
    initializedSubRef.current = userSub;
    void fetchAndInitToken();
  }, [fetchAndInitToken, isAuthenticated, user?.sub]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <DemoHeader
        title="mini-guard · Auth0 demo"
        subtitle="Real Auth0 tokens · RBAC with JWT decoding · zero dependencies"
        actionsClassName="ml-auto flex items-center gap-3"
        actions={
          <>
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Mock demo
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
          <AuthStatusSection
            isAuthenticated={isAuthenticated}
            error={error}
            user={user}
            roles={roles}
            tokenError={tokenError}
            tokenPreview={tokenPreview}
            decodedPayload={decodedPayload}
            onLogin={() => login()}
            onSignup={signup}
            onLogout={logout}
          />

          <ConfigurationSection
            domain={AUTH0_DOMAIN}
            audience={AUTH0_AUDIENCE}
            rolesClaim={AUTH0_ROLES_CLAIM}
            activeRoles={roles}
          />
        </aside>

        {/* ── Right panel ── */}
        <section className="flex flex-col gap-4">
          <AccessMatrixPanel
            canAccess={canAccess}
            roles={roles}
            emptyMessage={!isAuthenticated ? 'Log in to see your access matrix' : undefined}
          />

          {/* Guard component panel */}
          <MiniGuardProvider guard={instance}>
            <QuickActionsPanel
              emptyMessage={
                !isAuthenticated
                  ? 'Log in to see available actions'
                  : roles.length === 0
                    ? 'No roles found - add roles to your Auth0 token'
                    : undefined
              }
            />
          </MiniGuardProvider>

          {/* Code snippet */}
          <div className="bg-slate-900 rounded-xl p-4 text-sm font-mono overflow-x-auto">
            <p className="text-slate-400 text-xs mb-2">{'// How this Auth0 integration works'}</p>
            <pre className="text-slate-100 whitespace-pre text-xs leading-relaxed">{`import { useAuth0 } from '@auth0/auth0-react';
import { useMiniGuard } from 'mini-guard/react';

function App() {
  const { getAccessTokenSilently } = useAuth0();
  const { init, canAccess } = useMiniGuard(featureMap, {
    defaultModule: 'dashboard',
    rolesClaim: '${AUTH0_ROLES_CLAIM}',
  });

  useEffect(() => {
    getAccessTokenSilently().then((token) => {
      init(token);  // mini-guard decodes + caches roles
    });
  }, [isAuthenticated]);

  canAccess('view:reports')   // → ${canAccess('view:reports', 'dashboard')}
  canAccess('edit:reports')   // → ${canAccess('edit:reports', 'dashboard')}
}`}</pre>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Public export: Auth0Provider wrapper ──────────────────────────────────────
export default function Auth0Demo() {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
    return <NotConfigured />;
  }

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      cacheLocation="localstorage"
      authorizationParams={{
        redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/auth0` : '',
        ...(AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : {}),
      }}
    >
      <Auth0DemoInner />
    </Auth0Provider>
  );
}
