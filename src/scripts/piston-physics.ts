/** Quasistatic monatomic ideal gas; P in kPa, V in L, energy in J.
 * 1 kPa L = 1 J. All paths start at (100 kPa, 10 L, 300 K). */
export type Process = 'isobaric' | 'isochoric' | 'isothermal';
export function pistonState(process: Process, progress: number, targetRatio: number) {
  const ratio = 1 + (targetRatio - 1) * Math.max(0, Math.min(1, progress));
  const volume = process === 'isochoric' ? 10 : 10 * ratio;
  const temperature = process === 'isothermal' ? 300 : 300 * ratio;
  const pressure = 1000 * (temperature / 300) / volume;
  const work = process === 'isochoric' ? 0 : process === 'isobaric' ? 1000 * (ratio - 1) : 1000 * Math.log(ratio);
  const internal = 5 * (temperature - 300); // (3/2)nR = 5 J/K
  return { volume, temperature, pressure, work, internal, heat: internal + work };
}
