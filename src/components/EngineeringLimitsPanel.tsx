import { useSimStore } from '../store/simStore';
import type { EngineeringLimits } from '../types/rocket';

const controls: Array<{
  key: keyof EngineeringLimits;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: 'minRailExitSpeed', label: '레일 이탈 통과', unit: 'm/s', min: 5, max: 35, step: 1 },
  { key: 'watchRailExitSpeed', label: '레일 이탈 위험', unit: 'm/s', min: 3, max: 25, step: 1 },
  { key: 'maxDynamicPressureKpa', label: 'Max-Q 주의', unit: 'kPa', min: 10, max: 120, step: 5 },
  { key: 'criticalDynamicPressureKpa', label: 'Max-Q 위험', unit: 'kPa', min: 20, max: 180, step: 5 },
  { key: 'maxHeatFluxKwM2', label: '열유속 주의', unit: 'kW/m²', min: 20, max: 400, step: 10 },
  { key: 'criticalHeatFluxKwM2', label: '열유속 위험', unit: 'kW/m²', min: 50, max: 700, step: 10 },
  { key: 'maxTouchdownSpeed', label: '착지 주의', unit: 'm/s', min: 5, max: 80, step: 1 },
  { key: 'criticalTouchdownSpeed', label: '착지 위험', unit: 'm/s', min: 10, max: 120, step: 1 },
];

export function EngineeringLimitsPanel() {
  const modelMode = useSimStore((state) => state.modelMode);
  const limits = useSimStore((state) => state.engineeringLimits);
  const setEngineeringLimit = useSimStore((state) => state.setEngineeringLimit);

  if (modelMode !== 'professional') {
    return null;
  }

  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-black/10 p-3 sm:rounded-[1.5rem]">
      <div>
        <h2 className="text-lg font-semibold text-white">전문 한계값</h2>
        <p className="mt-1 text-sm text-sky/70">검증 게이트에서 사용할 설계 기준을 조정합니다.</p>
      </div>
      <div className="mt-3 grid gap-2">
        {controls.map((control) => (
          <label key={control.key} className="rounded-[1rem] border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-sky/75">{control.label}</span>
              <span className="font-mono text-xs font-semibold text-white">
                {limits[control.key].toFixed(0)} {control.unit}
              </span>
            </div>
            <input
              className="slider mt-3 w-full"
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={limits[control.key]}
              onChange={(event) => setEngineeringLimit(control.key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
