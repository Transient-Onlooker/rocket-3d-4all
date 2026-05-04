const SEA_LEVEL_PRESSURE = 101325;
const SEA_LEVEL_TEMPERATURE = 288.15;
const LAPSE_RATE = 0.0065;
const GAS_CONSTANT = 287.05;
const GRAVITY = 9.80665;
const TROPOPAUSE_ALTITUDE = 11000;
const TROPOPAUSE_TEMPERATURE = 216.65;
const TROPOPAUSE_PRESSURE = 22632.06;
const SPECIFIC_HEAT_RATIO = 1.4;
const SUTHERLAND_REFERENCE_TEMPERATURE = 273.15;
const SUTHERLAND_REFERENCE_VISCOSITY = 1.716e-5;
const SUTHERLAND_CONSTANT = 110.4;

export function getAirDensity(altitudeMeters: number) {
  return getAtmosphereState(altitudeMeters).density;
}

export function getAtmosphereState(altitudeMeters: number) {
  const altitude = Math.max(0, altitudeMeters);
  let temperature: number;
  let pressure: number;

  if (altitude <= TROPOPAUSE_ALTITUDE) {
    temperature = SEA_LEVEL_TEMPERATURE - LAPSE_RATE * altitude;
    pressure =
      SEA_LEVEL_PRESSURE *
      Math.pow(temperature / SEA_LEVEL_TEMPERATURE, GRAVITY / (GAS_CONSTANT * LAPSE_RATE));
  } else {
    temperature = TROPOPAUSE_TEMPERATURE;
    pressure =
      TROPOPAUSE_PRESSURE *
      Math.exp((-GRAVITY * (altitude - TROPOPAUSE_ALTITUDE)) / (GAS_CONSTANT * TROPOPAUSE_TEMPERATURE));
  }

  const density = pressure / (GAS_CONSTANT * temperature);
  const speedOfSound = Math.sqrt(SPECIFIC_HEAT_RATIO * GAS_CONSTANT * temperature);
  const dynamicViscosity =
    SUTHERLAND_REFERENCE_VISCOSITY *
    Math.pow(temperature / SUTHERLAND_REFERENCE_TEMPERATURE, 1.5) *
    ((SUTHERLAND_REFERENCE_TEMPERATURE + SUTHERLAND_CONSTANT) / (temperature + SUTHERLAND_CONSTANT));

  return {
    density,
    pressure,
    temperature,
    speedOfSound,
    dynamicViscosity,
  };
}
