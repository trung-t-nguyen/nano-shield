import { fireEvent, render, renderHook, act, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { MiniGuard } from '../src/index.js';
import { Guard, MiniGuardProvider, useMiniGuard } from '../src/react.js';
import { makeJwt, futureExp } from './helpers.js';

const featureMap = {
  dashboard: { view: ['admin', 'analyst'], export: ['admin'] },
  settings: { edit: ['admin'] },
};

const adminToken = makeJwt({ roles: ['admin'], exp: futureExp() });
const analystToken = makeJwt({ roles: ['analyst'], exp: futureExp() });

describe('useMiniGuard (standalone)', () => {
  it('throws when called with no args and no provider', () => {
    expect(() => renderHook(() => useMiniGuard())).toThrow(
      '[MiniGuard] useMiniGuard: pass featureMap or wrap with MiniGuardProvider',
    );
  });

  it('denies access before init', () => {
    const { result } = renderHook(() => useMiniGuard(featureMap, { defaultModule: 'dashboard' }));
    expect(result.current.canAccess('view')).toBe(false);
  });

  it('grants access after init with matching role', () => {
    const { result } = renderHook(() => useMiniGuard(featureMap, { defaultModule: 'dashboard' }));
    act(() => result.current.init(adminToken));
    expect(result.current.canAccess('view')).toBe(true);
    expect(result.current.canAccess('export')).toBe(true);
  });

  it('denies access for features not in role', () => {
    const { result } = renderHook(() => useMiniGuard(featureMap, { defaultModule: 'dashboard' }));
    act(() => result.current.init(analystToken));
    expect(result.current.canAccess('view')).toBe(true);
    expect(result.current.canAccess('export')).toBe(false);
  });

  it('revokes access after clear', () => {
    const { result } = renderHook(() => useMiniGuard(featureMap, { defaultModule: 'dashboard' }));
    act(() => result.current.init(adminToken));
    expect(result.current.canAccess('view')).toBe(true);
    act(() => result.current.clear());
    expect(result.current.canAccess('view')).toBe(false);
  });

  it('supports explicit module', () => {
    const { result } = renderHook(() => useMiniGuard(featureMap));
    act(() => result.current.init(adminToken));
    expect(result.current.canAccess('edit', 'settings')).toBe(true);
    expect(result.current.canAccess('edit', 'dashboard')).toBe(false);
  });
});

describe('useMiniGuard (via MiniGuardProvider)', () => {
  it('consumes guard from context', () => {
    const guard = new MiniGuard(featureMap, { defaultModule: 'dashboard' });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MiniGuardProvider guard={guard}>{children}</MiniGuardProvider>
    );
    const { result } = renderHook(() => useMiniGuard(), { wrapper });

    act(() => result.current.init(adminToken));
    expect(result.current.canAccess('export')).toBe(true);

    act(() => result.current.clear());
    expect(result.current.canAccess('export')).toBe(false);
  });

  it('two hooks sharing the same provider guard see same state', () => {
    const guard = new MiniGuard(featureMap, { defaultModule: 'dashboard' });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MiniGuardProvider guard={guard}>{children}</MiniGuardProvider>
    );
    const { result: r1 } = renderHook(() => useMiniGuard(), { wrapper });
    const { result: r2 } = renderHook(() => useMiniGuard(), { wrapper });

    act(() => r1.current.init(adminToken));
    // r2 reads from the same guard instance — canAccess reflects current state
    expect(r2.current.canAccess('view')).toBe(true);
  });
});

describe('useMiniGuard — instance', () => {
  it('returns the underlying MiniGuard instance', () => {
    const { result } = renderHook(() => useMiniGuard(featureMap, { defaultModule: 'dashboard' }));
    expect(result.current.instance).toBeInstanceOf(MiniGuard);
  });

  it('instance is stable across re-renders', () => {
    const { result, rerender } = renderHook(() =>
      useMiniGuard(featureMap, { defaultModule: 'dashboard' }),
    );
    const first = result.current.instance;
    rerender();
    expect(result.current.instance).toBe(first);
  });

  it('instance from provider matches the guard passed in', () => {
    const guard = new MiniGuard(featureMap, { defaultModule: 'dashboard' });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MiniGuardProvider guard={guard}>{children}</MiniGuardProvider>
    );
    const { result } = renderHook(() => useMiniGuard(), { wrapper });
    expect(result.current.instance).toBe(guard);
  });
});

describe('Guard', () => {
  it('renders fallback when there is no MiniGuardProvider', () => {
    const { container } = render(
      <Guard feature="view" module="dashboard" fallback={<span>no access</span>}>
        <span>secret</span>
      </Guard>,
    );
    expect(within(container).queryByText('secret')).toBeNull();
    expect(within(container).queryByText('no access')).not.toBeNull();
  });

  it('renders nothing (no fallback) when there is no provider and fallback is omitted', () => {
    const { container } = render(
      <Guard feature="view" module="dashboard">
        <span>secret</span>
      </Guard>,
    );
    expect(container.textContent).toBe('');
  });

  it('renders children when access is granted', () => {
    const guard = new MiniGuard(featureMap, { defaultModule: 'dashboard' });
    guard.init(adminToken);
    const { container } = render(
      <MiniGuardProvider guard={guard}>
        <Guard feature="view" module="dashboard">
          <span>allowed</span>
        </Guard>
      </MiniGuardProvider>,
    );
    expect(within(container).queryByText('allowed')).not.toBeNull();
  });

  it('renders fallback when access is denied', () => {
    const guard = new MiniGuard(featureMap, { defaultModule: 'dashboard' });
    guard.init(analystToken);
    const { container } = render(
      <MiniGuardProvider guard={guard}>
        <Guard feature="export" module="dashboard" fallback={<span>locked</span>}>
          <span>allowed</span>
        </Guard>
      </MiniGuardProvider>,
    );
    expect(within(container).queryByText('allowed')).toBeNull();
    expect(within(container).queryByText('locked')).not.toBeNull();
  });

  it('reflects updated access after init via useMiniGuard', () => {
    function Fixture() {
      const { init, instance } = useMiniGuard(featureMap, { defaultModule: 'dashboard' });
      return (
        <MiniGuardProvider guard={instance}>
          <button onClick={() => init(adminToken)}>login</button>
          <Guard feature="export" module="dashboard">
            <span>export button</span>
          </Guard>
        </MiniGuardProvider>
      );
    }
    const { container } = render(<Fixture />);
    expect(within(container).queryByText('export button')).toBeNull();
    fireEvent.click(within(container).getByText('login'));
    expect(within(container).queryByText('export button')).not.toBeNull();
  });

  it('hides children after clear via useMiniGuard', () => {
    function Fixture() {
      const { init, clear, instance } = useMiniGuard(featureMap, { defaultModule: 'dashboard' });
      return (
        <MiniGuardProvider guard={instance}>
          <button onClick={() => init(adminToken)}>login</button>
          <button onClick={() => clear()}>logout</button>
          <Guard feature="view" module="dashboard">
            <span>view button</span>
          </Guard>
        </MiniGuardProvider>
      );
    }
    const { container } = render(<Fixture />);
    fireEvent.click(within(container).getByText('login'));
    expect(within(container).queryByText('view button')).not.toBeNull();
    fireEvent.click(within(container).getByText('logout'));
    expect(within(container).queryByText('view button')).toBeNull();
  });

  it('Guard re-renders when sibling useMiniGuard calls init inside the same provider', () => {
    const guard = new MiniGuard(featureMap, { defaultModule: 'dashboard' });
    function LoginButton() {
      const { init } = useMiniGuard();
      return <button onClick={() => init(adminToken)}>login</button>;
    }
    const { container } = render(
      <MiniGuardProvider guard={guard}>
        <LoginButton />
        <Guard feature="export" module="dashboard">
          <span>export button</span>
        </Guard>
      </MiniGuardProvider>,
    );
    expect(within(container).queryByText('export button')).toBeNull();
    fireEvent.click(within(container).getByText('login'));
    expect(within(container).queryByText('export button')).not.toBeNull();
  });
});
