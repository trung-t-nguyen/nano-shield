import { Component, provideExperimentalZonelessChangeDetection, signal } from '@angular/core';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  teardown: { destroyAfterEach: true },
});
import { MiniGuardService, MiniGuardDirective } from '../src/angular.js';
import { makeJwt, futureExp, pastExp } from './helpers.js';

const featureMap = {
  dashboard: { view: ['admin', 'analyst'], export: ['admin'] },
  settings: { edit: ['admin'] },
};

const adminToken = makeJwt({ roles: ['admin'], exp: futureExp() });
const analystToken = makeJwt({ roles: ['analyst'], exp: futureExp() });
const expiredToken = makeJwt({ roles: ['admin'], exp: pastExp() });

describe('MiniGuardService', () => {
  let svc: MiniGuardService;

  beforeEach(() => {
    svc = new MiniGuardService();
  });

  it('denies access before configure', () => {
    expect(svc.canAccess('view', 'dashboard')).toBe(false);
  });

  it('warns and no-ops when init() called before configure()', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    svc.init(adminToken);
    expect(warn).toHaveBeenCalledWith('[MiniGuard] call configure() before init()');
    expect(svc.canAccess('view', 'dashboard')).toBe(false);
    warn.mockRestore();
  });

  it('warns and no-ops when clear() called before configure()', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    svc.clear();
    expect(warn).toHaveBeenCalledWith('[MiniGuard] call configure() before clear()');
    warn.mockRestore();
  });

  it('denies access after configure but before init', () => {
    svc.configure(featureMap, { defaultModule: 'dashboard' });
    expect(svc.canAccess('view')).toBe(false);
  });

  it('grants access after init with matching role', () => {
    svc.configure(featureMap, { defaultModule: 'dashboard' });
    svc.init(adminToken);
    expect(svc.canAccess('view')).toBe(true);
    expect(svc.canAccess('export')).toBe(true);
  });

  it('denies access for features outside role', () => {
    svc.configure(featureMap, { defaultModule: 'dashboard' });
    svc.init(analystToken);
    expect(svc.canAccess('view')).toBe(true);
    expect(svc.canAccess('export')).toBe(false);
  });

  it('supports explicit module override', () => {
    svc.configure(featureMap);
    svc.init(adminToken);
    expect(svc.canAccess('edit', 'settings')).toBe(true);
    expect(svc.canAccess('edit', 'dashboard')).toBe(false);
  });

  it('revokes access after clear', () => {
    svc.configure(featureMap, { defaultModule: 'dashboard' });
    svc.init(adminToken);
    expect(svc.canAccess('view')).toBe(true);
    svc.clear();
    expect(svc.canAccess('view')).toBe(false);
  });

  it('denies access with expired token', () => {
    svc.configure(featureMap, { defaultModule: 'dashboard' });
    svc.init(expiredToken);
    expect(svc.canAccess('view')).toBe(false);
  });

  it('replaces state on re-init', () => {
    svc.configure(featureMap, { defaultModule: 'dashboard' });
    svc.init(adminToken);
    expect(svc.canAccess('export')).toBe(true);
    svc.init(analystToken);
    expect(svc.canAccess('export')).toBe(false);
    expect(svc.canAccess('view')).toBe(true);
  });

  it('configure() with token initialises in one call', () => {
    svc.configure(featureMap, { defaultModule: 'dashboard' }, adminToken);
    expect(svc.canAccess('view')).toBe(true);
    expect(svc.canAccess('export')).toBe(true);
  });

  it('re-configure with token swaps feature map and restores access without a separate init()', () => {
    svc.configure(featureMap, { defaultModule: 'dashboard' }, adminToken);
    expect(svc.canAccess('export')).toBe(true);
    const newToken = makeJwt({ roles: ['viewer'], exp: futureExp() });
    svc.configure({ dashboard: { view: ['viewer'] } }, { defaultModule: 'dashboard' }, newToken);
    expect(svc.canAccess('view')).toBe(true);
    expect(svc.canAccess('export')).toBe(false);
  });

  it('re-configure replaces the guard instance', () => {
    svc.configure(featureMap, { defaultModule: 'dashboard' });
    svc.init(adminToken);
    svc.configure({ dashboard: { view: ['viewer'] } }, { defaultModule: 'dashboard' });
    svc.init(makeJwt({ roles: ['viewer'], exp: futureExp() }));
    expect(svc.canAccess('view')).toBe(true);
    expect(svc.canAccess('export')).toBe(false);
  });
});

// ── MiniGuardDirective ────────────────────────────────────────────────────────

@Component({
  selector: 'app-test-host',
  template: `
    @if (tick()) {}
    <button *miniGuard="'view'; module: 'dashboard'" id="view">View</button>
    <button *miniGuard="'export'; module: 'dashboard'" id="export">Export</button>
    <button *miniGuard="'edit'; module: 'settings'" id="edit">Edit</button>
  `,
  imports: [MiniGuardDirective],
  standalone: true,
})
class TestHost {
  readonly tick = signal(0);
  bump() {
    this.tick.update((t) => t + 1);
  }
}

describe('MiniGuardDirective', () => {
  let svc: MiniGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [provideExperimentalZonelessChangeDetection()],
    });
    svc = TestBed.inject(MiniGuardService);
    svc.configure(featureMap);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function render() {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    return fixture;
  }

  it('hides all guarded elements before init', () => {
    const { nativeElement } = render();
    expect(nativeElement.querySelector('#view')).toBeNull();
    expect(nativeElement.querySelector('#export')).toBeNull();
    expect(nativeElement.querySelector('#edit')).toBeNull();
  });

  it('shows only allowed elements for analyst role', () => {
    svc.init(analystToken);
    const { nativeElement } = render();
    expect(nativeElement.querySelector('#view')).not.toBeNull();
    expect(nativeElement.querySelector('#export')).toBeNull();
    expect(nativeElement.querySelector('#edit')).toBeNull();
  });

  it('shows all allowed elements for admin role', () => {
    svc.init(adminToken);
    const { nativeElement } = render();
    expect(nativeElement.querySelector('#view')).not.toBeNull();
    expect(nativeElement.querySelector('#export')).not.toBeNull();
    expect(nativeElement.querySelector('#edit')).not.toBeNull();
  });

  it('hides elements after clear()', () => {
    svc.init(adminToken);
    const fixture = render();
    expect(fixture.nativeElement.querySelector('#view')).not.toBeNull();

    svc.clear();
    fixture.componentInstance.bump();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#view')).toBeNull();
    expect(fixture.nativeElement.querySelector('#export')).toBeNull();
  });

  it('shows elements after login on already-rendered view', () => {
    const fixture = render();
    expect(fixture.nativeElement.querySelector('#view')).toBeNull();

    svc.init(analystToken);
    fixture.componentInstance.bump();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#view')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#export')).toBeNull();
  });

  it('hides all guarded elements for expired token', () => {
    svc.init(expiredToken);
    const { nativeElement } = render();
    expect(nativeElement.querySelector('#view')).toBeNull();
    expect(nativeElement.querySelector('#export')).toBeNull();
  });
});
