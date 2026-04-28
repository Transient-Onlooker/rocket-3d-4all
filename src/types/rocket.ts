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
  airDensity: number;
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
  touchdownSpeed: number;
};

export type SimResult = {
  params: RocketParams;
  telemetry: TelemetryPoint[];
  summary: SimSummary;
  warnings: string[];
  events: SimEvent[];
};

export type SimEvent = {
  id: string;
  label: string;
  time: number;
  value: string;
};
