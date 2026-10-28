import { TelemetryPacket } from '../types/telemetry';
import { ThresholdConfig, ThresholdRule, AlarmIncident, AlertSeverity } from '../types/thresholds';

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  altitudeMaxWarning: 950,
  altitudeMaxCritical: 1150,
  tempInternalWarning: 42.0,
  tempInternalCritical: 55.0,
  tempAmbientMaxWarning: 38.0,
  descentVelocityCritical: -11.0, // faster than -11 m/s descent
  voltageMinWarning: 7.1,
  voltageMinCritical: 6.6,
  rssiMinWarning: -92,
  rssiMinCritical: -105,
  accelMaxWarning: 6.0,
};

class ThresholdService {
  private config: ThresholdConfig = { ...DEFAULT_THRESHOLDS };
  private incidents: AlarmIncident[] = [];
  private listeners: Set<(rules: ThresholdRule[], maxSeverity: AlertSeverity) => void> = new Set();
  private acknowledgedAlarms: Set<string> = new Set();

  public getConfig(): ThresholdConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<ThresholdConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public resetDefaults() {
    this.config = { ...DEFAULT_THRESHOLDS };
    this.acknowledgedAlarms.clear();
  }

  public getIncidents(): AlarmIncident[] {
    return [...this.incidents];
  }

  public clearIncidents() {
    this.incidents = [];
  }

  public acknowledgeAlarm(ruleId: string) {
    this.acknowledgedAlarms.add(ruleId);
  }

  public clearAcknowledgment(ruleId: string) {
    this.acknowledgedAlarms.delete(ruleId);
  }

  public isAcknowledged(ruleId: string): boolean {
    return this.acknowledgedAlarms.has(ruleId);
  }

  public onThresholdsChange(cb: (rules: ThresholdRule[], maxSeverity: AlertSeverity) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Evaluate a telemetry packet against all mission threshold limits
   */
  public evaluate(packet: TelemetryPacket): { rules: ThresholdRule[]; maxSeverity: AlertSeverity; activeViolations: ThresholdRule[] } {
    const rules: ThresholdRule[] = [];

    // 1. Altitude Monitoring
    let altSeverity: AlertSeverity = 'NOMINAL';
    let altMsg = 'Nominal altitude within mission profile.';
    let altRec = 'Maintain standard trajectory telemetry tracking.';
    if (packet.altitude >= this.config.altitudeMaxCritical) {
      altSeverity = 'CRITICAL';
      altMsg = `Altitude (${packet.altitude.toFixed(1)}m) has breached critical ceiling limit (${this.config.altitudeMaxCritical}m)!`;
      altRec = 'Immediate range safety notification. Prepare command for early apogee parachute deploy.';
    } else if (packet.altitude >= this.config.altitudeMaxWarning) {
      altSeverity = 'WARNING';
      altMsg = `Altitude (${packet.altitude.toFixed(1)}m) is approaching maximum ceiling (${this.config.altitudeMaxWarning}m).`;
      altRec = 'Monitor vertical rate closely and verify apogee detection sensor readiness.';
    }
    rules.push({
      id: 'altitude',
      parameter: 'altitude',
      name: 'Altitude Ceiling Limit',
      unit: 'm',
      maxWarning: this.config.altitudeMaxWarning,
      maxCritical: this.config.altitudeMaxCritical,
      currentValue: packet.altitude,
      severity: altSeverity,
      message: altMsg,
      recommendation: altRec,
    });

    // 2. Internal Avionics Temperature Monitoring
    let tempISeverity: AlertSeverity = 'NOMINAL';
    let tempIMsg = 'Avionics temperature nominal.';
    let tempIRec = 'Active cooling not required.';
    if (packet.tempInternal >= this.config.tempInternalCritical) {
      tempISeverity = 'CRITICAL';
      tempIMsg = `Avionics temp (${packet.tempInternal.toFixed(1)}°C) exceeds critical thermal threshold (${this.config.tempInternalCritical}°C)!`;
      tempIRec = 'Risk of MCU reboot or sensor drift. Power down high-load payloads (camera/transmitter power).';
    } else if (packet.tempInternal >= this.config.tempInternalWarning) {
      tempISeverity = 'WARNING';
      tempIMsg = `Avionics temp (${packet.tempInternal.toFixed(1)}°C) elevated above nominal limit (${this.config.tempInternalWarning}°C).`;
      tempIRec = 'Inspect current draw and payload power consumption.';
    }
    rules.push({
      id: 'tempInternal',
      parameter: 'tempInternal',
      name: 'Avionics Core Temperature',
      unit: '°C',
      maxWarning: this.config.tempInternalWarning,
      maxCritical: this.config.tempInternalCritical,
      currentValue: packet.tempInternal,
      severity: tempISeverity,
      message: tempIMsg,
      recommendation: tempIRec,
    });

    // 3. Battery Voltage Monitoring (2S LiPo)
    let voltSeverity: AlertSeverity = 'NOMINAL';
    let voltMsg = 'Battery pack voltage nominal.';
    let voltRec = 'Normal power bus operation.';
    if (packet.voltage <= this.config.voltageMinCritical) {
      voltSeverity = 'CRITICAL';
      voltMsg = `Battery voltage (${packet.voltage.toFixed(2)}V) has dropped below critical cutoff (${this.config.voltageMinCritical}V)!`;
      voltRec = 'Immediate brownout risk. Trigger emergency parachute ejection before power loss.';
    } else if (packet.voltage <= this.config.voltageMinWarning) {
      voltSeverity = 'WARNING';
      voltMsg = `Battery voltage (${packet.voltage.toFixed(2)}V) is low (below ${this.config.voltageMinWarning}V).`;
      voltRec = 'Reduce packet broadcast rate to 1 Hz to preserve cell capacity.';
    }
    rules.push({
      id: 'voltage',
      parameter: 'voltage',
      name: 'Battery Bus Voltage (2S)',
      unit: 'V',
      minWarning: this.config.voltageMinWarning,
      minCritical: this.config.voltageMinCritical,
      currentValue: packet.voltage,
      severity: voltSeverity,
      message: voltMsg,
      recommendation: voltRec,
    });

    // 4. Descent Velocity Monitoring
    // When descent rate is negative (falling down) and flightState is descent or apogee
    let descentSeverity: AlertSeverity = 'NOMINAL';
    let descentMsg = 'Descent velocity within safe parachute deceleration envelope.';
    let descentRec = 'Parachute functioning nominally.';
    if (packet.flightState === 'PARACHUTE_DESCENT' || packet.flightState === 'APOGEE') {
      if (packet.descentRate <= this.config.descentVelocityCritical) {
        descentSeverity = 'CRITICAL';
        descentMsg = `High velocity impact danger! Descent speed (${packet.descentRate.toFixed(1)} m/s) exceeds safety limit (${this.config.descentVelocityCritical} m/s)!`;
        descentRec = 'Possible parachute deployment failure or tangled shroud lines. Transmit backup parachute ejection command immediately.';
      } else if (packet.descentRate <= -8.5) {
        descentSeverity = 'WARNING';
        descentMsg = `Descent speed (${packet.descentRate.toFixed(1)} m/s) is higher than optimal (-6.0 m/s).`;
        descentRec = 'Prepare ground recovery team for hard landing.';
      }
    }
    rules.push({
      id: 'descentRate',
      parameter: 'descentRate',
      name: 'Descent Velocity Safety',
      unit: 'm/s',
      minCritical: this.config.descentVelocityCritical,
      currentValue: packet.descentRate,
      severity: descentSeverity,
      message: descentMsg,
      recommendation: descentRec,
    });

    // 5. Radio Signal Link (RSSI)
    let rssiSeverity: AlertSeverity = 'NOMINAL';
    let rssiMsg = 'ESP32 wireless telemetry link margin strong.';
    let rssiRec = 'Ground receiver antenna alignment optimal.';
    if (packet.rssi <= this.config.rssiMinCritical) {
      rssiSeverity = 'CRITICAL';
      rssiMsg = `Critical RF link margin degradation! RSSI (${packet.rssi} dBm) near receiver sensitivity floor!`;
      rssiRec = 'Re-orient ground receiver antenna towards CanSat azimuth and elevation.';
    } else if (packet.rssi <= this.config.rssiMinWarning) {
      rssiSeverity = 'WARNING';
      rssiMsg = `Weak RF signal link detected (RSSI: ${packet.rssi} dBm).`;
      rssiRec = 'Check ground receiver antenna cable and elevate receiver height.';
    }
    rules.push({
      id: 'rssi',
      parameter: 'rssi',
      name: 'ESP32 Wireless Link (RSSI)',
      unit: 'dBm',
      minWarning: this.config.rssiMinWarning,
      minCritical: this.config.rssiMinCritical,
      currentValue: packet.rssi,
      severity: rssiSeverity,
      message: rssiMsg,
      recommendation: rssiRec,
    });

    // 6. Net G-Force Acceleration
    const netG = Math.sqrt(packet.accelX * packet.accelX + packet.accelY * packet.accelY + packet.accelZ * packet.accelZ);
    let accelSeverity: AlertSeverity = 'NOMINAL';
    let accelMsg = 'Structural acceleration loading nominal.';
    let accelRec = 'No structural overload detected.';
    if (netG >= this.config.accelMaxWarning * 1.5) {
      accelSeverity = 'CRITICAL';
      accelMsg = `Extreme mechanical shock detected (${netG.toFixed(1)} G)!`;
      accelRec = 'Verify sensor calibration and structural integrity.';
    } else if (netG >= this.config.accelMaxWarning) {
      accelSeverity = 'WARNING';
      accelMsg = `High aerodynamic or launch acceleration (${netG.toFixed(1)} G).`;
      accelRec = 'Monitor IMU axes for stabilization tumbling.';
    }
    rules.push({
      id: 'accel',
      parameter: 'accel',
      name: 'Structural G-Force Loading',
      unit: 'G',
      maxWarning: this.config.accelMaxWarning,
      currentValue: netG,
      severity: accelSeverity,
      message: accelMsg,
      recommendation: accelRec,
    });

    // Determine max severity
    let maxSeverity: AlertSeverity = 'NOMINAL';
    const activeViolations = rules.filter((r) => r.severity !== 'NOMINAL');

    if (rules.some((r) => r.severity === 'CRITICAL')) {
      maxSeverity = 'CRITICAL';
    } else if (rules.some((r) => r.severity === 'WARNING')) {
      maxSeverity = 'WARNING';
    }

    // Record new incidents
    activeViolations.forEach((v) => {
      const existing = this.incidents.find((inc) => inc.parameter === v.parameter && !inc.resolved);
      if (!existing) {
        this.incidents.push({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: packet.timestamp || new Date().toTimeString().split(' ')[0],
          parameter: v.parameter,
          name: v.name,
          severity: v.severity,
          value: v.currentValue,
          limit: v.maxCritical || v.maxWarning || v.minCritical || v.minWarning || 0,
          unit: v.unit,
          resolved: false,
        });
        if (this.incidents.length > 50) this.incidents.shift();
      }
    });

    // Mark resolved
    this.incidents.forEach((inc) => {
      const match = rules.find((r) => r.parameter === inc.parameter);
      if (match && match.severity === 'NOMINAL') {
        inc.resolved = true;
      }
    });

    // Notify listeners
    this.listeners.forEach((cb) => cb(rules, maxSeverity));

    return { rules, maxSeverity, activeViolations };
  }
}

export const thresholdService = new ThresholdService();
