import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-session-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Current session
      </h2>
      @if (activeLabel()) {
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500">User:</span>
            <span class="text-sm font-semibold">{{ activeLabel() }}</span>
          </div>
          <div class="flex flex-wrap gap-1">
            @if (roles().length > 0) {
              @for (role of roles(); track role) {
                <span class="bg-violet-100 text-violet-800 text-xs font-mono px-2 py-0.5 rounded-full">
                  {{ role }}
                </span>
              }
            } @else {
              <span class="text-xs text-slate-400 italic">no roles</span>
            }
          </div>
          @if (tokenPreview()) {
            <div class="mt-1">
              <p class="text-xs text-slate-400 mb-1">JWT (truncated)</p>
              <p class="text-xs font-mono text-slate-600 bg-slate-50 rounded p-2 break-all line-clamp-3">
                {{ truncate(tokenPreview()!) }}
              </p>
            </div>
          }
          <button
            (click)="loggedOut.emit()"
            class="mt-1 text-xs text-red-500 hover:text-red-700 text-left transition-colors"
          >
            logout (miniGuard.clear())
          </button>
        </div>
      } @else {
        <p class="text-sm text-slate-400 italic">Not logged in</p>
      }
    </section>
  `,
})
export class SessionInfoComponent {
  readonly activeLabel = input<string | null>(null);
  readonly roles = input<string[]>([]);
  readonly tokenPreview = input<string | null>(null);
  readonly loggedOut = output<void>();

  truncate(token: string): string {
    return token.length > 120 ? token.slice(0, 120) + '…' : token;
  }
}
