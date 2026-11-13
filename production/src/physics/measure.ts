/** Independent measurements from raw samples; thresholds live in frozen data. */
import { contract, type Sample } from './engines.js';
export function measure(pendulum: Sample[], drop: Sample[], damped: Sample[]) {
  const crossings: number[] = [];
  for (let i = 1; i < pendulum.length; i++) {
    const a = pendulum[i - 1]!,
      b = pendulum[i]!;
    if (a.x > 0 && b.x <= 0) crossings.push(a.t + ((b.t - a.t) * a.x) / (a.x - b.x));
  }
  if (crossings.length < 3) throw Error('INSUFFICIENT_PENDULUM_CYCLES');
  const period = (crossings.at(-1)! - crossings[0]!) / (crossings.length - 1);
  const length = Math.hypot(contract.pendulum.x, contract.pendulum.y);
  const expectedPeriod = 2 * Math.PI * Math.sqrt(length / contract.gravity);
  // Impact time comes from actual velocity reversal, not speculative contacts.
  const first = drop.findIndex((s, i) => i > 0 && drop[i - 1]!.vy < 0 && s.vy > 0);
  if (first < 0) throw Error('NO_BOUNCE');
  const impact = drop[first]!;
  let apex = impact.y;
  for (let i = first + 1; i < drop.length; i++) {
    apex = Math.max(apex, drop[i]!.y);
    if (drop[i]!.vy <= 0) break;
  }
  const expectedFall = Math.sqrt(
    (2 * (contract.drop.height - contract.drop.radius)) / contract.gravity,
  );
  const expectedBounce =
    (contract.drop.height - contract.drop.radius) * contract.drop.restitution ** 2;
  const penetration = Math.max(0, ...drop.map((s) => contract.drop.radius - s.y));
  const penetrationSteps = drop.filter((s) => s.y < contract.drop.radius).length;
  const energy = (s: Sample) => 0.5 * (s.vx ** 2 + s.vy ** 2) + contract.gravity * (s.y + length);
  const initialEnergy = energy(damped[0]!),
    finalEnergy = energy(damped.at(-1)!);
  const metrics = {
    period,
    expectedPeriod,
    periodRelativeError: Math.abs(period / expectedPeriod - 1),
    fallSeconds: impact.t,
    expectedFallSeconds: expectedFall,
    fallRelativeError: Math.abs(impact.t / expectedFall - 1),
    bounceHeight: apex - contract.drop.radius,
    expectedBounceHeight: expectedBounce,
    bounceRelativeError: Math.abs((apex - contract.drop.radius) / expectedBounce - 1),
    maxPenetrationMeters: penetration,
    penetrationSteps,
    strictZeroPenetration: penetration === 0,
    dampedEnergyRatio: finalEnergy / initialEnergy,
    cycles: crossings.length - 1,
    simulatedSeconds: pendulum.at(-1)!.t + drop.at(-1)!.t + damped.at(-1)!.t,
  };
  const limits = contract.limits;
  const checks = {
    period: metrics.periodRelativeError <= limits.periodRelativeError,
    fall: metrics.fallRelativeError <= limits.fallRelativeError,
    bounce: metrics.bounceRelativeError <= limits.bounceRelativeError,
    engineeringPenetration: penetration <= limits.engineeringPenetrationMeters,
    damping: finalEnergy < initialEnergy * 0.1,
  };
  return { metrics, checks, engineeringPass: Object.values(checks).every(Boolean) };
}
