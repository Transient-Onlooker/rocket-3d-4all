import { useSimStore } from '../store/simStore';

export function SimControls() {
  const runSimulation = useSimStore((state) => state.runSimulation);
  const resetSimulation = useSimStore((state) => state.resetSimulation);
  const hasRun = useSimStore((state) => state.hasRun);

  return (
    <section className="space-y-3">
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-2xl bg-flare px-4 py-3 font-semibold text-ink transition hover:brightness-110"
          onClick={runSimulation}
        >
          {hasRun ? 'Run again' : 'Run simulation'}
        </button>
        <button
          className="rounded-2xl border border-white/15 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
          onClick={resetSimulation}
        >
          Reset
        </button>
      </div>
      <p className="text-xs text-sky/60">
        Sliders update the preview immediately. Use the run button to mark the current setup as the active scenario.
      </p>
    </section>
  );
}
