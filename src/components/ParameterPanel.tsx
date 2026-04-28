import { useSimStore } from '../store/simStore';
import type { RocketParams } from '../types/rocket';

const controls: Array<{
  key: keyof RocketParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}> = [
  { key: 'initialMass', label: 'Initial mass', min: 1, max: 100, step: 0.5, unit: 'kg' },
  { key: 'fuelMass', label: 'Fuel mass', min: 0.5, max: 50, step: 0.5, unit: 'kg' },
  { key: 'thrust', label: 'Thrust', min: 10, max: 5000, step: 10, unit: 'N' },
  { key: 'isp', label: 'Specific impulse', min: 50, max: 300, step: 1, unit: 's' },
  { key: 'launchAngleDeg', label: 'Launch angle', min: 45, max: 90, step: 1, unit: 'deg' },
  { key: 'dragCoefficient', label: 'Drag coefficient', min: 0.1, max: 0.8, step: 0.01, unit: '' },
  { key: 'referenceArea', label: 'Reference area', min: 0.001, max: 0.1, step: 0.001, unit: 'm^2' },
  { key: 'launchRailLength', label: 'Launch rail', min: 0.5, max: 12, step: 0.1, unit: 'm' },
  { key: 'windSpeed', label: 'Wind speed', min: -60, max: 60, step: 1, unit: 'm/s' },
  { key: 'thrustRampPercent', label: 'Thrust ramp', min: 0, max: 60, step: 1, unit: '%' },
];

export function ParameterPanel() {
  const params = useSimStore((state) => state.params);
  const setParam = useSimStore((state) => state.setParam);
  const warnings = useSimStore((state) => state.warnings);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Parameters</h2>
        <p className="text-sm text-sky/70">Tune the baseline model before running a new trajectory.</p>
      </div>

      <div className="space-y-4">
        {controls.map((control) => (
          <label key={control.key} className="block space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span>{control.label}</span>
              <span className="font-mono text-white">
                {params[control.key].toFixed(control.step < 1 ? 3 : 1)} {control.unit}
              </span>
            </div>
            <input
              className="w-full"
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={params[control.key]}
              onChange={(event) => setParam(control.key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>

      {warnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-300/10 p-3 text-sm text-amber-100">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
