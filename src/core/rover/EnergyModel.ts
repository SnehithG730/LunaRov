import { RoverConfig } from '@/types/rover';
import { LUNAR_GRAVITY, REGOLITH_ROLLING_RESISTANCE } from '@/lib/constants';

export class EnergyModel {
  /**
   * Calculates instantaneous power draw in Watts
   * @param config Rover specification
   * @param velocity Current speed (m/s)
   * @param slopeDeg Slope in direction of travel (degrees: positive = uphill, negative = downhill)
   * @param roughness Surface friction multiplier
   */
  public static calculatePowerDrawWatts(
    config: RoverConfig,
    velocity: number,
    slopeDeg: number,
    roughness: number
  ): number {
    const basePower = config.baselinePowerWatts;
    if (velocity <= 0.01) {
      return basePower; // Idle avionics/heaters
    }

    const m = config.massKg;
    const g = LUNAR_GRAVITY;
    const safeSlope = isNaN(slopeDeg) || slopeDeg === undefined ? 0 : slopeDeg;
    const slopeRad = (safeSlope * Math.PI) / 180;

    // Rolling resistance force: F_rr = Crr * m * g * cos(theta)
    const fRolling = REGOLITH_ROLLING_RESISTANCE * m * g * Math.cos(slopeRad);

    // Gravity force component: F_g = m * g * sin(theta)
    const fGravity = m * g * Math.sin(slopeRad);

    // Total mechanical tractive force required at wheels
    let fTractive = fRolling + fGravity;

    // Apply surface roughness penalty
    fTractive *= Math.max(1.0, roughness);

    // Motor mechanical power: P_mech = F * v / efficiency
    // Incline downhill can reduce power, but minimum is baseline rolling
    const efficiency = Math.max(0.3, config.movementEfficiency || 1.0);
    let pMotor = (fTractive * velocity * config.motorPowerPerKg) / efficiency;

    if (pMotor < 0) {
      // Downhill coasting / partial regenerative braking floor
      pMotor = 0;
    }

    return basePower + pMotor;
  }

  /**
   * Calculates energy drained during delta time (seconds) in Watt-hours
   */
  public static calculateEnergyDrainWh(powerWatts: number, dtSeconds: number): number {
    return (powerWatts * dtSeconds) / 3600;
  }
}
