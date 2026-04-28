import { simulateFlight } from '../physics/rocket';
import type { RocketParams } from '../types/rocket';

export function computeSnapshot(params: RocketParams) {
  return simulateFlight(params);
}
