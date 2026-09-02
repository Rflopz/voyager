import type { AnimationSettingParam } from './settings';

/**
 * Reusable ConfigurableAnimation behavior for adapters that expose exactly
 * one tunable numeric parameter — the common case so far (a "Speed"
 * slider). Extracted because StarfieldAnimation and NebulaDriftAnimation
 * both hand-rolled the identical getSettingsSchema/getSetting/setSetting
 * trio for their one param; new single-parameter adapters should compose
 * this instead of copy-pasting that trio again.
 *
 * Adapters that ever need MORE than one tunable parameter (none do yet —
 * YAGNI) should not reach for this; implement the three
 * ConfigurableAnimation methods directly instead of fighting this shape.
 */
export class SingleNumericSetting {
  value: number;

  constructor(private readonly param: AnimationSettingParam) {
    this.value = param.defaultValue;
  }

  getSettingsSchema(): AnimationSettingParam[] {
    return [this.param];
  }

  getSetting(key: string): number {
    return key === this.param.key ? this.value : 0;
  }

  setSetting(key: string, value: number): void {
    if (key === this.param.key) this.value = value;
  }
}
