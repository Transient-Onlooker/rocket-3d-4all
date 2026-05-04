import { useRef, useState } from 'react';
import { presets } from '../config/simDefaults';
import { useSimStore } from '../store/simStore';
import type { RocketParams, SimulationModelMode } from '../types/rocket';

export function PresetPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState('');
  const params = useSimStore((state) => state.params);
  const modelMode = useSimStore((state) => state.modelMode);
  const setParams = useSimStore((state) => state.setParams);
  const setModelMode = useSimStore((state) => state.setModelMode);
  const applyPreset = useSimStore((state) => state.applyPreset);
  const selectedPreset = useSimStore((state) => state.selectedPreset);
  const isDirty = useSimStore((state) => state.isDirty);

  const handleExport = () => {
    const payload = {
      schema: 'rocket-3d-4all-preset',
      version: 1,
      exportedAt: new Date().toISOString(),
      modelMode,
      params,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rocket-preset-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;

    try {
      const raw = await file.text();
      const payload = JSON.parse(raw) as Partial<{
        schema: string;
        modelMode: SimulationModelMode;
        params: Partial<RocketParams>;
      }>;
      const importedParams = normalizePresetParams(payload.params);

      if (!importedParams) {
        throw new Error('Invalid preset params');
      }

      if (payload.modelMode === 'standard' || payload.modelMode === 'professional') {
        setModelMode(payload.modelMode);
      }
      setParams(importedParams);
      setImportStatus('프리셋 불러오기 완료');
    } catch {
      setImportStatus('JSON 프리셋을 읽지 못했습니다');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      window.setTimeout(() => setImportStatus(''), 2200);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">프리셋</h2>
          <p className="text-sm text-sky/70">출력 성향이 다른 발사 시나리오를 빠르게 불러와 비교할 수 있습니다.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/10 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-sky/65">
          {selectedPreset && !isDirty ? '프리셋 적용' : '사용자 설정'}
        </div>
      </div>
      <div className="grid gap-2">
        {Object.entries(presets).map(([key, preset]) => (
          <PresetButton
            key={key}
            active={selectedPreset === key && !isDirty}
            label={preset.label}
            meta={`${preset.params.thrust} N · ${preset.params.initialMass} kg · ${preset.params.launchAngleDeg}°`}
            onClick={() => applyPreset(key as keyof typeof presets)}
          />
        ))}
      </div>
      <div className="rounded-[1.25rem] border border-white/10 bg-black/10 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-300/15"
          >
            현재 설정 JSON 저장
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:border-orange-200/50 hover:bg-orange-300/15"
          >
            JSON 불러오기
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
        {importStatus ? <p className="mt-2 text-xs text-sky/65">{importStatus}</p> : null}
      </div>
    </section>
  );
}

function normalizePresetParams(params: Partial<RocketParams> | undefined): RocketParams | null {
  if (!params) return null;

  const requiredKeys: Array<keyof RocketParams> = [
    'initialMass',
    'fuelMass',
    'thrust',
    'isp',
    'launchAngleDeg',
    'dragCoefficient',
    'referenceArea',
    'launchRailLength',
    'windSpeed',
    'thrustRampPercent',
  ];

  if (!requiredKeys.every((key) => typeof params[key] === 'number' && Number.isFinite(params[key]))) {
    return null;
  }

  return Object.fromEntries(requiredKeys.map((key) => [key, Number(params[key])])) as RocketParams;
}

function PresetButton({
  active,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        'rounded-[1.35rem] border px-4 py-3 text-left transition',
        active
          ? 'border-sky-300/35 bg-sky-300/12 shadow-lg shadow-sky-950/20'
          : 'border-white/10 bg-white/5 hover:bg-white/10',
      ].join(' ')}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="font-semibold text-white">{label}</div>
        {active ? <span className="text-[10px] uppercase tracking-[0.25em] text-sky-100">선택됨</span> : null}
      </div>
      <div className="mt-1 text-xs text-sky/60">{meta}</div>
      <div className="mt-3 h-1.5 rounded-full bg-white/5">
        <div className={['h-full rounded-full bg-[linear-gradient(90deg,#7dd3fc,#fb923c)]', active ? 'w-full' : 'w-2/3 opacity-60'].join(' ')} />
      </div>
    </button>
  );
}
