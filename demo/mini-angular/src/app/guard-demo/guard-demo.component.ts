import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MiniGuardService, MiniGuardDirective } from 'mini-guard/angular';

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

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  billing: 'Billing',
};

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

@Component({
  selector: 'app-guard-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, MiniGuardDirective],
  templateUrl: './guard-demo.component.html',
})
export class GuardDemoComponent implements OnInit {
  private readonly miniGuard = inject(MiniGuardService);

  ngOnInit(): void {
    this.miniGuard.configure(featureMap, { defaultModule: 'dashboard', debug: this.debugMode() });
  }

  presetUsers = PRESET_USERS;
  activeLabel = signal<string | null>(null);
  roles = signal<string[]>([]);
  tokenPreview = signal<string | null>(null);
  customInput = signal('');
  customOpen = signal(false);
  debugMode = signal(false);
  tick = signal(0);

  moduleGroups: ModuleGroup[] = Object.entries(featureMap).map(([mod, features]) => ({
    mod,
    label: MODULE_LABELS[mod] ?? mod,
    features: Object.entries(features).map(([feat, allowedRoles]) => ({
      feat,
      allowedRoles: allowedRoles as string[],
      mod,
    })),
  }));

  canAccess(feat: string, mod: string): boolean {
    void this.tick();
    return this.miniGuard.canAccess(feat, mod);
  }

  applyToken(token: string | null) {
    if (token) {
      this.miniGuard.init(token);
      const payload = decodePayload(token);
      const raw = payload?.['roles'];
      this.roles.set(Array.isArray(raw) ? raw.filter((r): r is string => typeof r === 'string') : []);
      this.tokenPreview.set(token);
    } else {
      this.miniGuard.clear();
      this.roles.set([]);
      this.tokenPreview.set(null);
    }
    this.tick.update((t) => t + 1);
  }

  loginAs(user: (typeof PRESET_USERS)[number]) {
    this.applyToken(user.token as string | null);
    this.activeLabel.set(user.label);
    this.customOpen.set(false);
  }

  loginCustom() {
    const t = this.customInput().trim();
    if (!t) return;
    this.applyToken(t);
    this.activeLabel.set('Custom');
    this.customOpen.set(false);
  }

  logout() {
    this.miniGuard.clear();
    this.roles.set([]);
    this.tokenPreview.set(null);
    this.activeLabel.set(null);
    this.tick.update((t) => t + 1);
  }

  toggleCustomOpen() {
    this.customOpen.update((o) => !o);
  }

  toggleDebug() {
    this.debugMode.update((d) => !d);
    this.miniGuard.configure(featureMap, { defaultModule: 'dashboard', debug: this.debugMode() });
    const token = this.tokenPreview();
    if (token) this.miniGuard.init(token);
    this.tick.update((t) => t + 1);
  }

  onCustomInputChange(value: string) {
    this.customInput.set(value);
  }

  truncateToken(token: string): string {
    return token.length > 120 ? token.slice(0, 120) + '…' : token;
  }

  codeSnippet(): string {
    return `import { MiniGuardService, MiniGuardDirective } from 'mini-guard/angular';

// AppComponent — configure once after login
constructor(private miniGuard: MiniGuardService) {}

ngOnInit() {
  this.miniGuard.configure(featureMap, { defaultModule: 'dashboard' });
  this.miniGuard.init(rawJwtToken);
}

// Programmatic check
this.miniGuard.canAccess('view:reports')              // → ${this.miniGuard.canAccess('view:reports')}
this.miniGuard.canAccess('edit:reports')              // → ${this.miniGuard.canAccess('edit:reports')}
this.miniGuard.canAccess('manage:users', 'settings')  // → ${this.miniGuard.canAccess('manage:users', 'settings')}
this.miniGuard.clear();  // on logout

// Template — structural directive
// <button *miniGuard="'export:data'">Export</button>
// <a *miniGuard="'manage:users'; module: 'settings'">Admin</a>`;
  }
}
