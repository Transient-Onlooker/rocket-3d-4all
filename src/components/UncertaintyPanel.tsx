import { useState } from 'react';
import { useSimStore } from '../store/simStore';
import type { RocketParams, SimSummary } from '../types/rocket';
import { computeSnapshot } from '../utils/simSnapshot';

type SweepRow = {
  label: string;
  p10: number;
  p50: number;
  p90: number;
  unit: string;
  precision: number;
};

type SweepResult = {
  rows: SweepRow[];
  samples: number;
  failureCount: number;
};

const SAMPLE_COUNT = 48;

export function UncertaintyPanel() {
  const modelMode = useSimStore((state) => state.modelMode);
  const params = useSimStore((state) => state.params);
  const [result, setResult] = useState<SweepResult | null>(null);

  if (modelMode !== 'professional') {
    return null;
  }

  const handleRunSweep = () => {
    setResult(runSweep(params));
  };

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.28),rgba(15,23,42,0.94)_48%,rgba(125,211,252,0.1))] p-4 sm:rounded-[1.75rem] sm:p-5 xl:rounded-[2rem]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky/60">Uncertainty Sweep</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">불확실성 분석</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-sky/75">
            추력, 질량, Cd, 바람 오차를 샘플링해 결과가 얼마나 흔들리는지 P10/P50/P90 범위로 확인합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunSweep}
          className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-300/15"
        >
          불확실성 계산
        </button>
      </div>

      {result ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="샘플" value={`${result.samples} cases`} />
            <SummaryCard label="이륙 실패" value={`${result.failureCount} cases`} />
            <SummaryCard label="성공률" value={`${(((result.samples - result.failureCount) / result.samples) * 100).toFixed(0)}%`} />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {result.rows.map((row) => (
              <div key={row.label} className="rounded-[1.25rem] border border-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{row.label}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-sky/55">P10 / P50 / P90</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <RangeValue label="P10" value={formatValue(row.p10, row.precision, row.unit)} />
                  <RangeValue label="P50" value={formatValue(row.p50, row.precision, row.unit)} />
                  <RangeValue label="P90" value={formatValue(row.p90, row.precision, row.unit)} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-sky/70">
          계산 버튼을 누르면 현재 설정 주변의 제조/환경 오차를 반영한 분포를 생성합니다. 자동 실행하지 않아 모델 전환 속도에는 영향을 주지 않습니다.
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-sky/55">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function RangeValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.22em] text-sky/50">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function runSweep(params: RocketParams): SweepResult {
  const summaries: SimSummary[] = [];
  let failureCount = 0;

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const sampled = sampleParams(params, index);
    const snapshot = computeSnapshot(sampled, 'professional');
    if (!snapshot.launchReady) {
      failureCount += 1;
    }
    summaries.push(snapshot.summary);
  }

  return {
    samples: SAMPLE_COUNT,
    failureCount,
    rows: [
      makeRow('최대 고도', summaries.map((summary) => summary.peakAltitude), 'm', 0),
      makeRow('사거리', summaries.map((summary) => summary.downrangeDistance), 'm', 0),
      makeRow('Max-Q', summaries.map((summary) => summary.maxDynamicPressure / 1000), 'kPa', 1),
      makeRow('최대 Mach', summaries.map((summary) => summary.maxMach), '', 2),
      makeRow('공력가열', summaries.map((summary) => summary.maxHeatFlux / 1000), 'kW/m²', 1),
      makeRow('착지 속도', summaries.map((summary) => summary.touchdownSpeed), 'm/s', 1),
    ],
  };
}

function sampleParams(params: RocketParams, index: number): RocketParams {
  const thrustBias = seededNoise(index, 1) * 0.06;
  const massBias = seededNoise(index, 2) * 0.035;
  const cdBias = seededNoise(index, 3) * 0.12;
  const windBias = seededNoise(index, 4) * 8;
  const angleBias = seededNoise(index, 5) * 1.5;

  return {
    ...params,
    initialMass: clamp(params.initialMass * (1 + massBias), 1, 100),
    fuelMass: clamp(params.fuelMass * (1 + massBias * 0.6), 0.5, 50),
    thrust: clamp(params.thrust * (1 + thrustBias), 10, 5000),
    dragCoefficient: clamp(params.dragCoefficient * (1 + cdBias), 0.1, 0.8),
    windSpeed: clamp(params.windSpeed + windBias, -60, 60),
    launchAngleDeg: clamp(params.launchAngleDeg + angleBias, 45, 90),
  };
}

function makeRow(label: string, values: number[], unit: string, precision: number): SweepRow {
  const sorted = [...values].sort((left, right) => left - right);

  return {
    label,
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    unit,
    precision,
  };
}

function percentile(sortedValues: number[], ratio: number) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.round((sortedValues.length - 1) * ratio)));
  return sortedValues[index];
}

function seededNoise(index: number, salt: number) {
  const raw = Math.sin((index + 1) * (salt * 97.13)) * 10000;
  return (raw - Math.floor(raw)) * 2 - 1;
}

function formatValue(value: number, precision: number, unit: string) {
  return `${value.toFixed(precision)}${unit ? ` ${unit}` : ''}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
