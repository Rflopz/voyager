/**
 * Optional capability a BackgroundAnimation adapter may implement to expose
 * user-tunable parameters (e.g. speed). Kept as its own interface —
 * Interface Segregation — rather than adding optional methods onto
 * BackgroundAnimation itself: most future adapters won't need tunable
 * settings, and callers that do use isConfigurable() below to narrow
 * before touching these members. Only supports numeric range params for
 * now (YAGNI) but the shape can grow (e.g. a `type` discriminant) without
 * breaking existing adapters.
 */
export interface AnimationSettingParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface ConfigurableAnimation {
  getSettingsSchema(): AnimationSettingParam[];
  getSetting(key: string): number;
  setSetting(key: string, value: number): void;
}

export function isConfigurable(animation: unknown): animation is ConfigurableAnimation {
  const candidate = animation as Partial<ConfigurableAnimation> | null | undefined;
  return (
    !!candidate &&
    typeof candidate.getSettingsSchema === 'function' &&
    typeof candidate.getSetting === 'function' &&
    typeof candidate.setSetting === 'function'
  );
}
