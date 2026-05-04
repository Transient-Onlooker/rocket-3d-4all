import { useState } from 'react';
import { presets, type PresetKey } from '../config/simDefaults';
import { useSimStore } from '../store/simStore';
import type { RocketParams, SimSummary } from '../types/rocket';
import { computeSnapshot } from '../utils/simSnapshot';

const G0 = 9.80665;

type ScenarioRow = {
  id: string;
  label: string;
  params: RocketParams;
  summary: SimSummary;
  launchReady: boolean;
  score: number;
  isCurrent: boolean;
};

export function ScenarioComparisonPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const params = useSimStore((state) => state.params);
  const summary = useSimStore((state) => state.summary);
  const launchReady = useSimStore((state) => state.launchReady);
  const applyPreset = useSimStore((state) => state.applyPreset);
  const selectedPreset = useSimStore((state) => state.selectedPreset);
  const isDirty = useSimStore((state) => state.isDirty);
  const modelMode = useSimStore((state) => state.modelMode);

  const presetRows = Object.entries(presets).map(([key, preset]) => {
    const snapshot = computeSnapshot(preset.params, modelMode);

    return {
      id: key,
      label: preset.label,
      params: snapshot.params,
      summary: snapshot.summary,
      launchReady: snapshot.launchReady,
      score: scoreScenario(snapshot.params, snapshot.summary, snapshot.launchReady),
      isCurrent: selectedPreset === key && !isDirty,
    };
  });

  const rows: ScenarioRow[] = [
    {
      id: 'current',
      label: '현재 설정',
      params,
      summary,
      launchReady,
      score: scoreScenario(params, summary, launchReady),
      isCurrent: true,
    },
    ...presetRows,
  ].sort((left, right) => right.score - left.score);

  const maxAltitude = Math.max(...rows.map((row) => row.summary.peakAltitude), 1);
  const maxRange = Math.max(...rows.map((row) => row.summary.downrangeDistance), 1);
  const bestAltitude = rows.reduce((best, row) => (row.summary.peakAltitude > best.summary.peakAltitude ? row : best), rows[0]);
  const bestRange = rows.reduce((best, row) => (row.summary.downrangeDistance > best.summary.downrangeDistance ? row : best), rows[0]);
  const bestSafety = rows.reduce((best, row) => (row.score > best.score ? row : best), rows[0]);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(14,116,144,0.12)_45%,rgba(251,146,60,0.1))] p-4 sm:rounded-[1.75rem] sm:p-5 xl:rounded-[2rem]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky/60">Scenario Lab</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">프리셋 성능 비교</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-sky/75">
            현재 설정과 모든 프리셋을 같은 물리 엔진으로 재계산해 고도, 사거리, 구조 하중 위험도를 비교합니다.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <WinnerCard label="최고 고도" value={bestAltitude.label} detail={`${bestAltitude.summary.peakAltitude.toFixed(0)} m`} />
          <WinnerCard label="최장 사거리" value={bestRange.label} detail={`${bestRange.summary.downrangeDistance.toFixed(0)} m`} />
          <WinnerCard label="균형 점수" value={bestSafety.label} detail={`${bestSafety.score} / 100`} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-sky/65">
          {isExpanded ? `${rows.length}개 시나리오 상세 비교 표시 중` : '요약만 표시 중입니다. 상세 비교는 필요할 때 펼치세요.'}
        </p>
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-sky/90 transition hover:border-sky-300/40 hover:bg-sky-300/10"
          aria-expanded={isExpanded}
        >
          {isExpanded ? '비교 접기' : '상세 비교 펼치기'}
        </button>
      </div>

      {isExpanded ? (
        <div className="mt-5 grid gap-3">
          {rows.map((row) => (
            <div
              key={`${row.id}-${row.isCurrent ? 'current' : 'preset'}`}
              className={[
                'grid gap-3 rounded-[1.25rem] border p-4 lg:grid-cols-[180px_minmax(0,1fr)_160px]',
                row.isCurrent
                  ? 'border-sky-300/30 bg-sky-300/10'
                  : 'border-white/10 bg-white/[0.04]',
              ].join(' ')}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{row.label}</p>
                  {row.id === 'current' ? (
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky/70">
                      Live
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-sky/55">
                  T/W {(row.params.thrust / (row.params.initialMass * G0)).toFixed(2)} · Isp {row.params.isp.toFixed(0)} s · {row.launchReady ? '이륙 가능' : '이륙 불가'}
                </p>
              </div>

              <div className="grid gap-3">
                <ComparisonBar label="고도" value={row.summary.peakAltitude} max={maxAltitude} suffix="m" color="sky" />
                <ComparisonBar label="사거리" value={row.summary.downrangeDistance} max={maxRange} suffix="m" color="orange" />
                <ComparisonBar label="Max-Q" value={row.summary.maxDynamicPressure / 1000} max={60} suffix="kPa" color={row.summary.maxDynamicPressure / 1000 > 45 ? 'amber' : 'emerald'} />
              </div>

              <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-stretch lg:justify-center">
                <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-sky/55">Score</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{row.score}</p>
                </div>
                {row.id !== 'current' ? (
                  <button
                    type="button"
                    onClick={() => applyPreset(row.id as PresetKey)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-sky/90 transition hover:border-sky-300/40 hover:bg-sky-300/10"
                  >
                    적용
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function WinnerCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-sky/55">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-sky/60">{detail}</p>
    </div>
  );
}

function ComparisonBar({
  label,
  value,
  max,
  suffix,
  color,
}: {
  label: string;
  value: number;
  max: number;
  suffix: string;
  color: 'sky' | 'orange' | 'emerald' | 'amber';
}) {
  const width = Math.max(4, Math.min(100, (value / max) * 100));
  const colorClass = {
    sky: 'bg-sky-300',
    orange: 'bg-orange-300',
    emerald: 'bg-emerald-300',
    amber: 'bg-amber-300',
  }[color];

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-sky/65">
        <span>{label}</span>
        <span className="font-semibold text-white">
          {value.toFixed(value >= 100 ? 0 : 1)} {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function scoreScenario(params: RocketParams, summary: SimSummary, launchReady: boolean) {
  const thrustToWeight = params.thrust / (params.initialMass * G0);
  const maxQKpa = summary.maxDynamicPressure / 1000;
  const fuelRatio = params.fuelMass / params.initialMass;

  let score = 100;
  if (!launchReady) score -= 55;
  if (thrustToWeight < 1.25) score -= 18;
  if (thrustToWeight > 8) score -= 8;
  if (fuelRatio < 0.18 || fuelRatio > 0.72) score -= 10;
  if (maxQKpa > 45) score -= 14;
  if (summary.touchdownSpeed > 45) score -= 12;
  if (Math.abs(params.windSpeed) > 20) score -= 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}
