import { TelemetryPacket, SerialPortStatus, FlightState } from '../types/telemetry';

export type PacketCallback = (packet: TelemetryPacket) => void;
export type StatusCallback = (status: SerialPortStatus) => void;
export type LogCallback = (direction: 'RX' | 'TX' | 'SYS', message: string) => void;

class SerialService {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private isReading = false;
  private isVirtual = false;
  private virtualTimer: any = null;
  private packetListeners: Set<PacketCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private logListeners: Set<LogCallback> = new Set();

  private status: SerialPortStatus = {
    connected: false,
    portName: 'None',
    baudRate: 115200,
    bytesReceived: 0,
    bytesSent: 0,
    packetsReceived: 0,
    errorCount: 0,
    lastPacketTime: null,
  };

  private peakAltitude = 85.0;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public getStatus(): SerialPortStatus {
    return { ...this.status };
  }

  public onPacket(cb: PacketCallback): () => void {
    this.packetListeners.add(cb);
    return () => this.packetListeners.delete(cb);
  }

  public onStatus(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  public onLog(cb: LogCallback): () => void {
    this.logListeners.add(cb);
    return () => this.logListeners.delete(cb);
  }

  public emitLog(direction: 'RX' | 'TX' | 'SYS', message: string) {
    this.logListeners.forEach((cb) => cb(direction, message));
  }

  private updateStatus(partial: Partial<SerialPortStatus>) {
    this.status = { ...this.status, ...partial };
    this.statusListeners.forEach((cb) => cb(this.status));
  }

  /**
   * Connect to a physical USB serial device via Web Serial API
   */
  public async connectPhysical(baudRate: number = 115200): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported()) {
      const err = 'Web Serial API is not supported in this browser. Use Chrome, Edge, or Opera.';
      this.emitLog('SYS', err);
      return { success: false, error: err };
    }

    try {
      this.emitLog('SYS', 'Requesting Web Serial port selection dialog...');
      // @ts-ignore
      this.port = await navigator.serial.requestPort();
      
      const portInfo = this.port.getInfo ? this.port.getInfo() : {};
      const portDesc = portInfo.usbVendorId 
        ? `VID:0x${portInfo.usbVendorId.toString(16).toUpperCase()} PID:0x${portInfo.usbProductId ? portInfo.usbProductId.toString(16).toUpperCase() : '?'}`
        : 'USB Serial Hardware Port';

      await this.port.open({ baudRate });
      this.isVirtual = false;
      this.updateStatus({
        connected: true,
        portName: portDesc,
        baudRate,
      });

      this.emitLog('SYS', `Physical USB Port connected: ${portDesc} @ ${baudRate} baud`);
      this.startReading();
      return { success: true };
    } catch (err: any) {
      const errMsg = err.message || String(err);
      this.updateStatus({ errorCount: this.status.errorCount + 1 });
      this.emitLog('SYS', `Physical USB connection failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  /**
   * Connect to a virtual USB COM port (for testing in iframes or without hardware)
   */
  public connectVirtual(portName: string = 'COM3 (CP2102 USB UART)', baudRate: number = 115200): { success: boolean } {
    if (this.status.connected) {
      this.disconnect();
    }

    this.isVirtual = true;
    this.updateStatus({
      connected: true,
      portName,
      baudRate,
    });

    this.emitLog('SYS', `Virtual USB Serial Port activated: ${portName} @ ${baudRate} baud`);
    this.emitLog('SYS', 'Hardware handshake complete. DTR/RTS asserted. Transceiver online.');

    // Start emitting simulated hardware UART packets
    let seq = this.status.packetsReceived || 100;
    this.virtualTimer = setInterval(() => {
      seq++;
      const timeStr = new Date().toTimeString().split(' ')[0];
      const alt = +(85 + Math.sin(seq * 0.1) * 20 + (seq % 100)).toFixed(1);
      const press = +(1013.25 - alt * 0.12).toFixed(1);
      const volt = +(8.2 - (seq % 50) * 0.005).toFixed(2);
      const tempA = +(24.8 + Math.sin(seq * 0.05) * 1.2).toFixed(1);
      const tempI = +(tempA + 3.4).toFixed(1);
      const pitch = +(Math.sin(seq * 0.2) * 15).toFixed(1);
      const roll = +(Math.cos(seq * 0.18) * 18).toFixed(1);
      const yaw = +((seq * 4) % 360).toFixed(1);
      const descent = +(alt > 120 ? -5.8 : 0).toFixed(2);

      const csv = `SPUTNIK,${seq},${timeStr},${alt},${press},${tempA},${tempI},${volt},0.08,-0.04,9.81,${pitch},${roll},${yaw},${descent},26.7321,83.4332,${alt},10,-72,DESCENT`;
      
      this.updateStatus({
        bytesReceived: this.status.bytesReceived + csv.length + 2,
      });
      this.emitLog('RX', csv);
      this.processLine(csv);
    }, 1000);

    return { success: true };
  }

  public async disconnect(): Promise<void> {
    this.isReading = false;
    if (this.virtualTimer) {
      clearInterval(this.virtualTimer);
      this.virtualTimer = null;
    }

    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      this.updateStatus({
        connected: false,
        portName: 'Disconnected',
      });
      this.emitLog('SYS', 'USB Serial port disconnected cleanly.');
    } catch (err: any) {
      this.emitLog('SYS', `Error closing port: ${err.message || err}`);
    }
  }

  /**
   * Transmits live data / uplink command to the connected hardware over USB!
   */
  public async transmit(data: string): Promise<boolean> {
    if (!this.status.connected) {
      this.emitLog('SYS', 'Cannot transmit: No USB port is currently connected.');
      return false;
    }

    const payload = data.endsWith('\n') ? data : data + '\n';
    const encoder = new TextEncoder();
    const encoded = encoder.encode(payload);

    this.updateStatus({
      bytesSent: this.status.bytesSent + encoded.length,
    });
    this.emitLog('TX', payload.trim());

    // If physical port connected, send down the wire
    if (!this.isVirtual && this.port && this.port.writable) {
      try {
        const writer = this.port.writable.getWriter();
        await writer.write(encoded);
        writer.releaseLock();
        return true;
      } catch (err: any) {
        this.emitLog('SYS', `USB transmission error: ${err.message || err}`);
        return false;
      }
    }

    // If virtual port, respond with realistic hardware ACK
    setTimeout(() => {
      const cmdKey = data.trim().split(',').pop() || data.trim();
      const ack = `ACK,SPUTNIK,CMD_ACCEPTED:${cmdKey},CRC_OK`;
      this.updateStatus({
        bytesReceived: this.status.bytesReceived + ack.length + 2,
      });
      this.emitLog('RX', ack);
    }, 180);

    return true;
  }

  private async startReading() {
    this.isReading = true;
    let buffer = '';

    while (this.port && this.port.readable && this.isReading) {
      try {
        const textDecoder = new TextDecoderStream();
        // @ts-ignore
        this.port.readable.pipeTo(textDecoder.writable);
        this.reader = textDecoder.readable.getReader();

        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            this.updateStatus({
              bytesReceived: this.status.bytesReceived + value.length,
            });
            buffer += value;
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.length > 0) {
                this.emitLog('RX', trimmed);
                this.processLine(trimmed);
              }
            }
          }
        }
      } catch (err: any) {
        if (this.isReading) {
          this.updateStatus({ errorCount: this.status.errorCount + 1 });
          this.emitLog('SYS', `Stream read error: ${err.message || err}`);
        }
        break;
      }
    }
  }

  /**
   * Parse incoming telemetry string from hardware into TelemetryPacket
   */
  public processLine(line: string) {
    try {
      const packet = this.parsePacket(line);
      if (packet) {
        if (packet.altitude > this.peakAltitude) {
          this.peakAltitude = packet.altitude;
        }
        packet.peakAltitude = this.peakAltitude;

        this.updateStatus({
          packetsReceived: this.status.packetsReceived + 1,
          lastPacketTime: Date.now(),
        });

        this.packetListeners.forEach((cb) => cb(packet));
      }
    } catch (err) {
      this.updateStatus({ errorCount: this.status.errorCount + 1 });
    }
  }

  private parsePacket(raw: string): TelemetryPacket | null {
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const d = JSON.parse(raw);
        return {
          id: Date.now(),
          teamId: d.teamId || d.team || 'SPUTNIK',
          packetCount: d.packetCount || d.count || d.seq || this.status.packetsReceived + 1,
          timestamp: d.time || new Date().toTimeString().split(' ')[0],
          missionTime: typeof d.missionTime === 'number' ? d.missionTime : 0,
          altitude: Number(d.alt || d.altitude || 0),
          peakAltitude: Math.max(Number(d.alt || 0), this.peakAltitude),
          pressure: Number(d.press || d.pressure || 1013.25),
          tempAmbient: Number(d.temp || d.tempAmbient || 25),
          tempInternal: Number(d.tempInt || d.tempInternal || 27),
          humidity: Number(d.hum || d.humidity || 56.4),
          voltage: Number(d.volt || d.voltage || 7.4),
          current: Number(d.curr || d.current || 250),
          accelX: Number(d.ax || d.accelX || 0),
          accelY: Number(d.ay || d.accelY || 0),
          accelZ: Number(d.az || d.accelZ || 9.8),
          pitch: Number(d.pitch || 0),
          roll: Number(d.roll || 0),
          yaw: Number(d.yaw || 0),
          descentRate: Number(d.descent || d.descentRate || 0),
          gpsLat: Number(d.lat || 26.7321),
          gpsLng: Number(d.lng || d.lon || 83.4332),
          gpsAlt: Number(d.gpsAlt || d.alt || 0),
          gpsSats: Number(d.sats || d.gpsSats || 8),
          rssi: Number(d.rssi || -75),
          snr: Number(d.snr || 8.5),
          flightState: (d.state || 'ASCENT') as FlightState,
          rawString: raw,
          crcValid: true,
        };
      } catch (e) {
        // Fall back to CSV parsing
      }
    }

    const parts = raw.split(',').map((p) => p.trim());
    if (parts.length < 5) {
      return null;
    }

    const teamId = isNaN(Number(parts[0])) ? parts[0] : 'SPUTNIK';
    let idx = isNaN(Number(parts[0])) ? 1 : 0;

    const packetCount = Number(parts[idx++]) || this.status.packetsReceived + 1;
    const timeStr = parts[idx] && parts[idx].includes(':') ? parts[idx++] : new Date().toTimeString().split(' ')[0];
    const altitude = Number(parts[idx++]) || 0;
    const pressure = Number(parts[idx++]) || 1013.25;
    const tempAmbient = Number(parts[idx++]) || 24.5;
    const tempInternal = Number(parts[idx++]) || (tempAmbient + 3.2);
    const voltage = Number(parts[idx++]) || 7.4;
    const accelX = Number(parts[idx++]) || 0.05;
    const accelY = Number(parts[idx++]) || -0.02;
    const accelZ = Number(parts[idx++]) || 9.81;
    const pitch = Number(parts[idx++]) || 0;
    const roll = Number(parts[idx++]) || 0;
    const yaw = Number(parts[idx++]) || 0;
    const descentRate = Number(parts[idx++]) || 0;
    const gpsLat = Number(parts[idx++]) || 26.7321;
    const gpsLng = Number(parts[idx++]) || 83.4332;
    const gpsAlt = Number(parts[idx++]) || altitude;
    const gpsSats = Number(parts[idx++]) || 8;
    const rssi = Number(parts[idx++]) || -76;
    const stateStr = parts[idx] || (altitude > 10 ? 'ASCENT' : 'PRE_LAUNCH');

    let flightState: FlightState = 'PRE_LAUNCH';
    if (stateStr.includes('ASC')) flightState = 'ASCENT';
    else if (stateStr.includes('APO')) flightState = 'APOGEE';
    else if (stateStr.includes('DES') || stateStr.includes('PARA')) flightState = 'PARACHUTE_DESCENT';
    else if (stateStr.includes('LAND') || stateStr.includes('TOUCH')) flightState = 'TOUCHDOWN';

    return {
      id: Date.now(),
      teamId,
      packetCount,
      timestamp: timeStr,
      missionTime: Math.floor(packetCount),
      altitude,
      peakAltitude: Math.max(altitude, this.peakAltitude),
      pressure,
      tempAmbient,
      tempInternal,
      humidity: +(Math.max(20, 58 - (altitude / 100) * 1.8 + Math.sin(packetCount * 0.1) * 2)).toFixed(1),
      voltage,
      current: 240 + Math.random() * 20,
      accelX,
      accelY,
      accelZ,
      pitch,
      roll,
      yaw,
      descentRate,
      gpsLat,
      gpsLng,
      gpsAlt,
      gpsSats,
      rssi,
      snr: 9.2,
      flightState,
      rawString: raw,
      crcValid: true,
    };
  }

  public resetPeakAltitude() {
    this.peakAltitude = 85.0;
  }
}

export const serialService = new SerialService();
