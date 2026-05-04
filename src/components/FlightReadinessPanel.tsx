import { useSimStore } from '../store/simStore';
import type { SimSummary, TelemetryPoint } from '../types/rocket';

type GateStatus = 'pass' | 'watch' | 'risk';

type Gate = {
  id: string;
  label: string;
  value: string;
  status: GateStatus;
  note: string;
};

export function FlightReadinessPanel() {
  const modelMode = useSimStore((state) => state.modelMode);
  const summary = useSimStore((state) => state.summary);
  const telemetry = useSimStore((state) => state.telemetry);
  const limits = useSimStore((state) => state.engineeringLimits);

  if (modelMode !== 'professional') {
    return null;
  }

  const gates = buildGates(summary, telemetry, limits);
  const riskCount = gates.filter((gate) => gate.status === 'risk').length;
  const watchCount = gates.filter((gate) => gate.status === 'watch').length;
  const verdict = riskCount > 0 ? '위험 항목 확인 필요' : watchCount > 0 ? '주의 항목 있음' : '전문 모델 기준 통과';
  const verdictTone = riskCount > 0 ? 'risk' : watchCount > 0 ? 'watch' : 'pass';

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.94),rgba(14,116,144,0.16)_45%,rgba(251,146,60,0.08))] p-4 sm:rounded-[1.75rem] sm:p-5 xl:rounded-[2rem]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky/60">Flight Readiness Review</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">비행 검증 게이트</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-sky/75">
            전문 모델 결과를 기준으로 구조 하중, 열환경, 발사 안정성, 손실 규모를 빠르게 판정합니다.
          </p>
        </div>
        <div className={['rounded-2xl border px-4 py-3', toneClass(verdictTone)].join(' ')}>
          <p className="text-[10px] uppercase tracking-[0.25em] opacity-70">Review Status</p>
          <p className="mt-1 text-lg font-semibold">{verdict}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {gates.map((gate) => (
          <div key={gate.id} className={['rounded-[1.25rem] border p-4', toneClass(gate.status)].join(' ')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] opacity-70">{gate.label}</p>
                <p className="mt-2 text-xl font-semibold">{gate.value}</p>
              </div>
              <span className="rounded-full border border-current/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
                {statusLabel(gate.status)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 opacity-75">{gate.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildGates(summary: SimSummary, telemetry: TelemetryPoint[], limits: ReturnType<typeof useSimStore.getState>['engineeringLimits']): Gate[] {
  const railExit = telemetry.find((point) => point.flightPhase !== 'rail');
  const lossRatio = summary.peakSpeed > 0
    ? ((summary.estimatedDragLoss + Math.max(0, summary.estimatedGravityLoss)) / summary.peakSpeed) * 100
    : 0;

  return [
    {
      id: 'rail-exit',
      label: '레일 이탈 안정성',
      value: `${(railExit?.speed ?? 0).toFixed(1)} m/s`,
      status: classify(railExit?.speed ?? 0, limits.watchRailExitSpeed, limits.minRailExitSpeed, false),
      note: '레일을 벗어날 때 속도가 낮으면 초기 자세 안정성이 나빠질 수 있습니다.',
    },
    {
      id: 'max-q',
      label: '구조 하중 Max-Q',
      value: `${(summary.maxDynamicPressure / 1000).toFixed(1)} kPa`,
      status: classify(summary.maxDynamicPressure / 1000, limits.maxDynamicPressureKpa, limits.criticalDynamicPressureKpa, true),
      note: 'Max-Q가 높을수록 동체와 핀에 작용하는 구조 하중이 커집니다.',
    },
    {
      id: 'mach',
      label: '압축성 영역',
      value: `M ${summary.maxMach.toFixed(2)}`,
      status: summary.maxMach < 0.8 ? 'pass' : summary.maxMach < 1.2 ? 'watch' : 'risk',
      note: '천음속/초음속 영역에서는 항력과 안정성이 급격히 달라질 수 있습니다.',
    },
    {
      id: 'heat',
      label: '공력가열',
      value: `${(summary.maxHeatFlux / 1000).toFixed(1)} kW/m²`,
      status: classify(summary.maxHeatFlux / 1000, limits.maxHeatFluxKwM2, limits.criticalHeatFluxKwM2, true),
      note: '간이 열유속 지표입니다. 실제 열해석 대신 위험 신호를 빠르게 보기 위한 값입니다.',
    },
    {
      id: 'loss',
      label: '손실 비율',
      value: `${lossRatio.toFixed(1)}%`,
      status: classify(lossRatio, limits.maxLossRatioPercent, limits.criticalLossRatioPercent, true),
      note: '항력 손실과 중력 손실이 피크 속도 대비 얼마나 큰지 추정합니다.',
    },
    {
      id: 'touchdown',
      label: '착지 속도',
      value: `${summary.touchdownSpeed.toFixed(1)} m/s`,
      status: classify(summary.touchdownSpeed, limits.maxTouchdownSpeed, limits.criticalTouchdownSpeed, true),
      note: '회수 시스템이 없다면 착지 속도는 구조 손상 가능성과 직접 연결됩니다.',
    },
  ];
}

function classify(value: number, watchThreshold: number, riskThreshold: number, higherIsWorse: boolean): GateStatus {
  if (higherIsWorse) {
    if (value >= riskThreshold) return 'risk';
    if (value >= watchThreshold) return 'watch';
    return 'pass';
  }

  if (value <= watchThreshold) return 'risk';
  if (value <= riskThreshold) return 'watch';
  return 'pass';
}

function toneClass(status: GateStatus) {
  return {
    pass: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
    watch: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    risk: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
  }[status];
}

function statusLabel(status: GateStatus) {
  return {
    pass: 'Pass',
    watch: 'Watch',
    risk: 'Risk',
  }[status];
}
