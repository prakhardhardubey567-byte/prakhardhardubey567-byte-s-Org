import { serialService } from './serialService';
import { FlightState } from '../types/telemetry';

class SimulationService {
  private timer: any = null;
  private isSimulating = false;
  private missionSeconds = 0;
  private packetNumber = 100;
  private state: FlightState = 'PRE_LAUNCH';
  private updateRateHz = 2; // 2 packets per second

  // Flight physics state
  private baseGroundAlt = 85; // MMMUT Gorakhpur elevation ~85m MSL
  private altitude = 85;
  private peakAlt = 85;
  private velocity = 0; // m/s
  private pitch = 0;
  private roll = 0;
  private yaw = 45;
  private lat = 26.73214;
  private lng = 83.43321;
  private voltage = 8.35; // 2S LiPo fully charged ~8.4V
  private tempAmbient = 24.8;
  private tempInternal = 28.1;

  public isRunning(): boolean {
    return this.isSimulating;
  }

  public start() {
    if (this.isSimulating) return;
    this.isSimulating = true;
    this.timer = setInterval(() => this.step(), 1000 / this.updateRateHz);
  }

  public stop() {
    this.isSimulating = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public setRate(hz: number) {
    this.updateRateHz = hz;
    if (this.isSimulating) {
      this.stop();
      this.start();
    }
  }

  public reset() {
    this.missionSeconds = 0;
    this.packetNumber = 1;
    this.state = 'PRE_LAUNCH';
    this.altitude = this.baseGroundAlt;
    this.peakAlt = this.baseGroundAlt;
    this.velocity = 0;
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 45;
    this.lat = 26.73214;
    this.lng = 83.43321;
    this.voltage = 8.38;
    serialService.resetPeakAltitude();
  }

  public triggerLaunch() {
    this.state = 'ASCENT';
    this.velocity = 38.5; // launch boost
  }

  public triggerParachute() {
    if (this.state === 'ASCENT' || this.state === 'APOGEE') {
      this.state = 'PARACHUTE_DESCENT';
      this.velocity = -5.8;
    }
  }

  private step() {
    const dt = 1 / this.updateRateHz;
    this.missionSeconds += dt;
    this.packetNumber++;

    // State machine physics
    if (this.state === 'PRE_LAUNCH') {
      this.velocity = 0;
      this.altitude = this.baseGroundAlt + (Math.random() * 0.4 - 0.2);
      this.pitch = (Math.random() * 0.4 - 0.2);
      this.roll = (Math.random() * 0.4 - 0.2);
      
      // Auto launch after 6 seconds of pre-launch
      if (this.missionSeconds > 6) {
        this.state = 'ASCENT';
        this.velocity = 42;
      }
    } else if (this.state === 'ASCENT') {
      // Powered ascent then coasting
      this.altitude += this.velocity * dt;
      this.velocity -= 9.81 * dt * 0.65; // rocket gravity deceleration

      // IMU orientation changes
      this.pitch = Math.sin(this.missionSeconds * 2.5) * 8;
      this.roll = (this.roll + 14 * dt) % 360;
      this.yaw = (this.yaw + 3 * dt) % 360;

      // Drift slightly northeast with wind
      this.lat += 0.000008 * dt;
      this.lng += 0.000012 * dt;

      if (this.velocity <= 0) {
        this.state = 'APOGEE';
        this.velocity = 0;
      }
    } else if (this.state === 'APOGEE') {
      this.pitch = -5 + Math.random() * 10;
      this.state = 'PARACHUTE_DESCENT';
      this.velocity = -6.2; // parachute open terminal descent velocity
    } else if (this.state === 'PARACHUTE_DESCENT') {
      // Steady parachute descent with slight thermal turbulence
      this.velocity = -6.2 + Math.sin(this.missionSeconds * 1.5) * 0.6;
      this.altitude += this.velocity * dt;

      // Parachute oscillation pendulum
      this.pitch = Math.sin(this.missionSeconds * 2) * 12;
      this.roll = Math.cos(this.missionSeconds * 1.8) * 14;
      this.yaw = (this.yaw + 5 * dt) % 360;

      // Wind drift
      this.lat += 0.000015 * dt;
      this.lng += 0.000022 * dt;

      if (this.altitude <= this.baseGroundAlt + 0.5) {
        this.altitude = this.baseGroundAlt;
        this.velocity = 0;
        this.state = 'TOUCHDOWN';
      }
    } else if (this.state === 'TOUCHDOWN') {
      this.velocity = 0;
      this.altitude = this.baseGroundAlt;
      this.pitch = 78; // resting on ground
      this.roll = 12;
    }

    if (this.altitude > this.peakAlt) {
      this.peakAlt = this.altitude;
    }

    // Barometric pressure formula: P = 1013.25 * (1 - 2.25577e-5 * h)^5.25588
    const altAboveSea = Math.max(0, this.altitude);
    const pressure = +(1013.25 * Math.pow(1 - 2.25577e-5 * altAboveSea, 5.25588)).toFixed(2);

    // Temperature lapse rate ~ 6.5°C per 1000m
    const lapse = (altAboveSea / 1000) * 6.5;
    this.tempAmbient = +(25.4 - lapse + (Math.random() * 0.2 - 0.1)).toFixed(2);
    this.tempInternal = +(this.tempAmbient + 3.8 + (Math.random() * 0.1)).toFixed(2);

    // DHT11 Relative Humidity (% RH) profile: higher at ground level (58%), drops with altitude
    const humidity = +(Math.max(22, 58.5 - (altAboveSea / 80) * 1.5 + (Math.random() * 0.8 - 0.4))).toFixed(1);

    // Battery slow discharge
    this.voltage = +(Math.max(6.8, this.voltage - 0.00005 * dt)).toFixed(2);

    // Accelerometer computation
    let ax = +(Math.sin(this.missionSeconds * 3) * 0.15).toFixed(2);
    let ay = +(Math.cos(this.missionSeconds * 3) * 0.12).toFixed(2);
    let az = 9.81;
    if (this.state === 'ASCENT') {
      az = +(9.81 + this.velocity * 0.4 + (Math.random() * 2 - 1)).toFixed(2);
    } else if (this.state === 'PARACHUTE_DESCENT') {
      az = +(9.81 + (Math.random() * 0.8 - 0.4)).toFixed(2);
    } else if (this.state === 'TOUCHDOWN') {
      az = +(9.81 * Math.cos((this.pitch * Math.PI) / 180)).toFixed(2);
    }

    // Radio RSSI based on altitude and distance
    const distFactor = Math.min(25, (this.altitude - this.baseGroundAlt) / 40);
    const rssi = Math.round(-68 - distFactor + (Math.random() * 4 - 2));

    // Synthesize CSV packet line
    const date = new Date();
    const timeStr = date.toTimeString().split(' ')[0];
    
    // FORMAT: TEAM_ID,PACKET,TIME,ALT,PRESS,TEMP_A,TEMP_I,VOLT,AX,AY,AZ,PITCH,ROLL,YAW,DESCENT,LAT,LNG,GPS_ALT,SATS,RSSI,STATE
    const csvLine = [
      'SPUTNIK',
      this.packetNumber,
      timeStr,
      this.altitude.toFixed(1),
      pressure,
      this.tempAmbient,
      this.tempInternal,
      this.voltage,
      ax,
      ay,
      az,
      this.pitch.toFixed(1),
      this.roll.toFixed(1),
      this.yaw.toFixed(1),
      this.velocity.toFixed(2),
      this.lat.toFixed(6),
      this.lng.toFixed(6),
      this.altitude.toFixed(1),
      11,
      rssi,
      this.state
    ].join(',');

    serialService.processLine(csvLine);
  }
}

export const simulationService = new SimulationService();
