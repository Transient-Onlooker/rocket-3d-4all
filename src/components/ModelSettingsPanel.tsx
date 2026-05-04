import { useSimStore } from '../store/simStore';
import type { SimulationModelMode } from '../types/rocket';

const modelOptions: Array<{
  id: SimulationModelMode;
  label: string;
  description: string;
  details: string;
}> = [
  {
    id: 'standard',
    label: '일반 모델',
    description: '빠르고 단순한 궤적 계산',
    details: '상수 중력, 해수면 대기, 일정 추력을 사용합니다.',
  },
  {
    id: 'professional',
    label: '전문 모델',
    description: '고급 공력 지표까지 계산',
    details: '고도별 대기, 추력 램프, Mach/Reynolds, 공력가열을 사용합니다.',
  },
];

export function ModelSettingsPanel() {
  const modelMode = useSimStore((state) => state.modelMode);
  const setModelMode = useSimStore((state) => state.setModelMode);

  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-black/10 p-3 sm:rounded-[1.5rem]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">1. 모델 선택</h2>
          <p className="mt-1 text-sm text-sky/70">빠른 실험은 일반, 자세한 분석은 전문을 선택하세요.</p>
        </div>
        <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-100">
          {modelMode === 'professional' ? 'Pro' : 'Basic'}
        </span>
      </div>

      <div className="mt-3 grid gap-2" role="radiogroup" aria-label="시뮬레이션 모델 선택">
        {modelOptions.map((option) => {
          const active = modelMode === option.id;

          return (
            <label
              key={option.id}
              className={[
                'block cursor-pointer rounded-[1.15rem] border p-3 text-left transition',
                active
                  ? 'border-orange-300/35 bg-orange-300/12 text-orange-50'
                  : 'border-white/10 bg-white/[0.04] text-sky/75 hover:border-sky-300/30 hover:bg-sky-300/10',
              ].join(' ')}
            >
              <input
                type="radio"
                name="simulation-model-mode"
                value={option.id}
                checked={active}
                onChange={() => setModelMode(option.id)}
                className="sr-only"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-semibold text-white">
                  <span
                    className={[
                      'h-3 w-3 rounded-full border',
                      active ? 'border-orange-200 bg-orange-300 shadow-[0_0_0_4px_rgba(251,146,60,0.15)]' : 'border-white/30 bg-white/5',
                    ].join(' ')}
                  />
                  {option.label}
                </span>
                <span className="rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] opacity-80">
                  {active ? '선택됨' : '클릭'}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 opacity-80">{option.description}</p>
              <p className="mt-1 text-[11px] leading-5 opacity-60">{option.details}</p>
            </label>
          );
        })}
      </div>
    </section>
  );
}
