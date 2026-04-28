const SEA_LEVEL_PRESSURE = 101325;
const SEA_LEVEL_TEMPERATURE = 288.15;
const LAPSE_RATE = 0.0065;
const GAS_CONSTANT = 287.05;
const GRAVITY = 9.80665;
const TROPOPAUSE_ALTITUDE = 11000;
const TROPOPAUSE_TEMPERATURE = 216.65;
const TROPOPAUSE_PRESSURE = 22632.06;

export function getAirDensity(altitudeMeters: number) {
  const altitude = Math.max(0, altitudeMeters);

  if (altitude <= TROPOPAUSE_ALTITUDE) {
    const temperature = SEA_LEVEL_TEMPERATURE - LAPSE_RATE * altitude;
    const pressure =
      SEA_LEVEL_PRESSURE *
      Math.pow(temperature / SEA_LEVEL_TEMPERATURE, GRAVITY / (GAS_CONSTANT * LAPSE_RATE));
    return pressure / (GAS_CONSTANT * temperature);
  }

  const pressure =
    TROPOPAUSE_PRESSURE *
    Math.exp((-GRAVITY * (altitude - TROPOPAUSE_ALTITUDE)) / (GAS_CONSTANT * TROPOPAUSE_TEMPERATURE));

  return pressure / (GAS_CONSTANT * TROPOPAUSE_TEMPERATURE);
}
