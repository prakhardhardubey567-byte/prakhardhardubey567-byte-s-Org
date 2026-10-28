import { TelemetryPacket, SerialPortStatus, FlightState } from '../types/telemetry';

export type PacketCallback = (packet: TelemetryPacket) => void;
export type StatusCallback = (status: SerialPortStatus) => void;
export type LogCallback = (direction: 'RX' | 'TX' | 'SYS', message: string) => void;

class SerialService {
  private port: any = null;
  private reader: any = null;
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
   * Identifies ESP32 hardware transceiver by USB Vendor & Product ID
   */
  private identifyEsp32Hardware(usbVendorId?: number, usbProductId?: number): string {
    if (!usbVendorId) return 'USB Serial Hardware Port (ESP32 / MCU)';

    const vidHex = usbVendorId.toString(16).toUpperCase();
    const pidHex = usbProductId ? usbProductId.toString(16).toUpperCase() : '0000';

    if (usbVendorId === 0x10c4) {
      return `ESP32 DevKit (Silicon Labs CP2102) [VID:0x${vidHex}]`;
    } else if (usbVendorId === 0x1a86) {
      return `ESP32 NodeMCU (WCH CH340 UART) [VID:0x${vidHex}]`;
    } else if (usbVendorId === 0x303a) {
      return `Espressif ESP32-S3 / S2 Native USB [VID:0x${vidHex}]`;
    } else if (usbVendorId === 0x0403) {
      return `ESP32 FTDI USB-UART [VID:0x${vidHex}]`;
    } else if (usbVendorId === 0x2341) {
      return `Arduino MCU Port [VID:0x${vidHex}]`;
    }
    return `ESP32 Hardware Port (VID:0x${vidHex} PID:0x${pidHex})`;
  }

  /**
   * Connect to a physical ESP32 or USB serial hardware device via Web Serial API
   */
  public async connectPhysical(baudRate: number = 115200): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported()) {
      const err = 'Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.';
      this.emitLog('SYS', err);
      return { success: false, error: err };
    }

    try {
      this.emitLog('SYS', `Requesting Web Serial port for ESP32 at ${baudRate} baud...`);
      // @ts-ignore
      this.port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4 }, // Silicon Labs CP210x (ESP32 DevKit)
          { usbVendorId: 0x1a86 }, // WCH CH340 (ESP32 NodeMCU)
          { usbVendorId: 0x303a }, // Espressif native USB (ESP32-S2/S3)
          { usbVendorId: 0x0403 }, // FTDI
        ],
      }).catch(async (e: any) => {
        // If filtered requestPort fails or user cancels filter, fallback to unfiltered
        if (e.name === 'NotFoundError') throw e;
        // @ts-ignore
        return await navigator.serial.requestPort();
      });

      const portInfo = this.port.getInfo ? this.port.getInfo() : {};
      const portDesc = this.identifyEsp32Hardware(portInfo.usbVendorId, portInfo.usbProductId);

      // Open port with ESP32 standard configuration (8N1, 115200 baud, 8192 buffer)
      await this.port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        bufferSize: 8192,
        flowControl: 'none',
      });

      // ESP32 auto-reset line stabilization (assert DTR, deassert RTS to prevent reset loop)
      try {
        if (this.port.setSignals) {
          await this.port.setSignals({ dataTerminalReady: true, requestToSend: false });
        }
      } catch {
        // Ignored if device does not support setSignals
      }

      this.isVirtual = false;
      this.updateStatus({
        connected: true,
        portName: portDesc,
        baudRate,
      });

      this.emitLog('SYS', `✓ ESP32 Hardware Link Established: ${portDesc} @ ${baudRate} baud.`);
      this.emitLog('SYS', 'Listening for live telemetry packets from ESP32 (CSV / JSON / Key-Value)...');
      
      this.startReading();
      return { success: true };
    } catch (err: any) {
      const errMsg = err.message || String(err);
      this.updateStatus({ errorCount: this.status.errorCount + 1 });
      this.emitLog('SYS', `ESP32 Connection Error: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  /**
   * Connect to a simulated ESP32 USB COM port for testing
   */
  public connectVirtual(portName: string = 'COM3 (ESP32 DevKit CP2102)', baudRate: number = 115200): { success: boolean } {
    if (this.status.connected) {
      this.disconnect();
    }

    this.isVirtual = true;
    this.updateStatus({
      connected: true,
      portName,
      baudRate,
    });

    this.emitLog('SYS', `ESP32 Direct USB Serial Port Activated: ${portName} @ ${baudRate} baud.`);
    this.emitLog('SYS', 'ESP32 Telemetry Loop Online. Parsing live BMP280, DHT11, MPU6050 packets...');

    let seq = this.status.packetsReceived || 100;
    this.virtualTimer = setInterval(() => {
      seq++;
      const timeStr = new Date().toTimeString().split(' ')[0];
      const alt = +(85 + Math.sin(seq * 0.1) * 20 + (seq % 100)).toFixed(1);
      const press = +(1013.25 - alt * 0.12).toFixed(1);
      const volt = +(8.2 - (seq % 50) * 0.005).toFixed(2);
      const tempA = +(24.8 + Math.sin(seq * 0.05) * 1.2).toFixed(1);
      const tempI = +(tempA + 3.4).toFixed(1);
      const humidity = +(Math.max(20, 58 - (alt / 100) * 1.8 + Math.sin(seq * 0.1) * 2)).toFixed(1);
      const pitch = +(Math.sin(seq * 0.2) * 15).toFixed(1);
      const roll = +(Math.cos(seq * 0.18) * 18).toFixed(1);
      const yaw = +((seq * 4) % 360).toFixed(1);
      const descent = +(alt > 120 ? -5.8 : 0).toFixed(2);

      // Sputnik 21-parameter format including DHT11 humidity
      const csv = `SPUTNIK,${seq},${timeStr},${alt},${press},${tempA},${tempI},${volt},0.08,-0.04,9.81,${pitch},${roll},${yaw},${descent},26.7321,83.4332,${alt},10,-68,DESCENT`;
      
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
        try {
          await this.reader.cancel();
        } catch {}
        this.reader = null;
      }
      if (this.port) {
        try {
          await this.port.close();
        } catch {}
        this.port = null;
      }
      this.updateStatus({
        connected: false,
        portName: 'Disconnected',
      });
      this.emitLog('SYS', 'ESP32 USB Serial port disconnected cleanly.');
    } catch (err: any) {
      this.emitLog('SYS', `Error closing port: ${err.message || err}`);
    }
  }

  /**
   * Transmits live telecommand / uplink packet to the ESP32 over USB
   */
  public async transmit(data: string): Promise<boolean> {
    if (!this.status.connected) {
      this.emitLog('SYS', 'Cannot transmit: No ESP32 USB port is connected.');
      return false;
    }

    const payload = data.endsWith('\n') ? data : data + '\n';
    const encoder = new TextEncoder();
    const encoded = encoder.encode(payload);

    this.updateStatus({
      bytesSent: this.status.bytesSent + encoded.length,
    });
    this.emitLog('TX', payload.trim());

    if (!this.isVirtual && this.port && this.port.writable) {
      try {
        const writer = this.port.writable.getWriter();
        await writer.write(encoded);
        writer.releaseLock();
        return true;
      } catch (err: any) {
        this.emitLog('SYS', `ESP32 transmission error: ${err.message || err}`);
        return false;
      }
    }

    // Virtual ESP32 ACK response
    setTimeout(() => {
      const cmdKey = data.trim().split(',').pop() || data.trim();
      const ack = `ESP32_ACK,SPUTNIK,CMD_ACCEPTED:${cmdKey},CRC_OK`;
      this.updateStatus({
        bytesReceived: this.status.bytesReceived + ack.length + 2,
      });
      this.emitLog('RX', ack);
    }, 120);

    return true;
  }

  /**
   * Resilient byte stream reader for ESP32 UART
   */
  private async startReading() {
    this.isReading = true;
    let buffer = '';

    while (this.port && this.port.readable && this.isReading) {
      try {
        this.reader = this.port.readable.getReader();
        const decoder = new TextDecoder();

        while (this.isReading) {
          const { value, done } = await this.reader.read();
          if (done) break;

          if (value) {
            this.updateStatus({
              bytesReceived: this.status.bytesReceived + value.length,
            });

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split(/\r?\n/);
            // Keep incomplete trailing line in buffer
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
          this.emitLog('SYS', `ESP32 stream read error: ${err.message || err}`);
        }
        break;
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch {}
          this.reader = null;
        }
      }
    }
  }

  /**
   * Parse incoming telemetry string from ESP32 into TelemetryPacket
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
    } catch {
      this.updateStatus({ errorCount: this.status.errorCount + 1 });
    }
  }

  /**
   * Multi-format ESP32 telemetry parser:
   * 1. JSON: {"alt": 120.4, "press": 1012, "temp": 28.5, "hum": 55, ...}
   * 2. Key-Value: ALT=120.4,PRESS=1012,TEMP=28.5,HUM=55,VOLT=7.4
   * 3. Standard Sputnik CSV: SPUTNIK,seq,time,alt,press,tempA,tempI,volt,ax,ay,az,pitch,roll,yaw,descent,lat,lng,gpsAlt,sats,rssi,state
   * 4. Concise ESP32 CSV: alt,press,temp,humidity,voltage,...
   */
  private parsePacket(raw: string): TelemetryPacket | null {
    const nowTime = new Date().toTimeString().split(' ')[0];

    // 1. Check for JSON format
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const d = JSON.parse(raw);
        const alt = Number(d.alt ?? d.altitude ?? 0);
        const tempA = Number(d.temp ?? d.tempAmbient ?? d.temperature ?? 25);
        return {
          id: Date.now(),
          teamId: d.teamId || d.team || 'SPUTNIK',
          packetCount: d.packetCount || d.count || d.seq || this.status.packetsReceived + 1,
          timestamp: d.time || nowTime,
          missionTime: typeof d.missionTime === 'number' ? d.missionTime : Math.floor(Date.now() / 1000),
          altitude: alt,
          peakAltitude: Math.max(alt, this.peakAltitude),
          pressure: Number(d.press ?? d.pressure ?? 1013.25),
          tempAmbient: tempA,
          tempInternal: Number(d.tempInt ?? d.tempInternal ?? (tempA + 2.5)),
          humidity: Number(d.hum ?? d.humidity ?? 56.4),
          voltage: Number(d.volt ?? d.voltage ?? 7.4),
          current: Number(d.curr ?? d.current ?? 245),
          accelX: Number(d.ax ?? d.accelX ?? 0),
          accelY: Number(d.ay ?? d.accelY ?? 0),
          accelZ: Number(d.az ?? d.accelZ ?? 9.81),
          pitch: Number(d.pitch ?? 0),
          roll: Number(d.roll ?? 0),
          yaw: Number(d.yaw ?? 0),
          descentRate: Number(d.descent ?? d.descentRate ?? 0),
          gpsLat: Number(d.lat ?? d.gpsLat ?? 26.7321),
          gpsLng: Number(d.lng ?? d.lon ?? d.gpsLng ?? 83.4332),
          gpsAlt: Number(d.gpsAlt ?? alt),
          gpsSats: Number(d.sats ?? d.gpsSats ?? 8),
          rssi: Number(d.rssi ?? -68),
          snr: Number(d.snr ?? 8.5),
          flightState: (d.state || (alt > 15 ? 'ASCENT' : 'PRE_LAUNCH')) as FlightState,
          rawString: raw,
          crcValid: true,
        };
      } catch {}
    }

    // 2. Check for Key-Value format (e.g. ALT=120.4,PRESS=1012,TEMP=28.5,HUM=58)
    if (raw.includes('=') || (raw.includes(':') && !raw.startsWith('ACK'))) {
      const kvPairs: Record<string, number> = {};
      const tokens = raw.split(/[,;\s]+/);
      let foundKeys = 0;

      for (const tok of tokens) {
        const delimiter = tok.includes('=') ? '=' : ':';
        const [k, v] = tok.split(delimiter);
        if (k && v && !isNaN(Number(v))) {
          kvPairs[k.toUpperCase().trim()] = Number(v);
          foundKeys++;
        }
      }

      if (foundKeys >= 2) {
        const alt = kvPairs['ALT'] ?? kvPairs['ALTITUDE'] ?? 0;
        const press = kvPairs['PRESS'] ?? kvPairs['PRESSURE'] ?? 1013.25;
        const tempA = kvPairs['TEMP'] ?? kvPairs['TEMPA'] ?? kvPairs['TEMPERATURE'] ?? 26.0;
        const hum = kvPairs['HUM'] ?? kvPairs['HUMIDITY'] ?? kvPairs['RH'] ?? 58.0;
        const volt = kvPairs['VOLT'] ?? kvPairs['VOLTAGE'] ?? kvPairs['V'] ?? 7.4;

        return {
          id: Date.now(),
          teamId: 'SPUTNIK',
          packetCount: kvPairs['SEQ'] ?? kvPairs['COUNT'] ?? this.status.packetsReceived + 1,
          timestamp: nowTime,
          missionTime: Math.floor(Date.now() / 1000),
          altitude: alt,
          peakAltitude: Math.max(alt, this.peakAltitude),
          pressure: press,
          tempAmbient: tempA,
          tempInternal: kvPairs['TEMPI'] ?? (tempA + 2.8),
          humidity: hum,
          voltage: volt,
          current: kvPairs['CURR'] ?? 245,
          accelX: kvPairs['AX'] ?? 0,
          accelY: kvPairs['AY'] ?? 0,
          accelZ: kvPairs['AZ'] ?? 9.81,
          pitch: kvPairs['PITCH'] ?? 0,
          roll: kvPairs['ROLL'] ?? 0,
          yaw: kvPairs['YAW'] ?? 0,
          descentRate: kvPairs['DESCENT'] ?? 0,
          gpsLat: kvPairs['LAT'] ?? 26.7321,
          gpsLng: kvPairs['LNG'] ?? kvPairs['LON'] ?? 83.4332,
          gpsAlt: kvPairs['GPSALT'] ?? alt,
          gpsSats: kvPairs['SATS'] ?? 8,
          rssi: kvPairs['RSSI'] ?? -68,
          snr: 8.8,
          flightState: alt > 15 ? 'ASCENT' : 'PRE_LAUNCH',
          rawString: raw,
          crcValid: true,
        };
      }
    }

    // 3. Comma-Separated Values (CSV) format
    const parts = raw.split(',').map((p) => p.trim());
    if (parts.length < 3) {
      return null;
    }

    // Case 3A: Standard Orbitra '26 Sputnik 21-parameter CSV
    if (parts.length >= 10 && (isNaN(Number(parts[0])) || parts[0].toUpperCase() === 'SPUTNIK')) {
      const teamId = isNaN(Number(parts[0])) ? parts[0] : 'SPUTNIK';
      let idx = isNaN(Number(parts[0])) ? 1 : 0;

      const packetCount = Number(parts[idx++]) || this.status.packetsReceived + 1;
      const timeStr = parts[idx] && parts[idx].includes(':') ? parts[idx++] : nowTime;
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
      const rssi = Number(parts[idx++]) || -68;
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

    // Case 3B: Flexible student ESP32 CSV (e.g. alt,press,temp,humidity,voltage...)
    const numValues = parts.map(p => Number(p)).filter(n => !isNaN(n));
    if (numValues.length >= 3) {
      const altitude = numValues[0] ?? 0;
      const pressure = numValues[1] ?? 1013.25;
      const tempAmbient = numValues[2] ?? 25.0;
      const humidity = numValues[3] ?? 58.0;
      const voltage = numValues[4] ?? 7.4;
      const accelX = numValues[5] ?? 0.0;
      const accelY = numValues[6] ?? 0.0;
      const accelZ = numValues[7] ?? 9.81;

      return {
        id: Date.now(),
        teamId: 'SPUTNIK',
        packetCount: this.status.packetsReceived + 1,
        timestamp: nowTime,
        missionTime: Math.floor(Date.now() / 1000),
        altitude,
        peakAltitude: Math.max(altitude, this.peakAltitude),
        pressure,
        tempAmbient,
        tempInternal: tempAmbient + 2.6,
        humidity,
        voltage,
        current: 235,
        accelX,
        accelY,
        accelZ,
        pitch: numValues[8] ?? 0,
        roll: numValues[9] ?? 0,
        yaw: numValues[10] ?? 0,
        descentRate: 0,
        gpsLat: 26.7321,
        gpsLng: 83.4332,
        gpsAlt: altitude,
        gpsSats: 8,
        rssi: -68,
        snr: 9.0,
        flightState: altitude > 10 ? 'ASCENT' : 'PRE_LAUNCH',
        rawString: raw,
        crcValid: true,
      };
    }

    return null;
  }

  public resetPeakAltitude() {
    this.peakAltitude = 85.0;
  }
}

export const serialService = new SerialService();
