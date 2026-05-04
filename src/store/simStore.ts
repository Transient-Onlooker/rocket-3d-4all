import { create } from 'zustand';
import { defaultParams, presets, type PresetKey } from '../config/simDefaults';
import type { EngineeringLimits, RocketParams, SimEvent, SimSummary, SimulationModelMode, TelemetryPoint } from '../types/rocket';
import { computeSnapshot } from '../utils/simSnapshot';

const STORAGE_KEY = 'rocket-flight-sim-state';
const defaultEngineeringLimits: EngineeringLimits = {
  minRailExitSpeed: 16,
  watchRailExitSpeed: 10,
  maxDynamicPressureKpa: 45,
  criticalDynamicPressureKpa: 70,
  maxHeatFluxKwM2: 120,
  criticalHeatFluxKwM2: 220,
  maxTouchdownSpeed: 25,
  criticalTouchdownSpeed: 45,
  maxLossRatioPercent: 35,
  criticalLossRatioPercent: 60,
};

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
  modelMode: SimulationModelMode;
  engineeringLimits: EngineeringLimits;
  setParam: <K extends keyof RocketParams>(key: K, value: RocketParams[K]) => void;
  setParams: (params: RocketParams) => void;
  setModelMode: (modelMode: SimulationModelMode) => void;
  setEngineeringLimit: <K extends keyof EngineeringLimits>(key: K, value: EngineeringLimits[K]) => void;
  setPlaybackTime: (time: number) => void;
  applyPreset: (presetKey: PresetKey) => void;
  runSimulation: () => void;
  resetSimulation: () => void;
};

const persistedState = loadPersistedState();
const bootModelMode = persistedState?.modelMode ?? 'professional';
const bootEngineeringLimits = {
  ...defaultEngineeringLimits,
  ...persistedState?.engineeringLimits,
};
const initialSnapshot = computeSnapshot(defaultParams, bootModelMode);
const bootPresetKey = persistedState?.selectedPreset ?? 'starter';
const bootParams = persistedState?.params ?? initialSnapshot.params;
const bootSnapshot = computeSnapshot(bootParams, bootModelMode);
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
  modelMode: bootModelMode,
  engineeringLimits: bootEngineeringLimits,
  setParam: (key, value) =>
    set((state) => {
      const nextParams = {
        ...state.params,
        [key]: value,
      };
      const snapshot = computeSnapshot(nextParams, state.modelMode);
      const isDirty = state.selectedPreset ? !areParamsEqual(snapshot.params, presets[state.selectedPreset].params) : true;
      persistState(snapshot.params, state.hasRun, state.selectedPreset, state.modelMode, state.engineeringLimits);

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
  setParams: (params) =>
    set((state) => {
      const snapshot = computeSnapshot(params, state.modelMode);
      const isDirty = state.selectedPreset ? !areParamsEqual(snapshot.params, presets[state.selectedPreset].params) : true;
      persistState(snapshot.params, state.hasRun, state.selectedPreset, state.modelMode, state.engineeringLimits);

      return {
        params: snapshot.params,
        telemetry: snapshot.telemetry,
        summary: snapshot.summary,
        warnings: snapshot.warnings,
        events: snapshot.events,
        launchReady: snapshot.launchReady,
        isDirty,
        playbackTime: 0,
      };
    }),
  setModelMode: (modelMode) =>
    set((state) => {
      const snapshot = computeSnapshot(state.params, modelMode);
      persistState(snapshot.params, state.hasRun, state.selectedPreset, modelMode, state.engineeringLimits);

      return {
        params: snapshot.params,
        telemetry: snapshot.telemetry,
        summary: snapshot.summary,
        warnings: snapshot.warnings,
        events: snapshot.events,
        launchReady: snapshot.launchReady,
        modelMode,
        playbackTime: 0,
      };
    }),
  setEngineeringLimit: (key, value) =>
    set((state) => {
      const engineeringLimits = {
        ...state.engineeringLimits,
        [key]: value,
      };
      persistState(state.params, state.hasRun, state.selectedPreset, state.modelMode, engineeringLimits);

      return {
        engineeringLimits,
      };
    }),
  setPlaybackTime: (time) =>
    set((state) => {
      if (Math.abs(state.playbackTime - time) <= 0.01) {
        return state;
      }

      return {
        playbackTime: time,
      };
    }),
  applyPreset: (presetKey) =>
    set((state) => {
      const snapshot = computeSnapshot(presets[presetKey].params, state.modelMode);
      persistState(snapshot.params, false, presetKey, state.modelMode, state.engineeringLimits);
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
      const snapshot = computeSnapshot(state.params, state.modelMode);
      const isDirty = state.selectedPreset ? !areParamsEqual(snapshot.params, presets[state.selectedPreset].params) : true;
      persistState(snapshot.params, true, state.selectedPreset, state.modelMode, state.engineeringLimits);
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
      persistState(initialSnapshot.params, false, 'starter', bootModelMode, bootEngineeringLimits);
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
        modelMode: bootModelMode,
        engineeringLimits: bootEngineeringLimits,
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
      modelMode?: SimulationModelMode;
      engineeringLimits?: Partial<EngineeringLimits>;
    };
  } catch {
    return null;
  }
}

function persistState(
  params: RocketParams,
  hasRun: boolean,
  selectedPreset: PresetKey | null,
  modelMode: SimulationModelMode,
  engineeringLimits: EngineeringLimits,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      params,
      hasRun,
      selectedPreset,
      modelMode,
      engineeringLimits,
    }),
  );
}
