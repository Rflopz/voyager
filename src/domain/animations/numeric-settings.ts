import type { AnimationSettingParam } from './settings';

/**
 * Reusable ConfigurableAnimation building block for adapters exposing N
 * tunable numeric parameters — anywhere from a single "Speed" slider
 * (StarfieldAnimation, NebulaDriftAnimation) to a multi-slider panel
 * (BlackholeAnimation's meteor speed/density + dust/grain levels).
 * Adapters implement ConfigurableAnimation by forwarding its three
 * methods to an instance of this class, then read tunable values with
 * getSetting(key) inside their render loop.
 */
export class NumericSettings {
  private readonly values: Map<string, number>;

  constructor(private readonly params: readonly AnimationSettingParam[]) {
    this.values = new Map(params.map((param) => [param.key, param.defaultValue]));
  }

  getSettingsSchema(): AnimationSettingParam[] {
    return [...this.params];
  }

  getSetting(key: string): number {
    return this.values.get(key) ?? 0;
  }

  setSetting(key: string, value: number): void {
    if (this.values.has(key)) this.values.set(key, value);
  }
}
