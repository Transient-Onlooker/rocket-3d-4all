export type RocketParams = {
  initialMass: number;
  fuelMass: number;
  thrust: number;
  isp: number;
  launchAngleDeg: number;
  dragCoefficient: number;
  referenceArea: number;
  launchRailLength: number;
  windSpeed: number;
  thrustRampPercent: number;
};

export type SimulationModelMode = 'standard' | 'professional';

export type EngineeringLimits = {
  minRailExitSpeed: number;
  watchRailExitSpeed: number;
  maxDynamicPressureKpa: number;
  criticalDynamicPressureKpa: number;
  maxHeatFluxKwM2: number;
  criticalHeatFluxKwM2: number;
  maxTouchdownSpeed: number;
  criticalTouchdownSpeed: number;
  maxLossRatioPercent: number;
  criticalLossRatioPercent: number;
};

export type RocketState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
};

export type TelemetryPoint = RocketState & {
  t: number;
  speed: number;
  airRelativeSpeed: number;
  ax: number;
  ay: number;
  acceleration: number;
  thrust: number;
  drag: number;
  effectiveDragCoefficient: number;
  airDensity: number;
  mach: number;
  reynoldsNumber: number;
  heatFlux: number;
  dynamicPressure: number;
  gravity: number;
  fuelRemaining: number;
  flightPhase: 'rail' | 'powered' | 'coast' | 'descent';
};

export type SimSummary = {
  peakAltitude: number;
  peakSpeed: number;
  flightTime: number;
  downrangeDistance: number;
  maxAcceleration: number;
  burnoutTime: number;
  apogeeTime: number;
  maxDynamicPressure: number;
  maxDynamicPressureTime: number;
  maxMach: number;
  maxMachTime: number;
  maxReynoldsNumber: number;
  maxReynoldsNumberTime: number;
  maxHeatFlux: number;
  maxHeatFluxTime: number;
  estimatedDragLoss: number;
  estimatedGravityLoss: number;
  touchdownSpeed: number;
};

export type SimResult = {
  params: RocketParams;
  telemetry: TelemetryPoint[];
  summary: SimSummary;
  warnings: string[];
  events: SimEvent[];
  launchReady: boolean;
};

export type SimEvent = {
  id: string;
  label: string;
  time: number;
  value: string;
};

export type SimSnapshot = SimResult & {
  presetKey: string | null;
  hasRun: boolean;
  isDirty: boolean;
};
