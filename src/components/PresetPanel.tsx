import { presets } from '../config/simDefaults';
import { useSimStore } from '../store/simStore';

export function PresetPanel() {
  const applyPreset = useSimStore((state) => state.applyPreset);
  const selectedPreset = useSimStore((state) => state.selectedPreset);
  const isDirty = useSimStore((state) => state.isDirty);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Presets</h2>
        <p className="text-sm text-sky/70">Quick-load a baseline vehicle before fine-tuning the mission profile.</p>
      </div>
      <div className="grid gap-2">
        {Object.entries(presets).map(([key, preset]) => (
          <PresetButton
            key={key}
            active={selectedPreset === key && !isDirty}
            label={preset.label}
            meta={`${preset.params.thrust} N, ${preset.params.initialMass} kg, ${preset.params.launchAngleDeg} deg`}
            onClick={() => applyPreset(key as keyof typeof presets)}
          />
        ))}
      </div>
    </section>
  );
}

function PresetButton({
  active,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        'rounded-[1.35rem] border px-4 py-3 text-left transition',
        active
          ? 'border-sky-300/35 bg-sky-300/12 shadow-lg shadow-sky-950/20'
          : 'border-white/10 bg-white/5 hover:bg-white/10',
      ].join(' ')}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="font-semibold text-white">{label}</div>
        {active ? <span className="text-[10px] uppercase tracking-[0.25em] text-sky-100">Loaded</span> : null}
      </div>
      <div className="mt-1 text-xs text-sky/60">{meta}</div>
    </button>
  );
}
