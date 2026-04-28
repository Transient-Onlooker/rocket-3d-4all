import { Component, lazy, Suspense, type ReactNode } from 'react';
import { EventTimeline } from './components/EventTimeline';
import { ParameterPanel } from './components/ParameterPanel';
import { PresetPanel } from './components/PresetPanel';
import { SimControls } from './components/SimControls';
import { TelemetryChart } from './components/TelemetryChart';
import { TrajectoryChart } from './components/TrajectoryChart';
import { presets } from './config/simDefaults';
import { useSimStore } from './store/simStore';

const FlightViewport3D = lazy(async () => import('./components/FlightViewport3D').then((module) => ({ default: module.FlightViewport3D })));
const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export default function App() {
  const summary = useSimStore((state) => state.summary);
  const hasRun = useSimStore((state) => state.hasRun);
  const warnings = useSimStore((state) => state.warnings);
  const telemetry = useSimStore((state) => state.telemetry);
  const params = useSimStore((state) => state.params);
  const isDirty = useSimStore((state) => state.isDirty);
  const selectedPreset = useSimStore((state) => state.selectedPreset);
  const selectedPresetLabel = selectedPreset && !isDirty ? presets[selectedPreset]?.label ?? selectedPreset : '사용자 설정';
  const latestPoint = telemetry[telemetry.length - 1];
  const liveStatus = latestPoint?.flightPhase ?? 'coast';
  const guidance = warnings.length > 0
    ? '경고를 확인한 뒤 시뮬레이션 결과를 검토하세요.'
    : hasRun
      ? '현재 실행 결과가 고정되어 있어 비교가 가능합니다.'
      : '미리보기 모드입니다. 입력을 조정한 뒤 시뮬레이션을 실행하세요.';
  const phase = phaseLabel(liveStatus);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#335d91_0%,#0d1831_42%,#040812_100%)] text-sky">
      <div className="mx-auto grid min-h-screen max-w-[1500px] gap-6 px-4 py-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <div className="rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),rgba(255,255,255,0.04)_40%,rgba(255,255,255,0.02)_100%)] p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img alt="" src={assetUrl('mission-mark.svg')} className="h-10 w-10" />
                <p className="text-xs uppercase tracking-[0.35em] text-sky/70">로켓 비행 시뮬레이터</p>
              </div>
              <StatusBadge label={phase} tone={hasRun ? 'active' : 'idle'} />
            </div>
            <h1 className="font-display mt-3 text-3xl font-semibold text-white">미션 컨트롤 대시보드</h1>
            <p className="mt-3 text-sm leading-6 text-sky/80">
              RK4 적분, 발사 레일 처리, 바람 기준 항력, Max-Q 추적, 이벤트 추출을 하나의 화면에 배치했습니다.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniStat label="질량" value={`${params.initialMass.toFixed(1)} kg`} />
              <MiniStat label="추력" value={`${params.thrust.toFixed(0)} N`} />
              <MiniStat label="바람" value={`${params.windSpeed.toFixed(0)} m/s`} />
            </div>
            <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-sky/75">
              {guidance}
            </div>
          </div>
          <PresetPanel />
          <ParameterPanel />
          <SimControls />
        </aside>

        <main className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,159,74,0.14),rgba(16,33,58,0.92)_45%,rgba(16,33,58,0.92))] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sky/60">시나리오</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  {hasRun ? '실행 궤적 고정됨' : '미리보기 궤적 준비됨'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-sky/75">
                  {hasRun
                    ? '현재 입력값이 실행 결과로 고정되었습니다. 아래 패널에서 시나리오를 확인하세요.'
                    : '슬라이더로 입력값을 즉시 갱신합니다. 준비가 되면 실행 버튼을 누르세요.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatusPill label="경고" value={String(warnings.length)} />
                <StatusPill label="샘플" value={String(telemetry.length)} />
                <StatusPill label="단계" value={phase} />
                <StatusPill label="프리셋" value={selectedPresetLabel} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <InlineBadge label="발사각" value={`${params.launchAngleDeg.toFixed(0)} deg`} />
              <InlineBadge label="레일" value={`${params.launchRailLength.toFixed(1)} m`} />
              <InlineBadge label="추중비" value={params.thrust > params.initialMass * 9.80665 ? '양호' : '낮음'} />
            </div>
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-white/10 bg-panel/90 p-5 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="최대 고도" value={`${summary.peakAltitude.toFixed(0)} m`} />
            <Metric label="최대 속도" value={`${summary.peakSpeed.toFixed(1)} m/s`} />
            <Metric label="비행 시간" value={`${summary.flightTime.toFixed(1)} s`} />
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-white/10 bg-panel/90 p-5 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="사거리" value={`${summary.downrangeDistance.toFixed(0)} m`} />
            <Metric label="최대 가속도" value={`${summary.maxAcceleration.toFixed(1)} m/s^2`} />
            <Metric label="연소 종료" value={`${summary.burnoutTime.toFixed(1)} s`} />
            <Metric label="정점" value={`${summary.apogeeTime.toFixed(1)} s`} />
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-white/10 bg-panel/90 p-5 md:grid-cols-2 xl:grid-cols-3">
            <Metric label="Max-Q" value={`${(summary.maxDynamicPressure / 1000).toFixed(1)} kPa`} />
            <Metric label="Max-Q 시점" value={`${summary.maxDynamicPressureTime.toFixed(1)} s`} />
            <Metric label="착지 속도" value={`${summary.touchdownSpeed.toFixed(1)} m/s`} />
          </section>

          <Suspense
            fallback={
              <section className="rounded-[2rem] border border-white/10 bg-panel/90 p-5">
                <div className="h-[540px] animate-pulse rounded-[1.5rem] border border-white/5 bg-white/5" />
              </section>
            }
          >
            <ViewportErrorBoundary>
              <FlightViewport3D />
            </ViewportErrorBoundary>
          </Suspense>
          <EventTimeline />
          <TrajectoryChart />
          <TelemetryChart />
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const iconMap: Record<string, string> = {
    '최대 고도': assetUrl('icons/altitude.svg'),
    '최대 속도': assetUrl('icons/speed.svg'),
    '비행 시간': assetUrl('icons/time.svg'),
    사거리: assetUrl('icons/range.svg'),
    '최대 가속도': assetUrl('icons/accel.svg'),
    '연소 종료': assetUrl('icons/burnout.svg'),
    정점: assetUrl('icons/apogee.svg'),
    'Max-Q': assetUrl('icons/pressure.svg'),
    'Max-Q 시점': assetUrl('icons/time.svg'),
    '착지 속도': assetUrl('icons/touchdown.svg'),
  };

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-sky/60">{label}</p>
        {iconMap[label] ? <img alt="" src={iconMap[label]} className="h-4 w-4 opacity-80" /> : null}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.25em] text-sky/55">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-center">
      <p className="text-[10px] uppercase tracking-[0.25em] text-sky/55">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: 'active' | 'idle' }) {
  return (
    <div
      className={[
        'rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em]',
        tone === 'active'
          ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
          : 'border-sky-300/20 bg-sky-300/10 text-sky-100',
      ].join(' ')}
    >
      {label}
    </div>
  );
}

function InlineBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-black/10 px-3 py-2 text-xs text-sky/80">
      <span className="mr-2 uppercase tracking-[0.2em] text-sky/50">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function phaseLabel(phase: string) {
  switch (phase) {
    case 'rail':
      return '레일';
    case 'powered':
      return '추진';
    case 'coast':
      return '탄도';
    case 'descent':
      return '하강';
    default:
      return phase;
  }
}

class ViewportErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-[2rem] border border-white/10 bg-panel/90 p-5">
          <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-300/10 p-5 text-amber-50">
            <p className="text-xs uppercase tracking-[0.28em] text-amber-100/70">3D 화면을 불러올 수 없음</p>
            <p className="mt-2 text-sm leading-6">
              3D 화면을 불러오지 못했습니다. 개발 서버를 다시 시작하거나 모듈 캐시가 갱신된 뒤 새로고침하세요.
            </p>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
