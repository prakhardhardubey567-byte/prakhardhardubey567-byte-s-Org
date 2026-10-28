import React, { useState } from 'react';
import { 
  Cpu, 
  Radio, 
  Workflow, 
  Monitor, 
  ArrowRight, 
  Copy, 
  Check, 
  Terminal, 
  CheckCircle2, 
  Download,
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface HardwarePipelineViewProps {
  onTriggerLaunch: () => void;
  onTriggerParachute: () => void;
  onResetSimulation: () => void;
  isSimulating: boolean;
}

export const HardwarePipelineView: React.FC<HardwarePipelineViewProps> = ({
  onTriggerLaunch,
  onTriggerParachute,
  onResetSimulation,
  isSimulating,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedDict, setCopiedDict] = useState(false);

  const nodeBridgeScript = `// ==============================================================
// ORBITRA '26 TELEMETRY BRIDGE (TEAM SPUTNIK - MMMUT GORAKHPUR)
// Hardware -> Receiver -> Bridge -> Open MCT
// ==============================================================
// INSTRUCTIONS:
// 1. Install dependencies:
//    npm install serialport @serialport/parser-readline ws
//
// 2. Start the bridge FIRST:
//    node orbitra-bridge.js /dev/ttyUSB0   (or COM3 on Windows)
//
// 3. Start Open MCT SECOND:
//    Keep both running simultaneously during the mission!
// ==============================================================

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { WebSocketServer } = require('ws');

const SERIAL_PORT = process.argv[2] || 'COM3';
const BAUD_RATE = 115200;
const WS_PORT = 8080;

console.log('--------------------------------------------------');
console.log('ORBITRA 26 - TEAM SPUTNIK TELEMETRY BRIDGE');
console.log('University: MMMUT, Gorakhpur');
console.log('--------------------------------------------------');

// Create WebSocket server for Open MCT
const wss = new WebSocketServer({ port: WS_PORT });
let clients = [];

wss.on('connection', (ws) => {
  console.log('[BRIDGE] Open MCT Client connected!');
  clients.push(ws);
  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log('[BRIDGE] Client disconnected.');
  });
});

console.log(\`[BRIDGE] WebSocket server running on ws://localhost:\${WS_PORT}\`);
console.log(\`[BRIDGE] Connecting to USB Receiver on \${SERIAL_PORT} @ \${BAUD_RATE} baud...\`);

try {
  const port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\\r\\n' }));

  parser.on('data', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    console.log('[RX FROM HARDWARE]:', trimmed);

    // Relay to all Open MCT instances
    const packet = JSON.stringify({
      raw: trimmed,
      timestamp: Date.now(),
      team: 'SPUTNIK',
      source: 'RECEIVER_USB'
    });

    clients.forEach(client => {
      if (client.readyState === 1) client.send(packet);
    });
  });

  port.on('open', () => console.log(\`[BRIDGE] USB Serial connected successfully on \${SERIAL_PORT}!\`));
  port.on('error', (err) => console.error('[BRIDGE ERROR]:', err.message));
} catch (e) {
  console.error('[BRIDGE INIT ERROR]:', e.message);
}
`;

  const openMctDict = `{
  "name": "ORBITRA '26 - Team Sputnik Telemetry Dictionary",
  "key": "sputnik",
  "measurements": [
    { "key": "sputnik.altitude", "name": "Altitude (MSL)", "units": "m", "type": "float" },
    { "key": "sputnik.pressure", "name": "Barometric Pressure", "units": "hPa", "type": "float" },
    { "key": "sputnik.temp_ambient", "name": "Ambient Temperature", "units": "°C", "type": "float" },
    { "key": "sputnik.temp_internal", "name": "Avionics Temperature", "units": "°C", "type": "float" },
    { "key": "sputnik.humidity", "name": "Relative Humidity (DHT11)", "units": "%", "type": "float" },
    { "key": "sputnik.voltage", "name": "Battery Voltage", "units": "V", "type": "float" },
    { "key": "sputnik.descent_rate", "name": "Descent Velocity", "units": "m/s", "type": "float" },
    { "key": "sputnik.pitch", "name": "IMU Pitch Angle", "units": "deg", "type": "float" },
    { "key": "sputnik.roll", "name": "IMU Roll Angle", "units": "deg", "type": "float" },
    { "key": "sputnik.yaw", "name": "IMU Yaw Angle", "units": "deg", "type": "float" },
    { "key": "sputnik.rssi", "name": "ESP32 Wireless RSSI", "units": "dBm", "type": "integer" }
  ]
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(nodeBridgeScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const copyDict = () => {
    navigator.clipboard.writeText(openMctDict);
    setCopiedDict(true);
    setTimeout(() => setCopiedDict(false), 2000);
  };

  const downloadScript = () => {
    const blob = new Blob([nodeBridgeScript], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orbitra-bridge.js';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Visual Pipeline Banner */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-900">
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wide">
              Hardware Pipeline Architecture
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict end-to-end telemetry architecture for ORBITRA ’26 CanSat / CubeSat mission.
            </p>
          </div>
          <div className="text-xs font-mono text-cyan-400">
            TEAM SPUTNIK · MMMUT GORAKHPUR
          </div>
        </div>

        {/* 4 Pipeline Stages */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          {/* Node 1: Hardware with component thumbnails */}
          <div className="bg-slate-900/70 border border-cyan-800/60 rounded-lg p-3 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span className="text-cyan-400 font-bold">STAGE 01</span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <h4 className="text-sm font-mono font-semibold text-slate-100 flex items-center gap-1.5">
                <span>Hardware (CanSat)</span>
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 font-mono">
                ESP32 SoC reads BMP280, MPU-6050, DHT11, and NEO-6M GPS. Streams serialized frames via USB UART / 2.4 GHz link.
              </p>

              {/* Sensor photo previews in Stage 1 */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto py-1">
                <img
                  src="/src/assets/images/sensor_bmp280_1793180989939.jpg"
                  alt="BMP280"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded object-cover border border-slate-700 shrink-0"
                  title="BMP280 Barometer"
                />
                <img
                  src="/src/assets/images/sensor_mpu6050_1793181006324.jpg"
                  alt="MPU6050"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded object-cover border border-slate-700 shrink-0"
                  title="MPU6050 6-DoF IMU"
                />
                <img
                  src="/src/assets/images/sensor_neo6m_gps_1793181006873.jpg"
                  alt="NEO-6M GPS"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded object-cover border border-slate-700 shrink-0"
                  title="NEO-6M GPS Module"
                />
                <img
                  src="/src/assets/images/sensor_esp32_soc_1793185476796.jpg"
                  alt="ESP32"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded object-cover border border-slate-700 shrink-0"
                  title="ESP32 Flight Computer"
                />
                <img
                  src="/src/assets/images/sensor_dht11_temp_1793185490493.jpg"
                  alt="DHT11"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded object-cover border border-slate-700 shrink-0"
                  title="DHT11 Humidity & Temp Sensor"
                />
              </div>
            </div>
            <div className="mt-2 text-[10px] font-mono text-cyan-400 font-medium">
              5 AVIONICS MODULES INTEGRATED
            </div>
          </div>

          {/* Node 2: Receiver with ESP32 ground station photo */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span className="text-sky-400 font-bold">STAGE 02</span>
                <Radio className="w-4 h-4 text-sky-400" />
              </div>
              <h4 className="text-sm font-mono font-semibold text-slate-200">
                Receiver (Ground Base)
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                ESP32 USB Ground Receiver receives telemetry packets. Demodulated and buffered via USB serial COM port at 115200 baud.
              </p>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <img
                  src="/src/assets/images/sensor_esp32_soc_1793185476796.jpg"
                  alt="ESP32 Ground Receiver"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded object-cover border border-slate-700 shrink-0"
                  title="ESP32 USB UART Ground Node"
                />
                <span className="text-[10px] font-mono text-slate-400 truncate">
                  ESP32 USB UART Ground Node
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-mono text-slate-500">
              USB SERIAL UART (115200)
            </div>
          </div>

          {/* Node 3 */}
          <div className="bg-slate-900/70 border border-amber-900/60 rounded-lg p-3 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-amber-400 mb-2">
                <span className="font-bold">STAGE 03</span>
                <Workflow className="w-4 h-4 text-amber-400" />
              </div>
              <h4 className="text-sm font-mono font-semibold text-amber-200">
                Bridge (Server)
              </h4>
              <p className="text-[11px] text-amber-300/80 mt-1 font-mono">
                Local telemetry bridge server. Parses incoming CSV lines, validates checksums, and exposes WebSocket port 8080.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-amber-400 font-semibold">
              START THE BRIDGE FIRST
            </div>
          </div>

          {/* Node 4 */}
          <div className="bg-slate-900/70 border border-emerald-900/60 rounded-lg p-3 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-2">
                <span className="font-bold">STAGE 04</span>
                <Monitor className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-sm font-mono font-semibold text-emerald-200">
                Open MCT (Mission View)
              </h4>
              <p className="text-[11px] text-emerald-300/80 mt-1 font-mono">
                NASA Open Mission Control Technologies interface connects to the bridge WebSocket and visualizes live flight plots.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-emerald-400 font-semibold">
              START OPEN MCT SECOND
            </div>
          </div>
        </div>

        {/* Stage 01 Detailed Hardware Components Showcase with Photos */}
        <div className="mt-4 pt-3 border-t border-slate-900">
          <div className="flex items-center justify-between mb-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold uppercase tracking-wide">
                STAGE 01 · ONBOARD HARDWARE COMPONENTS & SENSOR PAYLOADS
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Team Sputnik CanSat Avionics</span>
            </div>
            <span className="text-[11px] text-slate-500">MMMUT GORAKHPUR</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Component 1: BMP280 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-800/80 rounded-lg p-3 flex flex-col justify-between transition-colors">
              <div>
                <div className="aspect-4/3 w-full rounded overflow-hidden border border-slate-800 mb-2 relative bg-slate-950">
                  <img
                    src="/src/assets/images/sensor_bmp280_1793180989939.jpg"
                    alt="BMP280 Barometric Sensor"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1.5 bg-black/75 text-[9px] font-mono text-cyan-300 px-1.5 py-0.5 rounded">
                    I2C (0x76)
                  </span>
                </div>
                <h5 className="text-xs font-mono font-bold text-slate-200">
                  BMP280 Barometer
                </h5>
                <p className="text-[10px] text-slate-400 mt-1 font-mono leading-relaxed">
                  Measures atmospheric pressure (300-1100 hPa) & ±1m altitude. Detects flight apogee to trigger parachute ejection servo.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[9px] font-mono text-cyan-400 font-medium">
                ALTITUDE & APOGEE
              </div>
            </div>

            {/* Component 2: MPU-6050 */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-800/80 rounded-lg p-3 flex flex-col justify-between transition-colors">
              <div>
                <div className="aspect-4/3 w-full rounded overflow-hidden border border-slate-800 mb-2 relative bg-slate-950">
                  <img
                    src="/src/assets/images/sensor_mpu6050_1793181006324.jpg"
                    alt="MPU-6050 6-DoF IMU"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1.5 bg-black/75 text-[9px] font-mono text-cyan-300 px-1.5 py-0.5 rounded">
                    I2C (0x68)
                  </span>
                </div>
                <h5 className="text-xs font-mono font-bold text-slate-200">
                  MPU-6050 6-DoF IMU
                </h5>
                <p className="text-[10px] text-slate-400 mt-1 font-mono leading-relaxed">
                  3-axis Gyroscope & 3-axis Accelerometer. Tracks CanSat pitch, roll, yaw Euler angles and rocket launch G-forces.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[9px] font-mono text-sky-400 font-medium">
                3D ATTITUDE & G-FORCE
              </div>
            </div>

            {/* Component 3: NEO-6M GPS */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-800/80 rounded-lg p-3 flex flex-col justify-between transition-colors">
              <div>
                <div className="aspect-4/3 w-full rounded overflow-hidden border border-slate-800 mb-2 relative bg-slate-950">
                  <img
                    src="/src/assets/images/sensor_neo6m_gps_1793181006873.jpg"
                    alt="NEO-6M GPS Module"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1.5 bg-black/75 text-[9px] font-mono text-cyan-300 px-1.5 py-0.5 rounded">
                    UART 9600
                  </span>
                </div>
                <h5 className="text-xs font-mono font-bold text-slate-200">
                  NEO-6M GPS Module
                </h5>
                <p className="text-[10px] text-slate-400 mt-1 font-mono leading-relaxed">
                  50-channel GNSS engine with ceramic antenna. Transmits Latitude, Longitude, and GPS Altitude for touchdown recovery.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[9px] font-mono text-emerald-400 font-medium">
                NAVIGATION & RECOVERY
              </div>
            </div>

            {/* Component 4: ESP32 Flight Computer & Wireless SoC */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-800/80 rounded-lg p-3 flex flex-col justify-between transition-colors">
              <div>
                <div className="aspect-4/3 w-full rounded overflow-hidden border border-slate-800 mb-2 relative bg-slate-950">
                  <img
                    src="/src/assets/images/sensor_esp32_soc_1793185476796.jpg"
                    alt="ESP32 Dual-Core Flight Computer"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1.5 bg-black/75 text-[9px] font-mono text-cyan-300 px-1.5 py-0.5 rounded">
                    240MHz · 2.4GHz
                  </span>
                </div>
                <h5 className="text-xs font-mono font-bold text-slate-200">
                  ESP32 SoC (Avionics Core)
                </h5>
                <p className="text-[10px] text-slate-400 mt-1 font-mono leading-relaxed">
                  Dual-core Xtensa 32-bit LX6 flight computer. Fuses sensor telemetry, runs attitude math, and routes telemetry over UART/Wi-Fi.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[9px] font-mono text-cyan-400 font-medium">
                MAIN FLIGHT COMPUTER & WIRELESS
              </div>
            </div>

            {/* Component 5: DHT11 Humidity & Temperature */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-800/80 rounded-lg p-3 flex flex-col justify-between transition-colors">
              <div>
                <div className="aspect-4/3 w-full rounded overflow-hidden border border-slate-800 mb-2 relative bg-slate-950">
                  <img
                    src="/src/assets/images/sensor_dht11_temp_1793185490493.jpg"
                    alt="DHT11 Digital Humidity & Temp Sensor"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1.5 bg-black/75 text-[9px] font-mono text-cyan-300 px-1.5 py-0.5 rounded">
                    1-Wire GPIO 4
                  </span>
                </div>
                <h5 className="text-xs font-mono font-bold text-slate-200">
                  DHT11 Humidity & Temp
                </h5>
                <p className="text-[10px] text-slate-400 mt-1 font-mono leading-relaxed">
                  Single-bus digital relative humidity (20-90% RH) and ambient temperature sensor. Profiles boundary layer troposphere moisture.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[9px] font-mono text-sky-400 font-medium">
                ATMOSPHERIC METEOROLOGY
              </div>
            </div>
          </div>
        </div>

        {/* Operating Rule Banner */}
        <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-xs bg-cyan-400 inline-block" />
            <span className="text-slate-200 font-semibold">MANDATORY EXECUTION DIRECTIVE:</span>
            <span className="text-cyan-300">
              Start the bridge first. Start Open MCT second. Keep both running.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerLaunch}
              className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-800 rounded flex items-center gap-1 transition-colors"
            >
              <Play className="w-3 h-3" />
              <span>Simulate Launch</span>
            </button>
            <button
              onClick={onTriggerParachute}
              className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-200 border border-amber-800 rounded flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>Deploy Chute</span>
            </button>
            <button
              onClick={onResetSimulation}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
              title="Reset Flight"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Code & Setup Instructions Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left: Node.js Bridge Script (orbitra-bridge.js) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold uppercase">orbitra-bridge.js (Node.js Script)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyScript}
                  className="px-2 py-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded flex items-center gap-1 transition-colors"
                >
                  {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedScript ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={downloadScript}
                  className="px-2 py-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .js</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-mono mb-2">
              Run this script on your laptop to bridge USB serial hardware packets to Open MCT over WebSockets on port 8080:
            </p>

            <pre className="p-3 bg-slate-950 border border-slate-900 rounded text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-[300px] leading-relaxed">
              {nodeBridgeScript}
            </pre>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-500">
            DEPENDENCY: npm install serialport ws
          </div>
        </div>

        {/* Right: Open MCT Telemetry Dictionary */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <Workflow className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold uppercase">Open MCT Dictionary (JSON)</span>
              </div>
              <button
                onClick={copyDict}
                className="px-2 py-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded flex items-center gap-1 transition-colors"
              >
                {copiedDict ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDict ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono mb-2">
              Telemetry definitions for Open MCT to automatically identify Altitude, Pressure, Gyroscope, and Power:
            </p>

            <pre className="p-3 bg-slate-950 border border-slate-900 rounded text-[11px] font-mono text-amber-200 overflow-x-auto max-h-[300px] leading-relaxed">
              {openMctDict}
            </pre>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-500">
            COMPLIANT WITH NASA OPEN MCT TELEMETRY SPECIFICATION
          </div>
        </div>
      </div>
    </div>
  );
};
