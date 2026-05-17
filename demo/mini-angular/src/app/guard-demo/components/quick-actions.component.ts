import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MiniGuardDirective } from 'mini-guard/angular';

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule, MiniGuardDirective],
  template: `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">*miniGuard</span>
        <h2 class="text-sm font-semibold text-slate-700">Quick actions</h2>
      </div>
      <p class="text-xs text-slate-400 mb-4">
        Each button is rendered by the structural directive — only accessible ones appear in the DOM
      </p>

      @if (tick() >= 0 && roles().length === 0) {
        <p class="text-sm text-slate-400 italic">Log in to see available actions</p>
      }

      <div class="flex flex-col gap-4">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dashboard</p>
          <div class="flex flex-wrap gap-2">
            <button *miniGuard="'view:reports'; module: 'dashboard'"
              class="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors">
              View reports
            </button>
            <button *miniGuard="'edit:reports'; module: 'dashboard'"
              class="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Edit reports
            </button>
            <button *miniGuard="'export:data'; module: 'dashboard'"
              class="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
              Export data
            </button>
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Settings</p>
          <div class="flex flex-wrap gap-2">
            <button *miniGuard="'manage:users'; module: 'settings'"
              class="text-sm px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors">
              Manage users
            </button>
            <button *miniGuard="'view:logs'; module: 'settings'"
              class="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors">
              View logs
            </button>
            <button *miniGuard="'edit:profile'; module: 'settings'"
              class="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors">
              Edit profile
            </button>
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billing</p>
          <div class="flex flex-wrap gap-2">
            <button *miniGuard="'view:invoices'; module: 'billing'"
              class="text-sm px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">
              View invoices
            </button>
            <button *miniGuard="'manage:subscriptions'; module: 'billing'"
              class="text-sm px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">
              Manage subscriptions
            </button>
            <button *miniGuard="'view:billing'; module: 'billing'"
              class="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors">
              View billing
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class QuickActionsComponent {
  readonly roles = input<string[]>([]);
  readonly tick = input(0);
}
