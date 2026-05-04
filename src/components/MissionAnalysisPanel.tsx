import { useState } from 'react';
import { useSimStore } from '../store/simStore';
import type { RocketParams, SimSummary, SimulationModelMode, TelemetryPoint } from '../types/rocket';

const G0 = 9.80665;

export function MissionAnalysisPanel() {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const params = useSimStore((state) => state.params);
  const summary = useSimStore((state) => state.summary);
  const telemetry = useSimStore((state) => state.telemetry);
  const launchReady = useSimStore((state) => state.launchReady);
  const modelMode = useSimStore((state) => state.modelMode);
  const isProfessionalModel = modelMode === 'professional';
  const analysis = analyzeMission(params, summary, telemetry, launchReady);

  const handleCopyReport = async () => {
    const report = createMarkdownReport(params, summary, analysis, modelMode);

    try {
      await navigator.clipboard.writeText(report);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }

    window.setTimeout(() => setCopyStatus('idle'), 1800);
  };

  const handleDownloadCsv = () => {
    const csv = createTelemetryCsv(telemetry, modelMode);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rocket-telemetry-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(125,211,252,0.12),rgba(15,23,42,0.92)_48%,rgba(251,146,60,0.08))] p-4 sm:rounded-[1.75rem] sm:p-5 xl:rounded-[2rem] xl:grid-cols-[260px_minmax(0,1fr)]">
      <div className="rounded-[1.35rem] border border-white/10 bg-black/15 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-sky/60">Mission Analysis</p>
        <div className="mt-4 flex items-end gap-3">
          <span className="text-5xl font-semibold text-white">{analysis.score}</span>
          <span className="pb-2 text-sm font-semibold text-sky/60">/ 100</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-sky/75">{analysis.verdict}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#fb923c)]"
            style={{ width: `${analysis.score}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <AnalysisCard label="추력대중량비" value={`${analysis.thrustToWeight.toFixed(2)} : 1`} tone={analysis.thrustToWeight > 1.4 ? 'good' : 'warn'} />
          <AnalysisCard label="연료 비율" value={`${analysis.fuelRatio.toFixed(1)}%`} tone={analysis.fuelRatio >= 25 && analysis.fuelRatio <= 65 ? 'good' : 'warn'} />
          <AnalysisCard label="Max-Q 위험도" value={analysis.maxQLevel} tone={analysis.maxQLevel === '낮음' ? 'good' : analysis.maxQLevel === '보통' ? 'info' : 'warn'} />
          <AnalysisCard label="착지 충격" value={analysis.touchdownLevel} tone={analysis.touchdownLevel === '낮음' ? 'good' : analysis.touchdownLevel === '보통' ? 'info' : 'warn'} />
        </div>
      </div>

      <div className="xl:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-sky/65">
          기본 화면에는 핵심 안정성 지표만 표시합니다.
        </p>
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-sky/90 transition hover:border-sky-300/40 hover:bg-sky-300/10"
        >
          {showAdvanced ? '고급 지표 접기' : '고급 지표 보기'}
        </button>
      </div>

      {showAdvanced ? (
        <div className="xl:col-span-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AnalysisCard label="이론 ΔV" value={`${analysis.deltaV.toFixed(0)} m/s`} tone="info" />
          <AnalysisCard label="탄도계수" value={`${analysis.ballisticCoefficient.toFixed(0)} kg/m²`} tone="info" />
          <AnalysisCard label="레일 이탈 속도" value={`${analysis.railExitSpeed.toFixed(1)} m/s`} tone={analysis.railExitSpeed > 12 ? 'good' : 'warn'} />
          <AnalysisCard label="연소 후 상승" value={`${analysis.coastAltitudeGain.toFixed(1)}%`} tone={analysis.coastAltitudeGain > 35 ? 'good' : 'info'} />
          {isProfessionalModel ? (
            <>
          <AnalysisCard label="최대 Mach" value={`M ${summary.maxMach.toFixed(2)}`} tone={summary.maxMach < 0.8 ? 'good' : summary.maxMach < 1.2 ? 'warn' : 'info'} />
          <AnalysisCard label="Mach 시점" value={`${summary.maxMachTime.toFixed(1)} s`} tone="info" />
          <AnalysisCard label="최대 Reynolds" value={formatScientific(summary.maxReynoldsNumber)} tone="info" />
          <AnalysisCard label="공력가열 피크" value={`${(summary.maxHeatFlux / 1000).toFixed(1)} kW/m²`} tone={summary.maxHeatFlux > 150_000 ? 'warn' : 'info'} />
          <AnalysisCard label="항력 손실" value={`${summary.estimatedDragLoss.toFixed(1)} m/s`} tone="info" />
          <AnalysisCard label="중력 손실" value={`${summary.estimatedGravityLoss.toFixed(1)} m/s`} tone="info" />
          <AnalysisCard label="Re 시점" value={`${summary.maxReynoldsNumberTime.toFixed(1)} s`} tone="info" />
          <AnalysisCard label="가열 시점" value={`${summary.maxHeatFluxTime.toFixed(1)} s`} tone="info" />
            </>
          ) : null}
        </div>
      ) : null}

      <div className="xl:col-span-2 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleCopyReport}
          className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-300/15"
        >
          {copyStatus === 'copied' ? '리포트 복사됨' : copyStatus === 'failed' ? '복사 실패' : 'Markdown 리포트 복사'}
        </button>
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="rounded-2xl border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:border-orange-200/50 hover:bg-orange-300/15"
        >
          텔레메트리 CSV 저장
        </button>
      </div>
    </section>
  );
}

function AnalysisCard({ label, value, tone }: { label: string; value: string; tone: 'good' | 'info' | 'warn' }) {
  const toneClass = {
    good: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
    info: 'border-sky-300/20 bg-sky-300/10 text-sky-100',
    warn: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  }[tone];

  return (
    <div className={`rounded-[1.25rem] border p-4 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.25em] opacity-70">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function analyzeMission(params: RocketParams, summary: SimSummary, telemetry: TelemetryPoint[], launchReady: boolean) {
  const thrustToWeight = params.thrust / (params.initialMass * G0);
  const fuelRatio = (params.fuelMass / params.initialMass) * 100;
  const dryMass = Math.max(0.1, params.initialMass - params.fuelMass);
  const deltaV = params.isp * G0 * Math.log(params.initialMass / dryMass);
  const ballisticCoefficient = dryMass / Math.max(0.0001, params.dragCoefficient * params.referenceArea);
  const maxQKpa = summary.maxDynamicPressure / 1000;
  const railClearPoint = telemetry.find((point) => point.flightPhase !== 'rail');
  const burnoutPoint = telemetry.find((point) => point.flightPhase === 'coast' || point.flightPhase === 'descent');
  const burnoutAltitudeRatio = summary.peakAltitude > 0 && burnoutPoint ? burnoutPoint.y / summary.peakAltitude : 0;
  const coastAltitudeGain = summary.peakAltitude > 0 && burnoutPoint
    ? ((summary.peakAltitude - burnoutPoint.y) / summary.peakAltitude) * 100
    : 0;
  const gravityLossHint = burnoutAltitudeRatio < 0.25 && summary.peakAltitude > 200;
  const maxQLevel = maxQKpa < 15 ? '낮음' : maxQKpa < 45 ? '보통' : '높음';
  const touchdownLevel = summary.touchdownSpeed < 18 ? '낮음' : summary.touchdownSpeed < 45 ? '보통' : '높음';

  let score = 100;
  if (!launchReady) score -= 55;
  if (thrustToWeight < 1.2) score -= 18;
  if (thrustToWeight > 8) score -= 8;
  if (fuelRatio < 18 || fuelRatio > 72) score -= 10;
  if (maxQKpa > 45) score -= 14;
  if (summary.touchdownSpeed > 45) score -= 12;
  if (Math.abs(params.windSpeed) > 20) score -= 8;
  if (gravityLossHint) score -= 6;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const recommendations = [
    !launchReady ? '추력이 초기 중량보다 낮아 이륙 조건을 만족하지 못합니다. 추력을 올리거나 초기 질량을 낮추세요.' : null,
    thrustToWeight < 1.4 ? '초기 추력대중량비가 낮습니다. 발사 초반 중력 손실이 커질 수 있습니다.' : null,
    maxQKpa > 45 ? 'Max-Q가 높습니다. 항력계수, 단면적, 추력 램프를 조정해 구조 하중을 낮추는 구성이 좋습니다.' : null,
    summary.touchdownSpeed > 45 ? '착지 속도가 높습니다. 회수 시스템 또는 더 완만한 궤적 설계가 필요합니다.' : null,
    Math.abs(params.windSpeed) > 20 ? '강한 횡풍 조건입니다. 사거리 편차와 공력 손실이 커질 수 있습니다.' : null,
    gravityLossHint ? '연소 종료 고도가 낮습니다. 발사각을 높이거나 연소 시간을 늘리면 고도 성능이 개선될 수 있습니다.' : null,
  ].filter((item): item is string => Boolean(item));

  if (recommendations.length === 0) {
    recommendations.push('현재 설정은 안정적인 비행 프로파일입니다. 목표가 고도라면 발사각과 Isp를, 목표가 사거리라면 발사각과 항력을 중심으로 미세 조정하세요.');
  }

  return {
    score,
    verdict: launchReady ? getVerdict(score) : '이륙 불가 조건입니다. 비행 결과보다 발사 조건을 먼저 수정해야 합니다.',
    thrustToWeight,
    fuelRatio,
    deltaV,
    ballisticCoefficient,
    railExitSpeed: railClearPoint?.speed ?? 0,
    coastAltitudeGain,
    maxQLevel,
    touchdownLevel,
    recommendations,
  };
}

type MissionAnalysis = ReturnType<typeof analyzeMission>;

function createMarkdownReport(params: RocketParams, summary: SimSummary, analysis: MissionAnalysis, modelMode: SimulationModelMode) {
  const professionalMetrics =
    modelMode === 'professional'
      ? [
          `- Max Mach: ${summary.maxMach.toFixed(2)}`,
          `- Max Reynolds number: ${summary.maxReynoldsNumber.toExponential(2)}`,
          `- Peak heat flux: ${(summary.maxHeatFlux / 1000).toFixed(1)} kW/m^2`,
          `- Estimated drag loss: ${summary.estimatedDragLoss.toFixed(1)} m/s`,
          `- Estimated gravity loss: ${summary.estimatedGravityLoss.toFixed(1)} m/s`,
        ]
      : [];

  return [
    '# Rocket Flight Simulation Report',
    '',
    '## Mission Score',
    `- Score: ${analysis.score}/100`,
    `- Verdict: ${analysis.verdict}`,
    '',
    '## Input Parameters',
    `- Initial mass: ${params.initialMass.toFixed(2)} kg`,
    `- Fuel mass: ${params.fuelMass.toFixed(2)} kg`,
    `- Thrust: ${params.thrust.toFixed(0)} N`,
    `- Isp: ${params.isp.toFixed(0)} s`,
    `- Launch angle: ${params.launchAngleDeg.toFixed(1)} deg`,
    `- Drag coefficient: ${params.dragCoefficient.toFixed(2)}`,
    `- Reference area: ${params.referenceArea.toFixed(4)} m^2`,
    '',
    '## Results',
    `- Peak altitude: ${summary.peakAltitude.toFixed(0)} m`,
    `- Downrange distance: ${summary.downrangeDistance.toFixed(0)} m`,
    `- Flight time: ${summary.flightTime.toFixed(1)} s`,
    `- Peak speed: ${summary.peakSpeed.toFixed(1)} m/s`,
    `- Max-Q: ${(summary.maxDynamicPressure / 1000).toFixed(1)} kPa`,
    `- Touchdown speed: ${summary.touchdownSpeed.toFixed(1)} m/s`,
    '',
    '## Engineering Metrics',
    `- Thrust-to-weight: ${analysis.thrustToWeight.toFixed(2)} : 1`,
    `- Theoretical delta-V: ${analysis.deltaV.toFixed(0)} m/s`,
    `- Ballistic coefficient: ${analysis.ballisticCoefficient.toFixed(0)} kg/m^2`,
    `- Rail exit speed: ${analysis.railExitSpeed.toFixed(1)} m/s`,
    `- Coast altitude gain: ${analysis.coastAltitudeGain.toFixed(1)}%`,
    ...professionalMetrics,
  ].join('\n');
}

function createTelemetryCsv(telemetry: TelemetryPoint[], modelMode: SimulationModelMode) {
  const includeProfessionalColumns = modelMode === 'professional';
  const header = includeProfessionalColumns
    ? 'time_s,x_m,y_m,vx_mps,vy_mps,speed_mps,accel_mps2,mass_kg,thrust_n,drag_n,effective_cd,dynamic_pressure_pa,mach,reynolds_number,heat_flux_w_m2,phase'
    : 'time_s,x_m,y_m,vx_mps,vy_mps,speed_mps,accel_mps2,mass_kg,thrust_n,drag_n,dynamic_pressure_pa,phase';
  const rows = telemetry.map((point) =>
    (includeProfessionalColumns ? [
      point.t,
      point.x,
      point.y,
      point.vx,
      point.vy,
      point.speed,
      point.acceleration,
      point.mass,
      point.thrust,
      point.drag,
      point.effectiveDragCoefficient,
      point.dynamicPressure,
      point.mach,
      point.reynoldsNumber,
      point.heatFlux,
      point.flightPhase,
    ] : [
      point.t,
      point.x,
      point.y,
      point.vx,
      point.vy,
      point.speed,
      point.acceleration,
      point.mass,
      point.thrust,
      point.drag,
      point.dynamicPressure,
      point.flightPhase,
    ]).join(','),
  );

  return [header, ...rows].join('\n');
}

function formatScientific(value: number) {
  if (value <= 0) return '0';
  return value.toExponential(2).replace('e+', 'e');
}

function getVerdict(score: number) {
  if (score >= 86) return '효율과 안정성의 균형이 좋은 비행 프로파일입니다.';
  if (score >= 70) return '비행은 가능하지만 일부 위험 요소를 조정하면 더 좋은 결과를 얻을 수 있습니다.';
  if (score >= 45) return '성능 편차가 큰 설정입니다. 추력, 질량, 공력 조건을 재검토하세요.';
  return '위험도가 높은 설정입니다. 안정적인 발사 조건부터 다시 맞추는 것이 좋습니다.';
}
