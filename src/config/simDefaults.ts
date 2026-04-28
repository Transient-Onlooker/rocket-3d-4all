import type { RocketParams } from '../types/rocket';

export const defaultParams: RocketParams = {
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

export const presets = {
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
} satisfies Record<string, { label: string; params: RocketParams }>;

export type PresetKey = keyof typeof presets;
