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
  { key: 'initialMass', label: '초기 질량', min: 1, max: 100, step: 0.5, unit: 'kg' },
  { key: 'fuelMass', label: '연료 질량', min: 0.5, max: 50, step: 0.5, unit: 'kg' },
  { key: 'thrust', label: '추력', min: 10, max: 5000, step: 10, unit: 'N' },
  { key: 'isp', label: '비추력', min: 50, max: 300, step: 1, unit: 's' },
  { key: 'launchAngleDeg', label: '발사 각도', min: 45, max: 90, step: 1, unit: 'deg' },
  { key: 'dragCoefficient', label: '항력 계수', min: 0.1, max: 0.8, step: 0.01, unit: '' },
  { key: 'referenceArea', label: '단면적', min: 0.001, max: 0.1, step: 0.001, unit: 'm^2' },
  { key: 'launchRailLength', label: '발사 레일', min: 0.5, max: 12, step: 0.1, unit: 'm' },
  { key: 'windSpeed', label: '바람 속도', min: -60, max: 60, step: 1, unit: 'm/s' },
  { key: 'thrustRampPercent', label: '추력 램프', min: 0, max: 60, step: 1, unit: '%' },
];

export function ParameterPanel() {
  const params = useSimStore((state) => state.params);
  const setParam = useSimStore((state) => state.setParam);
  const warnings = useSimStore((state) => state.warnings);
  const groupedControls = [
    {
      title: '추진',
      hint: '질량, 추력, 연소 동작',
      keys: ['initialMass', 'fuelMass', 'thrust', 'isp', 'thrustRampPercent'] as Array<keyof RocketParams>,
    },
    {
      title: '비행 형상',
      hint: '자세와 공력 형상',
      keys: ['launchAngleDeg', 'dragCoefficient', 'referenceArea', 'launchRailLength'] as Array<keyof RocketParams>,
    },
    {
      title: '환경',
      hint: '비행에 영향을 주는 외부 조건',
      keys: ['windSpeed'] as Array<keyof RocketParams>,
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">파라미터</h2>
        <p className="text-sm text-sky/70">추진, 형상, 발사 환경을 슬라이더로 즉시 조정합니다.</p>
      </div>

      <div className="space-y-4">
        {groupedControls.map((group) => (
          <div key={group.title} className="rounded-[1.4rem] border border-white/10 bg-black/10 p-3">
            <div className="mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-sky/80">{group.title}</h3>
              <p className="mt-1 text-xs text-sky/55">{group.hint}</p>
            </div>
            <div className="space-y-3">
              {group.keys.map((key) => {
                const control = controls.find((item) => item.key === key);
                if (!control) return null;

                return (
                  <label
                    key={control.key}
                    className="block rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-3"
                  >
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-sky/85">{control.label}</span>
                      <span className="font-mono text-sm text-white">
                        {params[control.key].toFixed(control.step < 1 ? 3 : 1)} {control.unit}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-sky/45">
                      <span>{control.min}</span>
                      <span>{control.max}</span>
                    </div>
                    <input
                      className="slider mt-3 w-full"
                      type="range"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={params[control.key]}
                      onChange={(event) => setParam(control.key, Number(event.target.value))}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {warnings.length > 0 ? (
        <div className="rounded-[1.35rem] border border-amber-400/30 bg-amber-300/10 p-3 text-sm text-amber-100">
          {warnings.map((warning) => (
            <p key={warning} className="leading-6">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
