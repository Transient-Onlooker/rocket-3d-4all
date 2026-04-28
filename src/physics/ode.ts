export function rk4Step(
  state: number[],
  time: number,
  dt: number,
  derivatives: (t: number, y: number[]) => number[],
) {
  const k1 = derivatives(time, state);
  const k2 = derivatives(time + dt / 2, add(state, scale(k1, dt / 2)));
  const k3 = derivatives(time + dt / 2, add(state, scale(k2, dt / 2)));
  const k4 = derivatives(time + dt, add(state, scale(k3, dt)));

  return state.map(
    (value, index) => value + (dt / 6) * (k1[index] + 2 * k2[index] + 2 * k3[index] + k4[index]),
  );
}

function add(left: number[], right: number[]) {
  return left.map((value, index) => value + right[index]);
}

function scale(values: number[], factor: number) {
  return values.map((value) => value * factor);
}
