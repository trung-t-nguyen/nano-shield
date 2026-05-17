'use client';

import { Guard } from 'mini-guard/react';
import { useMemo } from 'react';
import { featureMap, moduleLabels, quickActionGroups } from './rbacConfig';

interface AccessMatrixPanelProps {
  canAccess: (feature: string, module?: string) => boolean;
  roles: string[];
  emptyMessage?: string;
}

export function AccessMatrixPanel({
  canAccess,
  roles,
  emptyMessage,
}: AccessMatrixPanelProps) {
  const allEntries = useMemo(() => Object.entries(featureMap), []);
  const roleSet = useMemo(() => new Set(roles), [roles]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
          useMiniGuard
        </span>
        <h2 className="text-sm font-semibold text-slate-700">Programmatic access matrix</h2>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Live result of{' '}
        <code className="bg-slate-100 px-1 rounded">canAccess(feature, module)</code>
      </p>

      {emptyMessage && <p className="text-sm text-slate-400 italic mb-4">{emptyMessage}</p>}

      <div className="flex flex-col gap-6">
        {allEntries.map(([mod, features]) => (
          <div key={mod}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <span className="w-px h-4 bg-slate-300 inline-block" />
              {moduleLabels[mod] ?? mod}
            </h3>
            <div className="flex flex-col gap-1.5">
              {Object.entries(features).map(([feat, allowedRoles]) => {
                const allowed = canAccess(feat, mod);
                return (
                  <div
                    key={feat}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
                      allowed ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          allowed ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'
                        }`}
                      >
                        {allowed ? '✓' : '✕'}
                      </span>
                      <code className="text-sm font-mono text-slate-700 truncate">{feat}</code>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end ml-2">
                      {allowedRoles.map((r) => (
                        <span
                          key={r}
                          className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                            roleSet.has(r)
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
  );
}

interface QuickActionsPanelProps {
  emptyMessage?: string;
}

export function QuickActionsPanel({ emptyMessage }: QuickActionsPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
          &lt;Guard&gt;
        </span>
        <h2 className="text-sm font-semibold text-slate-700">Quick actions</h2>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Buttons are conditionally rendered - only accessible ones appear in the DOM
      </p>

      {emptyMessage && <p className="text-sm text-slate-400 italic mb-4">{emptyMessage}</p>}

      <div className="flex flex-col gap-4">
        {quickActionGroups.map((group) => (
          <div key={group.module}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.actions.map((action) => (
                <Guard key={`${group.module}:${action.feature}`} feature={action.feature} module={group.module}>
                  <button className={action.className}>{action.label}</button>
                </Guard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
