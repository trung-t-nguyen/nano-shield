import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MiniGuardService } from 'mini-guard/angular';
import { ModuleGroup } from '../demo-data';

@Component({
  selector: 'app-access-matrix',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">MiniGuardService</span>
        <h2 class="text-sm font-semibold text-slate-700">Programmatic access matrix</h2>
      </div>
      <p class="text-xs text-slate-400 mb-4">
        Live result of <code class="bg-slate-100 px-1 rounded">miniGuard.canAccess(feature, module)</code>
      </p>

      <div class="flex flex-col gap-6">
        @for (group of moduleGroups(); track group.mod) {
          <div>
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <span class="w-px h-4 bg-slate-300 inline-block"></span>
              {{ group.label }}
            </h3>
            <div class="flex flex-col gap-1.5">
              @for (row of group.features; track row.feat) {
                <div
                  [class]="'flex items-center justify-between rounded-lg px-3 py-2.5 border ' +
                    (canAccess(row.feat, row.mod)
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200')"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      [class]="'shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ' +
                        (canAccess(row.feat, row.mod)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-300 text-white')"
                    >
                      {{ canAccess(row.feat, row.mod) ? '✓' : '✕' }}
                    </span>
                    <code class="text-sm font-mono text-slate-700 truncate">{{ row.feat }}</code>
                  </div>
                  <div class="flex gap-1 flex-wrap justify-end ml-2">
                    @for (r of row.allowedRoles; track r) {
                      <span
                        [class]="'text-xs font-mono px-1.5 py-0.5 rounded ' +
                          (roles().includes(r)
                            ? 'bg-emerald-200 text-emerald-900 font-bold'
                            : 'bg-slate-100 text-slate-500')"
                      >
                        {{ r }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AccessMatrixComponent {
  private readonly miniGuard = inject(MiniGuardService);

  readonly moduleGroups = input<ModuleGroup[]>([]);
  readonly roles = input<string[]>([]);
  readonly tick = input(0);

  canAccess(feat: string, mod: string): boolean {
    void this.tick(); // read tick to create reactive dependency, forcing re-render on auth changes
    return this.miniGuard.canAccess(feat, mod);
  }
}
