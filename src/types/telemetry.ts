export type FlightState = 
  | 'PRE_LAUNCH' 
  | 'ASCENT' 
  | 'APOGEE' 
  | 'PARACHUTE_DESCENT' 
  | 'TOUCHDOWN';

export interface TelemetryPacket {
  id: number;
  teamId: string;
  packetCount: number;
  timestamp: string; // HH:MM:SS
  missionTime: number; // seconds
  altitude: number; // m
  peakAltitude: number; // m
  pressure: number; // hPa
  tempAmbient: number; // °C
  tempInternal: number; // °C
  humidity: number; // % RH (DHT11 Digital Sensor)
  voltage: number; // V
  current: number; // mA
  accelX: number; // g
  accelY: number; // g
  accelZ: number; // g
  pitch: number; // deg
  roll: number; // deg
  yaw: number; // deg
  descentRate: number; // m/s
  gpsLat: number; // deg
  gpsLng: number; // deg
  gpsAlt: number; // m
  gpsSats: number;
  rssi: number; // dBm
  snr: number; // dB
  flightState: FlightState;
  rawString: string;
  crcValid: boolean;
}

export interface SerialPortStatus {
  connected: boolean;
  portName: string;
  baudRate: number;
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  errorCount: number;
  lastPacketTime: number | null;
}

export interface UplinkCommand {
  id: string;
  code: string;
  label: string;
  description: string;
  payload: string;
}

export interface BridgeConfig {
  wsPort: number;
  openMctUrl: string;
  bridgeStatus: 'OFFLINE' | 'STARTING' | 'RUNNING' | 'ERROR';
  openMctStatus: 'WAITING_FOR_BRIDGE' | 'CONNECTED' | 'DISCONNECTED';
  packetsRelayed: number;
}
