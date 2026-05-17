'use client';

import { ReactNode } from 'react';

interface DemoHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  actionsClassName?: string;
}

export function DemoHeader({
  title,
  subtitle,
  actions,
  actionsClassName = 'ml-auto flex items-center gap-2',
}: DemoHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
      <span className="text-2xl">🛡️</span>
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {actions && <div className={actionsClassName}>{actions}</div>}
    </header>
  );
}
