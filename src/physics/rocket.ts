import { getAirDensity } from './atmosphere';
import { rk4Step } from './ode';
import type { RocketParams, SimEvent, SimResult, TelemetryPoint } from '../types/rocket';

const G0 = 9.80665;
const DT = 0.05;
const MAX_TIME = 240;
const DRY_MASS_FLOOR = 0.1;
const MIN_LAUNCH_SPEED = 1e-6;
const EARTH_RADIUS = 6_371_000;

export function simulateFlight(rawParams: RocketParams): SimResult {
  const { params, warnings, launchReady } = sanitizeParams(rawParams);
  const dryMass = Math.max(DRY_MASS_FLOOR, params.initialMass - params.fuelMass);

  if (!launchReady) {
    const groundedPoint: TelemetryPoint = {
      t: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: params.initialMass,
      speed: 0,
      airRelativeSpeed: Math.abs(params.windSpeed),
      ax: 0,
      ay: 0,
      acceleration: 0,
      thrust: params.thrust,
      drag: 0,
      airDensity: getAirDensity(0),
      dynamicPressure: 0,
      gravity: G0,
      fuelRemaining: params.fuelMass,
      flightPhase: 'rail',
    };

    return {
      params,
      telemetry: [groundedPoint],
      summary: summarizeFlight([groundedPoint]),
      warnings,
      events: [],
      launchReady,
    };
  }

  let stateVector = [0, 0, 0, 0, params.initialMass];
  let time = 0;
  const points: TelemetryPoint[] = [];
  const derivatives = makeDerivatives(params, dryMass);

  while (time <= MAX_TIME) {
    const [x, y, vx, vy, mass] = stateVector;
    const state = evaluateState(params, dryMass, stateVector);
    const [dxdt, dydt, dvxdt, dvydt] = derivatives(time, stateVector);
    const speed = Math.hypot(vx, vy);
    const positionAlongRail = x * Math.cos(state.theta) + y * Math.sin(state.theta);
    const isOnRail = positionAlongRail < params.launchRailLength && state.activeThrust > 0;

    points.push({
      t: time,
      x,
      y: Math.max(0, y),
      vx,
      vy,
      mass,
      speed,
      airRelativeSpeed: state.airRelativeSpeed,
      ax: dvxdt,
      ay: dvydt,
      acceleration: Math.hypot(dvxdt, dvydt),
      thrust: state.activeThrust,
      drag: state.dragMagnitude,
      airDensity: state.density,
      dynamicPressure: state.dynamicPressure,
      gravity: state.gravity,
      fuelRemaining: Math.max(0, mass - dryMass),
      flightPhase: isOnRail ? 'rail' : state.activeThrust > 0 ? 'powered' : vy >= 0 ? 'coast' : 'descent',
    });

    const next = rk4Step(stateVector, time, DT, derivatives);
    next[4] = Math.max(dryMass, next[4]);
    stateVector = next;
    time += DT;

    const onGround = time > 0.25 && stateVector[1] <= 0 && points.length > 3;
    if (onGround) {
      const lastPoint = points[points.length - 1];
      if (lastPoint) {
        lastPoint.y = 0;
      }
      break;
    }
  }

  return {
    params,
    telemetry: points,
    summary: summarizeFlight(points),
    warnings,
    events: extractEvents(points),
    launchReady,
  };
}

function makeDerivatives(params: RocketParams, dryMass: number) {
  return (_t: number, state: number[]) => {
    const [, , vx, vy, mass] = state;
    const resolved = evaluateState(params, dryMass, state);
    const railProjection = state[0] * Math.cos(resolved.theta) + state[1] * Math.sin(resolved.theta);
    const onRail = railProjection < params.launchRailLength && resolved.activeThrust > 0;

    let ax = (resolved.activeThrust * Math.cos(resolved.theta) - resolved.dragX) / mass;
    let ay = (resolved.activeThrust * Math.sin(resolved.theta) - resolved.dragY) / mass - resolved.gravity;

    if (onRail) {
      const alongRailAccel = ax * Math.cos(resolved.theta) + ay * Math.sin(resolved.theta);
      ax = alongRailAccel * Math.cos(resolved.theta);
      ay = alongRailAccel * Math.sin(resolved.theta);
    }

    return [vx, vy, ax, ay, -resolved.activeMassFlowRate];
  };
}

function evaluateState(params: RocketParams, dryMass: number, state: number[]) {
  const [, y, vx, vy, mass] = state;
  const theta = (params.launchAngleDeg * Math.PI) / 180;
  const gravity = getGravity(y);
  const fuelRemaining = Math.max(0, mass - dryMass);
  const fuelFraction = params.fuelMass > 0 ? fuelRemaining / params.fuelMass : 0;
  const thrustScale = getThrustScale(fuelFraction, params.thrustRampPercent);
  const activeThrust = fuelRemaining > 0 ? params.thrust * thrustScale : 0;
  const activeMassFlowRate = activeThrust > 0 ? activeThrust / (params.isp * G0) : 0;
  const density = getAirDensity(y);
  const airRelativeVx = vx - params.windSpeed;
  const airRelativeVy = vy;
  const airRelativeSpeed = Math.max(MIN_LAUNCH_SPEED, Math.hypot(airRelativeVx, airRelativeVy));
  const dynamicPressure = 0.5 * density * airRelativeSpeed * airRelativeSpeed;
  const dragMagnitude = dynamicPressure * params.dragCoefficient * params.referenceArea;
  const dragX = dragMagnitude * (airRelativeVx / airRelativeSpeed);
  const dragY = dragMagnitude * (airRelativeVy / airRelativeSpeed);

  return {
    activeThrust,
    activeMassFlowRate,
    density,
    dragMagnitude,
    dynamicPressure,
    airRelativeSpeed,
    gravity,
    dragX,
    dragY,
    fuelRemaining,
    theta,
  };
}

export function summarizeFlight(points: TelemetryPoint[]) {
  const burnoutPoint = points.find((point) => point.flightPhase !== 'rail' && point.flightPhase !== 'powered');
  const apogeePoint = points.reduce<TelemetryPoint | null>(
    (highest, point) => (!highest || point.y > highest.y ? point : highest),
    null,
  );
  const lastPoint = points[points.length - 1];
  const maxQPoint = points.reduce<TelemetryPoint | null>(
    (highest, point) => (!highest || point.dynamicPressure > highest.dynamicPressure ? point : highest),
    null,
  );

  return points.reduce(
    (summary, point) => ({
      peakAltitude: Math.max(summary.peakAltitude, point.y),
      peakSpeed: Math.max(summary.peakSpeed, point.speed),
      flightTime: lastPoint?.t ?? point.t,
      downrangeDistance: Math.max(summary.downrangeDistance, point.x),
      maxAcceleration: Math.max(summary.maxAcceleration, point.acceleration),
      burnoutTime: burnoutPoint?.t ?? 0,
      apogeeTime: apogeePoint?.t ?? 0,
      maxDynamicPressure: maxQPoint?.dynamicPressure ?? 0,
      maxDynamicPressureTime: maxQPoint?.t ?? 0,
      touchdownSpeed: lastPoint?.speed ?? 0,
    }),
    {
      peakAltitude: 0,
      peakSpeed: 0,
      flightTime: 0,
      downrangeDistance: 0,
      maxAcceleration: 0,
      burnoutTime: 0,
      apogeeTime: 0,
      maxDynamicPressure: 0,
      maxDynamicPressureTime: 0,
      touchdownSpeed: 0,
    },
  );
}

function sanitizeParams(params: RocketParams) {
  const warnings: string[] = [];
  const initialMass = clamp(params.initialMass, 1, 100);
  const requestedFuelMass = clamp(params.fuelMass, 0.5, 50);
  const fuelMass = Math.min(requestedFuelMass, initialMass - DRY_MASS_FLOOR);
  const thrust = clamp(params.thrust, 10, 5000);
  const isp = clamp(params.isp, 50, 300);
  const launchAngleDeg = clamp(params.launchAngleDeg, 45, 90);
  const dragCoefficient = clamp(params.dragCoefficient, 0.1, 0.8);
  const referenceArea = clamp(params.referenceArea, 0.001, 0.1);
  const launchRailLength = clamp(params.launchRailLength, 0.5, 12);
  const windSpeed = clamp(params.windSpeed, -60, 60);
  const thrustRampPercent = clamp(params.thrustRampPercent, 0, 60);

  if (requestedFuelMass !== fuelMass) {
    warnings.push('Fuel mass was clamped to stay below total initial mass.');
  }

  const launchReady = thrust > initialMass * G0;

  if (!launchReady) {
    warnings.push('추력이 중량보다 낮아 이륙할 수 없습니다. 추력을 높이거나 초기 질량을 줄이세요.');
  }

  if (Math.abs(windSpeed) > 20) {
    warnings.push('강한 횡풍이 설정되어 있습니다. 공력 손실이 커지고 사거리가 크게 달라질 수 있습니다.');
  }

  return {
    params: {
      initialMass,
      fuelMass,
      thrust,
      isp,
      launchAngleDeg,
      dragCoefficient,
      referenceArea,
      launchRailLength,
      windSpeed,
      thrustRampPercent,
    },
    warnings,
    launchReady,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getGravity(altitudeMeters: number) {
  const altitude = Math.max(0, altitudeMeters);
  return G0 * Math.pow(EARTH_RADIUS / (EARTH_RADIUS + altitude), 2);
}

function getThrustScale(fuelFraction: number, rampPercent: number) {
  const clamped = clamp(fuelFraction, 0, 1);
  const rampWindow = rampPercent / 100;

  if (rampWindow <= 0) {
    return 1;
  }

  if (clamped > 1 - rampWindow) {
    const normalized = (clamped - (1 - rampWindow)) / rampWindow;
    return 0.82 + 0.18 * normalized;
  }

  if (clamped < rampWindow) {
    const normalized = clamped / rampWindow;
    return 0.7 + 0.3 * normalized;
  }

  return 1;
}

function extractEvents(points: TelemetryPoint[]): SimEvent[] {
  const railClear = points.find((point) => point.flightPhase !== 'rail');
  const burnout = points.find((point) => point.flightPhase === 'coast' || point.flightPhase === 'descent');
  const apogee = points.reduce<TelemetryPoint | null>(
    (highest, point) => (!highest || point.y > highest.y ? point : highest),
    null,
  );
  const maxQ = points.reduce<TelemetryPoint | null>(
    (highest, point) => (!highest || point.dynamicPressure > highest.dynamicPressure ? point : highest),
    null,
  );
  const touchdown = points[points.length - 1];

  return [
    railClear
      ? {
          id: 'rail-clear',
          label: 'Rail clear',
          time: railClear.t,
          value: `${railClear.speed.toFixed(1)} m/s`,
        }
      : null,
    burnout
      ? {
          id: 'burnout',
          label: 'Burnout',
          time: burnout.t,
          value: `${burnout.y.toFixed(0)} m`,
        }
      : null,
    maxQ
      ? {
          id: 'max-q',
          label: 'Max-Q',
          time: maxQ.t,
          value: `${(maxQ.dynamicPressure / 1000).toFixed(1)} kPa`,
        }
      : null,
    apogee
      ? {
          id: 'apogee',
          label: 'Apogee',
          time: apogee.t,
          value: `${apogee.y.toFixed(0)} m`,
        }
      : null,
    touchdown
      ? {
          id: 'touchdown',
          label: 'Touchdown',
          time: touchdown.t,
          value: `${touchdown.speed.toFixed(1)} m/s`,
        }
      : null,
  ].filter((event): event is SimEvent => Boolean(event));
}
