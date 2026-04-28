import type { TelemetryPoint } from '../types/rocket';

export function sampleTelemetry(points: TelemetryPoint[], targetCount = 180) {
  if (points.length <= targetCount) {
    return points;
  }

  const step = Math.ceil(points.length / targetCount);
  return points.filter((_, index) => index % step === 0 || index === points.length - 1);
}
