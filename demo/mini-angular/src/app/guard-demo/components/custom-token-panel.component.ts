import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-token-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <button
        (click)="openToggled.emit()"
        class="w-full flex items-center justify-between text-sm font-semibold text-slate-500 uppercase tracking-wider"
      >
        <span>2. Paste your JWT</span>
        <span class="text-slate-400">{{ open() ? '▲' : '▼' }}</span>
      </button>
      @if (open()) {
        <div class="mt-3 flex flex-col gap-2">
          <textarea
            [value]="inputValue()"
            (input)="inputChanged.emit($any($event.target).value)"
            placeholder="eyJhbGciOiJIUzI1NiJ9..."
            rows="4"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          ></textarea>
          <button
            (click)="applyToken()"
            class="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Apply token
          </button>
        </div>
      }
    </section>
  `,
})
export class CustomTokenPanelComponent {
  readonly open = input(false);
  readonly inputValue = input('');
  readonly openToggled = output<void>();
  readonly inputChanged = output<string>();
  readonly tokenApplied = output<string>();

  applyToken(): void {
    const t = this.inputValue().trim();
    if (t) this.tokenApplied.emit(t);
  }
}
