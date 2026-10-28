export type AlertSeverity = 'NOMINAL' | 'WARNING' | 'CRITICAL';

export interface ThresholdRule {
  id: string;
  parameter: string;
  name: string;
  unit: string;
  minWarning?: number;
  minCritical?: number;
  maxWarning?: number;
  maxCritical?: number;
  currentValue: number;
  severity: AlertSeverity;
  message: string;
  recommendation: string;
}

export interface ThresholdConfig {
  altitudeMaxWarning: number; // m
  altitudeMaxCritical: number; // m
  tempInternalWarning: number; // °C
  tempInternalCritical: number; // °C
  tempAmbientMaxWarning: number; // °C
  descentVelocityCritical: number; // m/s (e.g. -11 m/s)
  voltageMinWarning: number; // V (e.g. 7.0V)
  voltageMinCritical: number; // V (e.g. 6.6V)
  rssiMinWarning: number; // dBm (e.g. -95 dBm)
  rssiMinCritical: number; // dBm (e.g. -105 dBm)
  accelMaxWarning: number; // G (e.g. 6.0 G)
}

export interface AlarmIncident {
  id: string;
  timestamp: string;
  parameter: string;
  name: string;
  severity: AlertSeverity;
  value: number;
  limit: number;
  unit: string;
  resolved: boolean;
}
