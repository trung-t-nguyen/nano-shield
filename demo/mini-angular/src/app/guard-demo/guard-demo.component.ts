import { Component, OnInit, inject, signal } from '@angular/core';
import { MiniGuardService } from 'mini-guard/angular';
import { featureMap, PRESET_USERS, MODULE_GROUPS, decodePayload, PresetUser } from './demo-data';
import { UserPickerComponent } from './components/user-picker.component';
import { CustomTokenPanelComponent } from './components/custom-token-panel.component';
import { SessionInfoComponent } from './components/session-info.component';
import { AccessMatrixComponent } from './components/access-matrix.component';
import { QuickActionsComponent } from './components/quick-actions.component';

export type { PresetUser, FeatureRow, ModuleGroup } from './demo-data';

@Component({
  selector: 'app-guard-demo',
  standalone: true,
  imports: [
    UserPickerComponent,
    CustomTokenPanelComponent,
    SessionInfoComponent,
    AccessMatrixComponent,
    QuickActionsComponent,
  ],
  templateUrl: './guard-demo.component.html',
})
export class GuardDemoComponent implements OnInit {
  private readonly miniGuard = inject(MiniGuardService);

  ngOnInit(): void {
    this.miniGuard.configure(featureMap, { defaultModule: 'dashboard', debug: this.debugMode() });
  }

  readonly presetUsers = PRESET_USERS;
  readonly moduleGroups = MODULE_GROUPS;

  activeLabel = signal<string | null>(null);
  roles = signal<string[]>([]);
  tokenPreview = signal<string | null>(null);
  customInput = signal('');
  customOpen = signal(false);
  debugMode = signal(false);
  tick = signal(0);

  canAccess(feat: string, mod: string): boolean {
    void this.tick();
    return this.miniGuard.canAccess(feat, mod);
  }

  applyToken(token: string | null): void {
    if (token) {
      this.miniGuard.init(token);
      const payload = decodePayload(token);
      const raw = payload?.['roles'];
      this.roles.set(Array.isArray(raw) ? raw.filter((r): r is string => typeof r === 'string') : []);
      this.tokenPreview.set(token);
    } else {
      this.miniGuard.clear();
      this.roles.set([]);
      this.tokenPreview.set(null);
    }
    this.tick.update((t) => t + 1);
  }

  loginAs(user: PresetUser): void {
    this.applyToken(user.token);
    this.activeLabel.set(user.label);
    this.customOpen.set(false);
  }

  loginCustom(token: string): void {
    this.applyToken(token);
    this.activeLabel.set('Custom');
    this.customOpen.set(false);
  }

  logout(): void {
    this.miniGuard.clear();
    this.roles.set([]);
    this.tokenPreview.set(null);
    this.activeLabel.set(null);
    this.tick.update((t) => t + 1);
  }

  toggleCustomOpen(): void {
    this.customOpen.update((o) => !o);
  }

  toggleDebug(): void {
    this.debugMode.update((d) => !d);
    this.miniGuard.configure(featureMap, { defaultModule: 'dashboard', debug: this.debugMode() });
    const token = this.tokenPreview();
    if (token) this.miniGuard.init(token);
    this.tick.update((t) => t + 1);
  }

  truncateToken(token: string): string {
    return token.length > 120 ? token.slice(0, 120) + '…' : token;
  }

  codeSnippet(): string {
    return `import { MiniGuardService, MiniGuardDirective } from 'mini-guard/angular';

// AppComponent — configure once after login
constructor(private miniGuard: MiniGuardService) {}

ngOnInit() {
  this.miniGuard.configure(featureMap, { defaultModule: 'dashboard' });
  this.miniGuard.init(rawJwtToken);
}

// Programmatic check
this.miniGuard.canAccess('view:reports')              // → ${this.miniGuard.canAccess('view:reports')}
this.miniGuard.canAccess('edit:reports')              // → ${this.miniGuard.canAccess('edit:reports')}
this.miniGuard.canAccess('manage:users', 'settings')  // → ${this.miniGuard.canAccess('manage:users', 'settings')}
this.miniGuard.clear();  // on logout

// Template — structural directive
// <button *miniGuard="'export:data'">Export</button>
// <a *miniGuard="'manage:users'; module: 'settings'">Admin</a>`;
  }
}
