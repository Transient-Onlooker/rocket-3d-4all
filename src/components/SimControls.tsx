import { useSimStore } from '../store/simStore';

export function SimControls() {
  const runSimulation = useSimStore((state) => state.runSimulation);
  const resetSimulation = useSimStore((state) => state.resetSimulation);
  const hasRun = useSimStore((state) => state.hasRun);
  const isDirty = useSimStore((state) => state.isDirty);
  const launchReady = useSimStore((state) => state.launchReady);

  return (
    <section className="space-y-3">
      <div className="flex gap-3">
        <button
          className={launchReady ? 'flex-1 rounded-[1.35rem] bg-flare px-4 py-3 font-semibold text-ink shadow-lg shadow-orange-950/30 transition hover:brightness-110' : 'flex-1 cursor-not-allowed rounded-[1.35rem] bg-slate-600 px-4 py-3 font-semibold text-slate-200 opacity-70'}
          disabled={!launchReady}
          onClick={runSimulation}
        >
          {hasRun ? '다시 실행' : '시뮬레이션 실행'}
        </button>
        <button
          className="rounded-[1.35rem] border border-white/15 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
          onClick={resetSimulation}
        >
          초기화
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.35rem] border border-white/10 bg-black/10 px-4 py-3 text-xs leading-6 text-sky/60">
          슬라이더를 조정하면 미리보기가 즉시 갱신됩니다. 실행 버튼으로 현재 설정을 시나리오에 반영합니다.
        </div>
        <div className="rounded-[1.35rem] border border-white/10 bg-black/10 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.24em] text-sky/55">실행 상태</div>
          <div className="mt-2 text-sm font-semibold text-white">
            {isDirty ? '저장되지 않은 파라미터 변경' : hasRun ? '시뮬레이션이 고정됨' : '미리보기 준비 완료'}
          </div>
        </div>
      </div>
    </section>
  );
}
