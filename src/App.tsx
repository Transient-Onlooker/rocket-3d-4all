import { lazy, Suspense } from 'react';
import { EventTimeline } from './components/EventTimeline';
import { ParameterPanel } from './components/ParameterPanel';
import { PresetPanel } from './components/PresetPanel';
import { SimControls } from './components/SimControls';
import { TelemetryChart } from './components/TelemetryChart';
import { TrajectoryChart } from './components/TrajectoryChart';
import { useSimStore } from './store/simStore';

const FlightViewport3D = lazy(async () => import('./components/FlightViewport3D').then((module) => ({ default: module.FlightViewport3D })));

export default function App() {
  const summary = useSimStore((state) => state.summary);
  const hasRun = useSimStore((state) => state.hasRun);
  const warnings = useSimStore((state) => state.warnings);
  const telemetry = useSimStore((state) => state.telemetry);
  const params = useSimStore((state) => state.params);
  const isDirty = useSimStore((state) => state.isDirty);
  const selectedPreset = useSimStore((state) => state.selectedPreset);
  const latestPoint = telemetry[telemetry.length - 1];
  const liveStatus = latestPoint?.flightPhase ?? 'coast';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#335d91_0%,#0d1831_42%,#040812_100%)] text-sky">
      <div className="mx-auto grid min-h-screen max-w-[1500px] gap-6 px-4 py-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),rgba(255,255,255,0.04)_40%,rgba(255,255,255,0.02)_100%)] p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.35em] text-sky/70">Rocket Flight Sim</p>
              <StatusBadge label={liveStatus} tone={hasRun ? 'active' : 'idle'} />
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-white">Mission control dashboard</h1>
            <p className="mt-3 text-sm leading-6 text-sky/80">
              RK4 integration, launch rail handling, wind-relative drag, max-Q tracking, and event extraction in a
              compact mission board.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniStat label="Vehicle" value={`${params.initialMass.toFixed(1)} kg`} />
              <MiniStat label="Thrust" value={`${params.thrust.toFixed(0)} N`} />
              <MiniStat label="Wind" value={`${params.windSpeed.toFixed(0)} m/s`} />
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
                <p className="text-xs uppercase tracking-[0.3em] text-sky/60">Scenario</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  {hasRun ? 'Active trajectory locked' : 'Preview trajectory armed'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-sky/75">
                  {hasRun
                    ? 'The current input set has been committed as the active simulation run. Use presets or sliders to branch into a new scenario.'
                    : 'Sliders update the preview immediately. Run the sim when you want to treat the current setup as the main scenario.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatusPill label="Warnings" value={String(warnings.length)} />
                <StatusPill label="Samples" value={String(telemetry.length)} />
                <StatusPill label="Phase" value={liveStatus} />
                <StatusPill label="Preset" value={selectedPreset && !isDirty ? selectedPreset : 'custom'} />
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-white/10 bg-panel/90 p-5 lg:grid-cols-3">
            <Metric label="Peak altitude" value={`${summary.peakAltitude.toFixed(0)} m`} />
            <Metric label="Peak speed" value={`${summary.peakSpeed.toFixed(1)} m/s`} />
            <Metric label="Flight time" value={`${summary.flightTime.toFixed(1)} s`} />
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-white/10 bg-panel/90 p-5 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Downrange" value={`${summary.downrangeDistance.toFixed(0)} m`} />
            <Metric label="Max accel" value={`${summary.maxAcceleration.toFixed(1)} m/s^2`} />
            <Metric label="Burnout" value={`${summary.burnoutTime.toFixed(1)} s`} />
            <Metric label="Apogee" value={`${summary.apogeeTime.toFixed(1)} s`} />
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-white/10 bg-panel/90 p-5 md:grid-cols-2 xl:grid-cols-3">
            <Metric label="Max-Q" value={`${(summary.maxDynamicPressure / 1000).toFixed(1)} kPa`} />
            <Metric label="Max-Q time" value={`${summary.maxDynamicPressureTime.toFixed(1)} s`} />
            <Metric label="Touchdown" value={`${summary.touchdownSpeed.toFixed(1)} m/s`} />
          </section>

          <Suspense
            fallback={
              <section className="rounded-[2rem] border border-white/10 bg-panel/90 p-5">
                <div className="h-[540px] animate-pulse rounded-[1.5rem] border border-white/5 bg-white/5" />
              </section>
            }
          >
            <FlightViewport3D />
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
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-sky/60">{label}</p>
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
