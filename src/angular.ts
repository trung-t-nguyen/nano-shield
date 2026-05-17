import { Directive, type DoCheck, Injectable, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { MiniGuard } from './index.js';
import type { FeatureMap, JwtPayload, GuardContext, MiniGuardOptions } from './types.js';

@Injectable({ providedIn: 'root' })
export class MiniGuardService {
  private _guard: MiniGuard | null = null;

  configure(featureMap: FeatureMap, options?: MiniGuardOptions, token?: string): GuardContext | undefined {
    this._guard = new MiniGuard(featureMap, options);
    if (token) return this._guard.init(token);
    return undefined;
  }

  init(token: string): GuardContext | undefined {
    if (!this._guard) {
      console.warn('[MiniGuard] call configure() before init()');
      return;
    }
    return this._guard.init(token);
  }

  clear(): void {
    if (!this._guard) {
      console.warn('[MiniGuard] call configure() before clear()');
      return;
    }
    this._guard.clear();
  }

  canAccess(feature: string, mod?: string): boolean {
    return this._guard?.canAccess(feature, mod) ?? false;
  }

  getRoles(): string[] {
    return this._guard?.getRoles() ?? [];
  }

  getTokenPayload(): JwtPayload | null {
    return this._guard?.getTokenPayload() ?? null;
  }
}

@Directive({ selector: '[miniGuard]', standalone: true })
export class MiniGuardDirective implements DoCheck {
  @Input({ required: true }) miniGuard!: string;
  @Input() miniGuardModule?: string;

  // inject() avoids constructor-injection metadata (no emitDecoratorMetadata needed)
  private readonly svc = inject(MiniGuardService);
  private readonly tpl = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);

  ngDoCheck(): void {
    const hasAccess = this.svc.canAccess(this.miniGuard, this.miniGuardModule);
    if (hasAccess && this.vcr.length === 0) {
      this.vcr.createEmbeddedView(this.tpl);
    } else if (!hasAccess && this.vcr.length > 0) {
      this.vcr.clear();
    }
  }
}
