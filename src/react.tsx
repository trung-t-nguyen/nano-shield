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
      const result = instance.init(token);
      setRev((r) => r + 1);
      notifyRef.current?.();
      return result;
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
  const canAccess = useCallback((feature: string, mod?: string) => instance.canAccess(feature, mod), [instance, rev]);

  const getRoles = useCallback(() => instance.getRoles(), [instance, rev]);
  const getTokenPayload = useCallback(() => instance.getTokenPayload(), [instance, rev]);

  return { init, clear, canAccess, getRoles, getTokenPayload, instance };
}

export function Guard({
  feature,
  module,
  children,
  fallback = null,
}: {
  feature: string;
  module?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const ctx = useContext(MiniGuardCtx);
  const show = ctx?.guard.canAccess(feature, module) ?? false;
  return <>{show ? children : fallback}</>;
}
