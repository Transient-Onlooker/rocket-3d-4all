import { simulateFlight } from '../physics/rocket';
import type { RocketParams, SimulationModelMode } from '../types/rocket';

export function computeSnapshot(params: RocketParams, modelMode: SimulationModelMode = 'professional') {
  return simulateFlight(params, modelMode);
}
