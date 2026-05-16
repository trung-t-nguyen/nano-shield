import { fireEvent, render, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import GuardDemo from './GuardDemo';

// All queries are scoped to `within(container)` — RTL auto-cleanup is not
// registered in this environment (globals: false), so document-wide queries
// would find elements from earlier tests.

function setup() {
  const { container } = render(<GuardDemo />);
  const q = within(container);
  const clickUser = (label: string) => fireEvent.click(q.getByText(label));
  return { container, q, clickUser };
}

// ── Initial state ─────────────────────────────────────────────────────────────
describe('GuardDemo — initial state', () => {
  it('shows "Not logged in" before any login', () => {
    const { q } = setup();
    expect(q.getByText('Not logged in')).toBeTruthy();
  });

  it('shows no quick-action buttons before login', () => {
    const { q } = setup();
    expect(q.queryByText('View reports')).toBeNull();
    expect(q.queryByText('Edit reports')).toBeNull();
    expect(q.queryByText('Manage users')).toBeNull();
    expect(q.queryByText('View invoices')).toBeNull();
    expect(q.queryByText('Edit profile')).toBeNull();
  });

  it('debug toggle starts as "debug: off"', () => {
    const { q } = setup();
    expect(q.getByText('debug: off')).toBeTruthy();
    expect(q.queryByText('debug: on')).toBeNull();
  });
});

// ── Admin ─────────────────────────────────────────────────────────────────────
describe('GuardDemo — Admin user', () => {
  it('shows active label and role badge after login', () => {
    const { q, clickUser } = setup();
    clickUser('Admin');
    // Scope to session section — "Admin" and "admin" also appear in picker / matrix
    const session = within(q.getByText('Current session').closest('section')!);
    expect(session.getByText('Admin')).toBeTruthy();
    expect(session.getByText('admin')).toBeTruthy();
  });

  it('shows all nine quick-action buttons', () => {
    const { q, clickUser } = setup();
    clickUser('Admin');
    expect(q.getByText('View reports')).toBeTruthy();
    expect(q.getByText('Edit reports')).toBeTruthy();
    expect(q.getByText('Export data')).toBeTruthy();
    expect(q.getByText('Manage users')).toBeTruthy();
    expect(q.getByText('View logs')).toBeTruthy();
    expect(q.getByText('Edit profile')).toBeTruthy();
    expect(q.getByText('View invoices')).toBeTruthy();
    expect(q.getByText('Manage subscriptions')).toBeTruthy();
    expect(q.getByText('View billing')).toBeTruthy();
  });
});

// ── Analyst ───────────────────────────────────────────────────────────────────
describe('GuardDemo — Analyst user', () => {
  it('shows analyst role badge', () => {
    const { q, clickUser } = setup();
    clickUser('Analyst');
    // "analyst" also appears in the access matrix role tags — scope to session
    const session = within(q.getByText('Current session').closest('section')!);
    expect(session.getByText('analyst')).toBeTruthy();
  });

  it('grants view:reports, export:data, view:logs, edit:profile, view:billing', () => {
    const { q, clickUser } = setup();
    clickUser('Analyst');
    expect(q.getByText('View reports')).toBeTruthy();
    expect(q.getByText('Export data')).toBeTruthy();
    expect(q.getByText('View logs')).toBeTruthy();
    expect(q.getByText('Edit profile')).toBeTruthy();
    expect(q.getByText('View billing')).toBeTruthy();
  });

  it('denies edit:reports, manage:users, view:invoices, manage:subscriptions', () => {
    const { q, clickUser } = setup();
    clickUser('Analyst');
    expect(q.queryByText('Edit reports')).toBeNull();
    expect(q.queryByText('Manage users')).toBeNull();
    expect(q.queryByText('View invoices')).toBeNull();
    expect(q.queryByText('Manage subscriptions')).toBeNull();
  });
});

// ── Viewer ────────────────────────────────────────────────────────────────────
describe('GuardDemo — Viewer user', () => {
  it('shows only edit:profile button', () => {
    const { q, clickUser } = setup();
    clickUser('Viewer');
    expect(q.getByText('Edit profile')).toBeTruthy();
    expect(q.queryByText('View reports')).toBeNull();
    expect(q.queryByText('Edit reports')).toBeNull();
    expect(q.queryByText('Export data')).toBeNull();
    expect(q.queryByText('Manage users')).toBeNull();
    expect(q.queryByText('View logs')).toBeNull();
    expect(q.queryByText('View invoices')).toBeNull();
    expect(q.queryByText('Manage subscriptions')).toBeNull();
    expect(q.queryByText('View billing')).toBeNull();
  });
});

// ── Billing Mgr ───────────────────────────────────────────────────────────────
describe('GuardDemo — Billing Mgr user', () => {
  it('grants view:invoices and view:billing', () => {
    const { q, clickUser } = setup();
    clickUser('Billing Mgr');
    expect(q.getByText('View invoices')).toBeTruthy();
    expect(q.getByText('View billing')).toBeTruthy();
  });

  it('denies manage:subscriptions (admin-only) and all dashboard/settings buttons', () => {
    const { q, clickUser } = setup();
    clickUser('Billing Mgr');
    expect(q.queryByText('Manage subscriptions')).toBeNull();
    expect(q.queryByText('View reports')).toBeNull();
    expect(q.queryByText('Manage users')).toBeNull();
  });
});

// ── Guest ─────────────────────────────────────────────────────────────────────
describe('GuardDemo — Guest user', () => {
  it('shows "no roles" badge and no quick-action buttons', () => {
    const { q, clickUser } = setup();
    clickUser('Guest');
    expect(q.getByText('no roles')).toBeTruthy();
    expect(q.queryByText('View reports')).toBeNull();
    expect(q.queryByText('Edit profile')).toBeNull();
    expect(q.queryByText('View invoices')).toBeNull();
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────
describe('GuardDemo — logout', () => {
  it('clears session and removes all action buttons', () => {
    const { q, clickUser } = setup();
    clickUser('Admin');
    expect(q.getByText('View reports')).toBeTruthy();

    fireEvent.click(q.getByText('logout (clear())'));

    // Session panel reverts — scope to avoid "admin" in the matrix role tags
    const session = within(q.getByText('Current session').closest('section')!);
    expect(session.getByText('Not logged in')).toBeTruthy();
    expect(session.queryByText('admin')).toBeNull();
    // Action buttons are removed from the DOM
    expect(q.queryByText('View reports')).toBeNull();
    expect(q.queryByText('Manage users')).toBeNull();
  });
});

// ── Debug toggle ──────────────────────────────────────────────────────────────
describe('GuardDemo — debug toggle', () => {
  it('switches label to "debug: on" and shows console hint', () => {
    const { q } = setup();
    fireEvent.click(q.getByText('debug: off'));
    expect(q.getByText('debug: on')).toBeTruthy();
    expect(q.getByText('↳ check console')).toBeTruthy();
  });

  it('switches back to "debug: off" on second click', () => {
    const { q } = setup();
    fireEvent.click(q.getByText('debug: off'));
    fireEvent.click(q.getByText('debug: on'));
    expect(q.getByText('debug: off')).toBeTruthy();
    expect(q.queryByText('↳ check console')).toBeNull();
  });

  it('preserves active session across debug toggle', () => {
    const { q, clickUser } = setup();
    clickUser('Admin');
    expect(q.getByText('View reports')).toBeTruthy();

    fireEvent.click(q.getByText('debug: off'));

    expect(q.getByText('debug: on')).toBeTruthy();
    // Action buttons survive the remount
    expect(q.getByText('View reports')).toBeTruthy();
    // Session panel still shows Admin — scope to avoid picker label collision
    const session = within(q.getByText('Current session').closest('section')!);
    expect(session.getByText('Admin')).toBeTruthy();
  });
});

// ── Custom JWT ────────────────────────────────────────────────────────────────
describe('GuardDemo — custom JWT', () => {
  it('expands the panel when "2. Paste your JWT" is clicked', () => {
    const { q } = setup();
    expect(q.queryByPlaceholderText('eyJhbGciOiJIUzI1NiJ9...')).toBeNull();
    fireEvent.click(q.getByText('2. Paste your JWT'));
    expect(q.getByPlaceholderText('eyJhbGciOiJIUzI1NiJ9...')).toBeTruthy();
  });

  it('collapses the panel on second click', () => {
    const { q } = setup();
    fireEvent.click(q.getByText('2. Paste your JWT'));
    fireEvent.click(q.getByText('2. Paste your JWT'));
    expect(q.queryByPlaceholderText('eyJhbGciOiJIUzI1NiJ9...')).toBeNull();
  });

  it('applying a valid JWT sets active label to "Custom" and grants access', () => {
    // Build a minimal unsigned JWT with admin role
    const b64url = (o: object) =>
      btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ roles: ['admin'], exp: 9_999_999_999 })}.sig`;

    const { q } = setup();
    fireEvent.click(q.getByText('2. Paste your JWT'));
    fireEvent.change(q.getByPlaceholderText('eyJhbGciOiJIUzI1NiJ9...'), {
      target: { value: token },
    });
    fireEvent.click(q.getByText('Apply token'));

    expect(q.getByText('Custom')).toBeTruthy();
    expect(q.getByText('View reports')).toBeTruthy();
    expect(q.getByText('Manage users')).toBeTruthy();
  });

  it('ignores "Apply token" when input is empty', () => {
    const { q } = setup();
    fireEvent.click(q.getByText('2. Paste your JWT'));
    fireEvent.click(q.getByText('Apply token'));
    expect(q.getByText('Not logged in')).toBeTruthy();
  });
});
