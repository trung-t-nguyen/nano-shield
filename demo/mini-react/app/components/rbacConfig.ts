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
} as const;

export const moduleLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  billing: 'Billing',
};

export const quickActionGroups = [
  {
    module: 'dashboard',
    title: 'Dashboard',
    actions: [
      {
        feature: 'view:reports',
        label: 'View reports',
        className:
          'text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors',
      },
      {
        feature: 'edit:reports',
        label: 'Edit reports',
        className:
          'text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors',
      },
      {
        feature: 'export:data',
        label: 'Export data',
        className:
          'text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors',
      },
    ],
  },
  {
    module: 'settings',
    title: 'Settings',
    actions: [
      {
        feature: 'manage:users',
        label: 'Manage users',
        className:
          'text-sm px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors',
      },
      {
        feature: 'view:logs',
        label: 'View logs',
        className:
          'text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors',
      },
      {
        feature: 'edit:profile',
        label: 'Edit profile',
        className:
          'text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors',
      },
    ],
  },
  {
    module: 'billing',
    title: 'Billing',
    actions: [
      {
        feature: 'view:invoices',
        label: 'View invoices',
        className:
          'text-sm px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors',
      },
      {
        feature: 'manage:subscriptions',
        label: 'Manage subscriptions',
        className:
          'text-sm px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors',
      },
      {
        feature: 'view:billing',
        label: 'View billing',
        className:
          'text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors',
      },
    ],
  },
] as const;

export const featureMapRoles = [
  ...new Set(Object.values(featureMap).flatMap((features) => Object.values(features).flat())),
].sort();
