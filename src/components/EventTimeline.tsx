import { useSimStore } from '../store/simStore';

export function EventTimeline() {
  const events = useSimStore((state) => state.events);

  return (
    <section className="rounded-3xl border border-white/10 bg-panel/90 p-5">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">Flight Events</h2>
        <p className="text-sm text-sky/70">Major events extracted from the current trajectory.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {events.map((event) => (
          <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-sky/60">{event.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{event.time.toFixed(1)} s</p>
            <p className="mt-1 text-sm text-sky/75">{event.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
