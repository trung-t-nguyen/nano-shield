import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MiniGuardService, MiniGuardDirective } from 'mini-guard/angular';
import { GuardDemoComponent } from './guard-demo.component';

// ── JWT helper (unsigned — for testing only) ──────────────────────────────────
function makeJwt(payload: object): string {
  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.test_sig`;
}

const FAR_FUTURE = 9_999_999_999;

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

// ── MiniGuardService ──────────────────────────────────────────────────────────
describe('MiniGuardService — when using mini-guard', () => {
  let svc: MiniGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    svc = TestBed.inject(MiniGuardService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('returns false for any feature before configure()', () => {
    expect(svc.canAccess('view:reports', 'dashboard')).toBe(false);
  });

  it('returns false after configure() but before init()', () => {
    svc.configure(featureMap);
    expect(svc.canAccess('view:reports', 'dashboard')).toBe(false);
  });

  it('grants access when the token carries a matching role', () => {
    svc.configure(featureMap);
    svc.init(makeJwt({ roles: ['admin'], exp: FAR_FUTURE }));
    expect(svc.canAccess('view:reports', 'dashboard')).toBe(true);
    expect(svc.canAccess('edit:reports', 'dashboard')).toBe(true);
    expect(svc.canAccess('manage:users', 'settings')).toBe(true);
  });

  it('denies access when the token role is not in the allowed list', () => {
    svc.configure(featureMap);
    svc.init(makeJwt({ roles: ['viewer'], exp: FAR_FUTURE }));
    expect(svc.canAccess('view:reports', 'dashboard')).toBe(false);
    expect(svc.canAccess('edit:reports', 'dashboard')).toBe(false);
    expect(svc.canAccess('edit:profile', 'settings')).toBe(true); // viewer CAN edit profile
  });

  it('grants only billing-scoped access for the billing role', () => {
    svc.configure(featureMap);
    svc.init(makeJwt({ roles: ['billing'], exp: FAR_FUTURE }));
    expect(svc.canAccess('view:invoices', 'billing')).toBe(true);
    expect(svc.canAccess('view:billing', 'billing')).toBe(true);
    expect(svc.canAccess('manage:subscriptions', 'billing')).toBe(false);
    expect(svc.canAccess('view:reports', 'dashboard')).toBe(false);
  });

  it('revokes all access after clear()', () => {
    svc.configure(featureMap);
    svc.init(makeJwt({ roles: ['admin'], exp: FAR_FUTURE }));
    svc.clear();
    expect(svc.canAccess('view:reports', 'dashboard')).toBe(false);
    expect(svc.canAccess('manage:users', 'settings')).toBe(false);
  });

  it('rejects an expired token', () => {
    svc.configure(featureMap);
    svc.init(makeJwt({ roles: ['admin'], exp: 1 })); // expired in 1970
    expect(svc.canAccess('view:reports', 'dashboard')).toBe(false);
  });
});

// ── MiniGuardDirective ────────────────────────────────────────────────────────
@Component({
  selector: 'app-test-host',
  // tick signal is read in the template so Angular marks this view dirty when bumped,
  // which triggers ngDoCheck on every MiniGuardDirective in the tree.
  template: `
    @if (tick()) {}
    <button *miniGuard="'view:reports'; module: 'dashboard'" id="view-reports">View reports</button>
    <button *miniGuard="'edit:reports'; module: 'dashboard'" id="edit-reports">Edit reports</button>
    <button *miniGuard="'edit:profile'; module: 'settings'" id="edit-profile">Edit profile</button>
  `,
  imports: [MiniGuardDirective],
  standalone: true,
})
class TestHostComponent {
  readonly tick = signal(0);
  bump() { this.tick.update((t) => t + 1); }
}

describe('MiniGuardDirective — when using mini-guard', () => {
  let svc: MiniGuardService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    svc = TestBed.inject(MiniGuardService);
    svc.configure(featureMap);
  });

  afterEach(() => TestBed.resetTestingModule());

  function render() {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('hides all guarded elements before login', () => {
    const { nativeElement } = render();
    expect(nativeElement.querySelector('#view-reports')).toBeNull();
    expect(nativeElement.querySelector('#edit-reports')).toBeNull();
    expect(nativeElement.querySelector('#edit-profile')).toBeNull();
  });

  it('shows only accessible elements for the analyst role', () => {
    svc.init(makeJwt({ roles: ['analyst'], exp: FAR_FUTURE }));
    const { nativeElement } = render();
    expect(nativeElement.querySelector('#view-reports')).not.toBeNull();
    expect(nativeElement.querySelector('#edit-reports')).toBeNull();     // admin-only
    expect(nativeElement.querySelector('#edit-profile')).not.toBeNull();
  });

  it('shows all guarded elements for the admin role', () => {
    svc.init(makeJwt({ roles: ['admin'], exp: FAR_FUTURE }));
    const { nativeElement } = render();
    expect(nativeElement.querySelector('#view-reports')).not.toBeNull();
    expect(nativeElement.querySelector('#edit-reports')).not.toBeNull();
    expect(nativeElement.querySelector('#edit-profile')).not.toBeNull();
  });

  it('removes elements from DOM after clear()', () => {
    svc.init(makeJwt({ roles: ['admin'], exp: FAR_FUTURE }));
    const fixture = render();
    expect(fixture.nativeElement.querySelector('#view-reports')).not.toBeNull();

    svc.clear();
    fixture.componentInstance.bump();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#view-reports')).toBeNull();
  });

  it('adds elements to DOM when user logs in after initial render', () => {
    const fixture = render();
    expect(fixture.nativeElement.querySelector('#view-reports')).toBeNull();

    svc.init(makeJwt({ roles: ['analyst'], exp: FAR_FUTURE }));
    fixture.componentInstance.bump();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#view-reports')).not.toBeNull();
  });
});

// ── GuardDemoComponent ────────────────────────────────────────────────────────
describe('GuardDemoComponent — when using mini-guard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuardDemoComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  function createComponent() {
    const fixture = TestBed.createComponent(GuardDemoComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('starts with no active user and empty roles', () => {
    const { component } = createComponent();
    expect(component.activeLabel()).toBeNull();
    expect(component.roles()).toEqual([]);
    expect(component.tokenPreview()).toBeNull();
  });

  it('loginAs(Admin) sets the active label and roles signal', () => {
    const { component } = createComponent();
    const admin = component.presetUsers.find((u) => u.label === 'Admin')!;
    component.loginAs(admin);
    expect(component.activeLabel()).toBe('Admin');
    expect(component.roles()).toContain('admin');
  });

  it('loginAs(Analyst) grants view:reports but not edit:reports', () => {
    const { component } = createComponent();
    const analyst = component.presetUsers.find((u) => u.label === 'Analyst')!;
    component.loginAs(analyst);
    expect(component.canAccess('view:reports', 'dashboard')).toBe(true);
    expect(component.canAccess('edit:reports', 'dashboard')).toBe(false);
  });

  it('loginAs(Viewer) only grants edit:profile in settings', () => {
    const { component } = createComponent();
    const viewer = component.presetUsers.find((u) => u.label === 'Viewer')!;
    component.loginAs(viewer);
    expect(component.canAccess('edit:profile', 'settings')).toBe(true);
    expect(component.canAccess('view:reports', 'dashboard')).toBe(false);
    expect(component.canAccess('manage:users', 'settings')).toBe(false);
  });

  it('loginAs(Guest) grants no access', () => {
    const { component } = createComponent();
    const guest = component.presetUsers.find((u) => u.label === 'Guest')!;
    component.loginAs(guest);
    expect(component.roles()).toEqual([]);
    expect(component.canAccess('view:reports', 'dashboard')).toBe(false);
  });

  it('logout() clears session and all access', () => {
    const { component } = createComponent();
    const admin = component.presetUsers.find((u) => u.label === 'Admin')!;
    component.loginAs(admin);
    expect(component.canAccess('view:reports', 'dashboard')).toBe(true);

    component.logout();
    expect(component.activeLabel()).toBeNull();
    expect(component.roles()).toEqual([]);
    expect(component.canAccess('view:reports', 'dashboard')).toBe(false);
  });

  it('truncateToken shortens tokens longer than 120 characters', () => {
    const { component } = createComponent();
    const long = 'a'.repeat(150);
    expect(component.truncateToken(long)).toHaveLength(121); // 120 + '…'
    expect(component.truncateToken(long).endsWith('…')).toBe(true);
  });

  it('truncateToken returns short tokens unchanged', () => {
    const { component } = createComponent();
    const short = 'abc.def.ghi';
    expect(component.truncateToken(short)).toBe(short);
  });
});
