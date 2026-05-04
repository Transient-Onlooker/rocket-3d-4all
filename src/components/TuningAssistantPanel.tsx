import { useEffect, useState } from 'react';
import { useSimStore } from '../store/simStore';
import type { RocketParams, SimSummary, SimulationModelMode } from '../types/rocket';
import { computeSnapshot } from '../utils/simSnapshot';

const G0 = 9.80665;

type Candidate = {
  goal: 'altitude' | 'range' | 'safety';
  label: string;
  params: RocketParams;
  summary: SimSummary;
  score: number;
  reason: string;
};

export function TuningAssistantPanel() {
  const params = useSimStore((state) => state.params);
  const currentSummary = useSimStore((state) => state.summary);
  const setParams = useSimStore((state) => state.setParams);
  const modelMode = useSimStore((state) => state.modelMode);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const baselineScore = scoreSafety(params, currentSummary);

  useEffect(() => {
    setCandidates([]);
  }, [modelMode, params]);

  const handleBuildCandidates = () => {
    setCandidates(buildCandidates(params, modelMode));
    setIsExpanded(true);
  };

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.14),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(8,47,73,0.22))] p-4 sm:rounded-[1.75rem] sm:p-5 xl:rounded-[2rem]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky/60">Tuning Assistant</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">자동 튜닝 후보</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-sky/75">
            현재 설정 주변의 발사각, 추력, 추력 램프, 항력 형상을 탐색해 목표별 개선 후보를 제안합니다.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-sky/55">현재 안정 점수</p>
          <p className="mt-1 text-2xl font-semibold text-white">{baselineScore}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleBuildCandidates}
          className="rounded-2xl border border-orange-300/25 bg-orange-300/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:border-orange-200/50 hover:bg-orange-300/15"
        >
          후보 계산
        </button>
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          disabled={candidates.length === 0}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-sky/90 transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isExpanded ? '후보 접기' : '후보 펼치기'}
        </button>
      </div>

      {candidates.length === 0 ? (
        <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-sky/70">
          모델 전환과 파라미터 조정은 즉시 반영됩니다. 자동 튜닝은 계산량이 많으므로 필요할 때만 <span className="font-semibold text-white">후보 계산</span>을 누르세요.
        </div>
      ) : null}

      {isExpanded && candidates.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {candidates.map((candidate) => (
          <div key={candidate.goal} className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-sky/55">{candidate.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{candidate.score}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky/70">
                추천
              </span>
            </div>

            <p className="mt-3 min-h-[48px] text-sm leading-6 text-sky/75">{candidate.reason}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniMetric label="고도" value={`${candidate.summary.peakAltitude.toFixed(0)} m`} />
              <MiniMetric label="사거리" value={`${candidate.summary.downrangeDistance.toFixed(0)} m`} />
              <MiniMetric label="발사각" value={`${candidate.params.launchAngleDeg.toFixed(0)} deg`} />
              <MiniMetric label="추력" value={`${candidate.params.thrust.toFixed(0)} N`} />
              <MiniMetric label="램프" value={`${candidate.params.thrustRampPercent.toFixed(0)}%`} />
              <MiniMetric label="Cd" value={candidate.params.dragCoefficient.toFixed(2)} />
            </div>

            <button
              type="button"
              onClick={() => setParams(candidate.params)}
              className="mt-4 w-full rounded-2xl border border-orange-300/25 bg-orange-300/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:border-orange-200/50 hover:bg-orange-300/15"
            >
              이 후보 적용
            </button>
          </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-sky/50">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function buildCandidates(params: RocketParams, modelMode: SimulationModelMode): Candidate[] {
  const variants = createVariants(params).map((variant) => {
    const snapshot = computeSnapshot(variant, modelMode);
    return {
      params: snapshot.params,
      summary: snapshot.summary,
      launchReady: snapshot.launchReady,
    };
  });

  const altitude = variants.reduce((best, variant) =>
    variant.summary.peakAltitude > best.summary.peakAltitude ? variant : best,
  );
  const range = variants.reduce((best, variant) =>
    variant.summary.downrangeDistance > best.summary.downrangeDistance ? variant : best,
  );
  const safety = variants.reduce((best, variant) =>
    scoreSafety(variant.params, variant.summary) > scoreSafety(best.params, best.summary) ? variant : best,
  );

  return [
    {
      goal: 'altitude',
      label: '고도 우선',
      params: altitude.params,
      summary: altitude.summary,
      score: Math.round(altitude.summary.peakAltitude),
      reason: '최대 고도를 우선으로 탐색한 후보입니다. 발사각과 항력 조건을 고도 중심으로 조정합니다.',
    },
    {
      goal: 'range',
      label: '사거리 우선',
      params: range.params,
      summary: range.summary,
      score: Math.round(range.summary.downrangeDistance),
      reason: '수평 도달 거리를 우선으로 탐색한 후보입니다. 낮은 발사각과 추력 조합을 비교합니다.',
    },
    {
      goal: 'safety',
      label: '안정성 우선',
      params: safety.params,
      summary: safety.summary,
      score: scoreSafety(safety.params, safety.summary),
      reason: 'Max-Q와 착지 속도를 낮추면서 이륙 여유를 확보하는 균형형 후보입니다.',
    },
  ];
}

function createVariants(params: RocketParams) {
  const angles = uniqueNumbers([
    params.launchAngleDeg - 12,
    params.launchAngleDeg - 6,
    params.launchAngleDeg,
    params.launchAngleDeg + 4,
    params.launchAngleDeg + 8,
  ]).map((value) => clamp(value, 45, 90));
  const thrusts = [0.88, 1, 1.12, 1.24].map((factor) => clamp(params.thrust * factor, 10, 5000));
  const ramps = uniqueNumbers([params.thrustRampPercent - 10, params.thrustRampPercent, params.thrustRampPercent + 10]).map((value) => clamp(value, 0, 60));
  const dragCoefficients = [0.85, 1, 1.12].map((factor) => clamp(params.dragCoefficient * factor, 0.1, 0.8));

  const variants: RocketParams[] = [];

  for (const launchAngleDeg of angles) {
    for (const thrust of thrusts) {
      for (const thrustRampPercent of ramps) {
        for (const dragCoefficient of dragCoefficients) {
          variants.push({
            ...params,
            launchAngleDeg,
            thrust,
            thrustRampPercent,
            dragCoefficient,
          });
        }
      }
    }
  }

  return variants;
}

function scoreSafety(params: RocketParams, summary: SimSummary) {
  const thrustToWeight = params.thrust / (params.initialMass * G0);
  const maxQKpa = summary.maxDynamicPressure / 1000;

  let score = 100;
  if (thrustToWeight < 1.25) score -= 24;
  if (thrustToWeight > 8) score -= 8;
  if (maxQKpa > 30) score -= Math.min(25, (maxQKpa - 30) * 0.8);
  if (summary.touchdownSpeed > 30) score -= Math.min(24, (summary.touchdownSpeed - 30) * 0.7);
  if (summary.peakAltitude <= 0) score -= 50;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values.map((value) => Number(value.toFixed(3))))];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
