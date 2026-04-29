import { create } from 'zustand';
import { defaultParams, presets, type PresetKey } from '../config/simDefaults';
import type { RocketParams, SimEvent, SimSummary, TelemetryPoint } from '../types/rocket';
import { computeSnapshot } from '../utils/simSnapshot';

const STORAGE_KEY = 'rocket-flight-sim-state';

type SimStore = {
  params: RocketParams;
  telemetry: TelemetryPoint[];
  summary: SimSummary;
  warnings: string[];
  events: SimEvent[];
  launchReady: boolean;
  hasRun: boolean;
  selectedPreset: PresetKey | null;
  isDirty: boolean;
  playbackTime: number;
  setParam: <K extends keyof RocketParams>(key: K, value: RocketParams[K]) => void;
  setPlaybackTime: (time: number) => void;
  applyPreset: (presetKey: PresetKey) => void;
  runSimulation: () => void;
  resetSimulation: () => void;
};

const initialSnapshot = computeSnapshot(defaultParams);
const persistedState = loadPersistedState();
const bootPresetKey = persistedState?.selectedPreset ?? 'starter';
const bootParams = persistedState?.params ?? initialSnapshot.params;
const bootSnapshot = computeSnapshot(bootParams);
const bootIsDirty = bootPresetKey ? !areParamsEqual(bootSnapshot.params, presets[bootPresetKey].params) : true;

export const useSimStore = create<SimStore>((set) => ({
  params: bootSnapshot.params,
  telemetry: bootSnapshot.telemetry,
  summary: bootSnapshot.summary,
  warnings: bootSnapshot.warnings,
  events: bootSnapshot.events,
  launchReady: bootSnapshot.launchReady,
  hasRun: persistedState?.hasRun ?? false,
  selectedPreset: bootPresetKey,
  isDirty: bootIsDirty,
  playbackTime: 0,
  setParam: (key, value) =>
    set((state) => {
      const nextParams = {
        ...state.params,
        [key]: value,
      };
      const snapshot = computeSnapshot(nextParams);
      const isDirty = state.selectedPreset ? !areParamsEqual(snapshot.params, presets[state.selectedPreset].params) : true;
      persistState(snapshot.params, state.hasRun, state.selectedPreset);

      return {
        params: snapshot.params,
        telemetry: snapshot.telemetry,
        summary: snapshot.summary,
        warnings: snapshot.warnings,
        events: snapshot.events,
        launchReady: snapshot.launchReady,
        isDirty,
      };
    }),
  setPlaybackTime: (time) =>
    set(() => ({
      playbackTime: time,
    })),
  applyPreset: (presetKey) =>
    set(() => {
      const snapshot = computeSnapshot(presets[presetKey].params);
      persistState(snapshot.params, false, presetKey);
      return {
        params: snapshot.params,
        telemetry: snapshot.telemetry,
        summary: snapshot.summary,
        warnings: snapshot.warnings,
        events: snapshot.events,
        launchReady: snapshot.launchReady,
        hasRun: false,
        selectedPreset: presetKey,
        isDirty: false,
        playbackTime: 0,
      };
    }),
  runSimulation: () =>
    set((state) => {
      const snapshot = computeSnapshot(state.params);
      const isDirty = state.selectedPreset ? !areParamsEqual(snapshot.params, presets[state.selectedPreset].params) : true;
      persistState(snapshot.params, true, state.selectedPreset);
      return {
        params: snapshot.params,
        telemetry: snapshot.telemetry,
        summary: snapshot.summary,
        warnings: snapshot.warnings,
        events: snapshot.events,
        launchReady: snapshot.launchReady,
        hasRun: true,
        isDirty,
        playbackTime: 0,
      };
    }),
  resetSimulation: () =>
    set(() => {
      persistState(initialSnapshot.params, false, 'starter');
      return {
        params: initialSnapshot.params,
        telemetry: initialSnapshot.telemetry,
        summary: initialSnapshot.summary,
        warnings: initialSnapshot.warnings,
        events: initialSnapshot.events,
        launchReady: initialSnapshot.launchReady,
        hasRun: false,
        selectedPreset: 'starter',
        isDirty: false,
        playbackTime: 0,
      };
    }),
}));

function areParamsEqual(left: RocketParams, right: RocketParams) {
  return Object.keys(left).every((key) => left[key as keyof RocketParams] === right[key as keyof RocketParams]);
}

function loadPersistedState() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as {
      params: RocketParams;
      hasRun: boolean;
      selectedPreset: PresetKey | null;
    };
  } catch {
    return null;
  }
}

function persistState(params: RocketParams, hasRun: boolean, selectedPreset: PresetKey | null) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      params,
      hasRun,
      selectedPreset,
    }),
  );
}
