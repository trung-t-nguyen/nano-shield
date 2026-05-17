import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PresetUser } from '../demo-data';

@Component({
  selector: 'app-user-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        1. Pick a user
      </h2>
      <div class="flex flex-col gap-2">
        @for (user of presetUsers(); track user.label) {
          <button
            (click)="userSelected.emit(user)"
            [class]="'flex items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition-all ' +
              (activeLabel() === user.label
                ? 'border-violet-500 bg-violet-50'
                : 'border-transparent bg-slate-50 hover:bg-slate-100')"
          >
            <span
              [class]="user.bg + ' text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0'"
            >
              {{ user.label[0] }}
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ user.label }}</p>
              <p class="text-xs text-slate-400 truncate">{{ user.description }}</p>
            </div>
          </button>
        }
      </div>
    </section>
  `,
})
export class UserPickerComponent {
  readonly presetUsers = input<PresetUser[]>([]);
  readonly activeLabel = input<string | null>(null);
  readonly userSelected = output<PresetUser>();
}
