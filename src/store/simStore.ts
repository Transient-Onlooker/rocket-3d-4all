import { create } from 'zustand';
import { simulateFlight } from '../physics/rocket';
import type { RocketParams, SimEvent, SimSummary, TelemetryPoint } from '../types/rocket';

const defaultParams: RocketParams = {
  initialMass: 12,
  fuelMass: 5,
  thrust: 900,
  isp: 180,
  launchAngleDeg: 82,
  dragCoefficient: 0.38,
  referenceArea: 0.012,
  launchRailLength: 2,
  windSpeed: 0,
  thrustRampPercent: 18,
};

export const presets: Record<string, { label: string; params: RocketParams }> = {
  starter: {
    label: 'Starter',
    params: defaultParams,
  },
  sounding: {
    label: 'Sounding',
    params: {
      initialMass: 28,
      fuelMass: 11,
      thrust: 2400,
      isp: 215,
      launchAngleDeg: 86,
      dragCoefficient: 0.26,
      referenceArea: 0.009,
      launchRailLength: 4,
      windSpeed: 6,
      thrustRampPercent: 12,
    },
  },
  windy: {
    label: 'Windy Test',
    params: {
      initialMass: 16,
      fuelMass: 6.5,
      thrust: 1250,
      isp: 175,
      launchAngleDeg: 78,
      dragCoefficient: 0.42,
      referenceArea: 0.015,
      launchRailLength: 3,
      windSpeed: 18,
      thrustRampPercent: 24,
    },
  },
};

type SimStore = {
  params: RocketParams;
  telemetry: TelemetryPoint[];
  summary: SimSummary;
  warnings: string[];
  events: SimEvent[];
  hasRun: boolean;
  setParam: <K extends keyof RocketParams>(key: K, value: RocketParams[K]) => void;
  applyPreset: (presetKey: keyof typeof presets) => void;
  runSimulation: () => void;
  resetSimulation: () => void;
};

function computeSnapshot(params: RocketParams) {
  return simulateFlight(params);
}

const initialSnapshot = computeSnapshot(defaultParams);

export const useSimStore = create<SimStore>((set) => ({
  params: initialSnapshot.params,
  telemetry: initialSnapshot.telemetry,
  summary: initialSnapshot.summary,
  warnings: initialSnapshot.warnings,
  events: initialSnapshot.events,
  hasRun: false,
  setParam: (key, value) =>
    set((state) => {
      const nextParams = {
        ...state.params,
        [key]: value,
      };
      const snapshot = computeSnapshot(nextParams);

      return {
        params: snapshot.params,
        telemetry: snapshot.telemetry,
        summary: snapshot.summary,
        warnings: snapshot.warnings,
        events: snapshot.events,
      };
    }),
  applyPreset: (presetKey) =>
    set(() => {
      const snapshot = computeSnapshot(presets[presetKey].params);
      return {
        params: snapshot.params,
        telemetry: snapshot.telemetry,
        summary: snapshot.summary,
        warnings: snapshot.warnings,
        events: snapshot.events,
        hasRun: false,
      };
    }),
  runSimulation: () =>
    set((state) => {
      const snapshot = computeSnapshot(state.params);
      return {
        params: snapshot.params,
        telemetry: snapshot.telemetry,
        summary: snapshot.summary,
        warnings: snapshot.warnings,
        events: snapshot.events,
        hasRun: true,
      };
    }),
  resetSimulation: () =>
    set(() => ({
      params: initialSnapshot.params,
      telemetry: initialSnapshot.telemetry,
      summary: initialSnapshot.summary,
      warnings: initialSnapshot.warnings,
      events: initialSnapshot.events,
      hasRun: false,
    })),
}));
