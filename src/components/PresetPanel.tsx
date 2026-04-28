import { presets, useSimStore } from '../store/simStore';

export function PresetPanel() {
  const applyPreset = useSimStore((state) => state.applyPreset);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Presets</h2>
        <p className="text-sm text-sky/70">Quick-load a baseline vehicle before fine-tuning sliders.</p>
      </div>
      <div className="grid gap-2">
        {Object.entries(presets).map(([key, preset]) => (
          <button
            key={key}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            onClick={() => applyPreset(key as keyof typeof presets)}
          >
            <div className="font-semibold text-white">{preset.label}</div>
            <div className="text-xs text-sky/60">
              {preset.params.thrust} N, {preset.params.initialMass} kg, {preset.params.launchAngleDeg} deg
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
