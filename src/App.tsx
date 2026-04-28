import { EventTimeline } from './components/EventTimeline';
import { ParameterPanel } from './components/ParameterPanel';
import { PresetPanel } from './components/PresetPanel';
import { SimControls } from './components/SimControls';
import { TelemetryChart } from './components/TelemetryChart';
import { TrajectoryChart } from './components/TrajectoryChart';
import { useSimStore } from './store/simStore';

export default function App() {
  const summary = useSimStore((state) => state.summary);
  const hasRun = useSimStore((state) => state.hasRun);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#264a7e_0%,#0b1630_45%,#040812_100%)] text-sky">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-sky/70">Rocket Flight Sim</p>
            <h1 className="text-3xl font-semibold text-white">2D launch simulator</h1>
            <p className="text-sm text-sky/80">
              RK4 integration, launch rail handling, wind-relative drag, max-Q tracking, and event extraction.
            </p>
          </div>
          <PresetPanel />
          <ParameterPanel />
          <SimControls />
        </aside>

        <main className="grid gap-6">
          <section className="grid gap-4 rounded-3xl border border-white/10 bg-panel/90 p-5 lg:grid-cols-3">
            <Metric label="Peak altitude" value={`${summary.peakAltitude.toFixed(0)} m`} />
            <Metric label="Peak speed" value={`${summary.peakSpeed.toFixed(1)} m/s`} />
            <Metric label="Flight time" value={`${summary.flightTime.toFixed(1)} s`} />
          </section>

          <section className="grid gap-4 rounded-3xl border border-white/10 bg-panel/90 p-5 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Downrange" value={`${summary.downrangeDistance.toFixed(0)} m`} />
            <Metric label="Max accel" value={`${summary.maxAcceleration.toFixed(1)} m/s²`} />
            <Metric label="Burnout" value={`${summary.burnoutTime.toFixed(1)} s`} />
            <Metric label="Apogee" value={`${summary.apogeeTime.toFixed(1)} s`} />
          </section>

          <section className="grid gap-4 rounded-3xl border border-white/10 bg-panel/90 p-5 md:grid-cols-2 xl:grid-cols-3">
            <Metric label="Max-Q" value={`${(summary.maxDynamicPressure / 1000).toFixed(1)} kPa`} />
            <Metric label="Max-Q time" value={`${summary.maxDynamicPressureTime.toFixed(1)} s`} />
            <Metric label="Touchdown" value={`${summary.touchdownSpeed.toFixed(1)} m/s`} />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-sky/75">
            {hasRun
              ? 'Simulation has been recomputed with the current input set.'
              : 'Baseline simulation is precomputed. Adjust parameters and run again to compare outcomes.'}
          </section>

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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-sky/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
