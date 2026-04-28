import { useSimStore } from '../store/simStore';

export function SimControls() {
  const runSimulation = useSimStore((state) => state.runSimulation);
  const resetSimulation = useSimStore((state) => state.resetSimulation);
  const hasRun = useSimStore((state) => state.hasRun);

  return (
    <section className="space-y-3">
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-[1.35rem] bg-flare px-4 py-3 font-semibold text-ink shadow-lg shadow-orange-950/30 transition hover:brightness-110"
          onClick={runSimulation}
        >
          {hasRun ? 'Run again' : 'Run simulation'}
        </button>
        <button
          className="rounded-[1.35rem] border border-white/15 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
          onClick={resetSimulation}
        >
          Reset
        </button>
      </div>
      <div className="rounded-[1.35rem] border border-white/10 bg-black/10 px-4 py-3 text-xs leading-6 text-sky/60">
        Sliders update the preview immediately. Use the run button to mark the current setup as the active scenario.
      </div>
    </section>
  );
}
