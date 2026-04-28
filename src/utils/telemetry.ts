import * as THREE from 'three';
import type { TelemetryPoint } from '../types/rocket';

export function interpolateTelemetry(telemetry: TelemetryPoint[], time: number): TelemetryPoint {
  if (telemetry.length === 0) {
    return {
      t: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: 0,
      speed: 0,
      airRelativeSpeed: 0,
      ax: 0,
      ay: 0,
      acceleration: 0,
      thrust: 0,
      drag: 0,
      airDensity: 0,
      dynamicPressure: 0,
      gravity: 0,
      fuelRemaining: 0,
      flightPhase: 'coast',
    };
  }

  const nextIndex = telemetry.findIndex((point) => point.t >= time);
  if (nextIndex === -1) {
    return telemetry[telemetry.length - 1];
  }

  if (nextIndex === 0) {
    return telemetry[0];
  }

  const previous = telemetry[nextIndex - 1];
  const next = telemetry[nextIndex];
  const duration = Math.max(0.0001, next.t - previous.t);
  const ratio = (time - previous.t) / duration;
  const phase = ratio < 0.5 ? previous.flightPhase : next.flightPhase;

  return {
    ...previous,
    t: time,
    x: THREE.MathUtils.lerp(previous.x, next.x, ratio),
    y: THREE.MathUtils.lerp(previous.y, next.y, ratio),
    vx: THREE.MathUtils.lerp(previous.vx, next.vx, ratio),
    vy: THREE.MathUtils.lerp(previous.vy, next.vy, ratio),
    mass: THREE.MathUtils.lerp(previous.mass, next.mass, ratio),
    speed: THREE.MathUtils.lerp(previous.speed, next.speed, ratio),
    airRelativeSpeed: THREE.MathUtils.lerp(previous.airRelativeSpeed, next.airRelativeSpeed, ratio),
    ax: THREE.MathUtils.lerp(previous.ax, next.ax, ratio),
    ay: THREE.MathUtils.lerp(previous.ay, next.ay, ratio),
    acceleration: THREE.MathUtils.lerp(previous.acceleration, next.acceleration, ratio),
    thrust: THREE.MathUtils.lerp(previous.thrust, next.thrust, ratio),
    drag: THREE.MathUtils.lerp(previous.drag, next.drag, ratio),
    airDensity: THREE.MathUtils.lerp(previous.airDensity, next.airDensity, ratio),
    dynamicPressure: THREE.MathUtils.lerp(previous.dynamicPressure, next.dynamicPressure, ratio),
    gravity: THREE.MathUtils.lerp(previous.gravity, next.gravity, ratio),
    fuelRemaining: THREE.MathUtils.lerp(previous.fuelRemaining, next.fuelRemaining, ratio),
    flightPhase: phase,
  };
}
