// ── Shared types ──────────────────────────────────────────────────────────────
export interface FeatureRow {
  feat: string;
  allowedRoles: string[];
  mod: string;
}

export interface ModuleGroup {
  mod: string;
  label: string;
  features: FeatureRow[];
}

export interface PresetUser {
  label: string;
  bg: string;
  badge: string;
  description: string;
  roles: readonly string[];
  token: string | null;
}

// ── Demo token builder (unsigned — for demo only) ─────────────────────────────
const FAR_FUTURE = 9_999_999_999; // year ~2286

function b64url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function mockToken(payload: object): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.demo_sig`;
}

export function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1] ?? '';
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// ── Feature map ───────────────────────────────────────────────────────────────
export const featureMap = {
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

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  billing: 'Billing',
};

// ── Preset users ──────────────────────────────────────────────────────────────
export const PRESET_USERS: PresetUser[] = [
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
];

// ── Module groups (derived from featureMap) ───────────────────────────────────
export const MODULE_GROUPS: ModuleGroup[] = Object.entries(featureMap).map(([mod, features]) => ({
  mod,
  label: MODULE_LABELS[mod] ?? mod,
  features: Object.entries(features).map(([feat, allowedRoles]) => ({
    feat,
    allowedRoles: allowedRoles as string[],
    mod,
  })),
}));
