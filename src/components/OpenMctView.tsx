import React, { useState } from 'react';
import { TelemetryPacket } from '../types/telemetry';
import { TelemetryChart, ChartSeries } from './TelemetryChart';
import { Attitude3D } from './Attitude3D';
import { GpsMap } from './GpsMap';
import { 
  Folder, 
  FolderOpen, 
  Layers, 
  Terminal, 
  Activity, 
  Globe, 
  Server, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Play,
  Pause
} from 'lucide-react';

interface OpenMctViewProps {
  packet: TelemetryPacket | null;
  history: TelemetryPacket[];
  hzRate: number;
}

export const OpenMctView: React.FC<OpenMctViewProps> = ({
  packet,
  history,
  hzRate,
}) => {
  const [selectedTreeItem, setSelectedTreeItem] = useState<string>('all');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    root: true,
    sputnik: true,
    avionics: true,
    rf: true,
  });

  const [copiedCode, setCopiedCode] = useState(false);
  const [timeConductorMode, setTimeConductorMode] = useState<'LIVE' | 'FIXED'>('LIVE');

  const toggleFolder = (key: string) => {
    setOpenFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const timestamps = history.map((p) => p.timestamp);

  const mainFlightSeries: ChartSeries[] = [
    {
      key: 'alt',
      label: 'Altitude MSL',
      color: '#06b6d4',
      unit: 'm',
      data: history.map((p) => p.altitude),
    },
    {
      key: 'press',
      label: 'Pressure',
      color: '#f59e0b',
      unit: 'hPa',
      secondaryAxis: true,
      data: history.map((p) => p.pressure),
    },
  ];

  const bridgeScript = `// ORBITRA '26 - TEAM SPUTNIK (MMMUT GORAKHPUR)
// TELEMETRY BRIDGE SCRIPT: Hardware -> Receiver -> Bridge -> Open MCT
//
// 1. Install dependencies: npm install serialport ws
// 2. Run: node orbitra-bridge.js
// 3. Open MCT will connect to ws://localhost:8080/telemetry

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { WebSocketServer } = require('ws');

const SERIAL_PORT_NAME = process.argv[2] || '/dev/ttyUSB0'; // or 'COM3' on Windows
const BAUD_RATE = 115200;
const WS_PORT = 8080;

console.log('[BRIDGE] Starting Open MCT Telemetry Bridge...');
const wss = new WebSocketServer({ port: WS_PORT });

let activeClients = [];
wss.on('connection', (ws) => {
  console.log('[BRIDGE] Open MCT Client connected to WebSocket');
  activeClients.push(ws);
  ws.on('close', () => {
    activeClients = activeClients.filter((c) => c !== ws);
  });
});

const port = new SerialPort({ path: SERIAL_PORT_NAME, baudRate: BAUD_RATE });
const parser = port.pipe(new ReadlineParser({ delimiter: '\\r\\n' }));

parser.on('data', (line) => {
  console.log('[RX FROM HARDWARE]:', line);
  const payload = JSON.stringify({ raw: line, timestamp: Date.now() });
  activeClients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
});

console.log(\`[BRIDGE] Listening on serial \${SERIAL_PORT_NAME} @ \${BAUD_RATE}\`);
console.log(\`[BRIDGE] Open MCT Bridge active at ws://localhost:\${WS_PORT}\`);
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bridgeScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Pipeline Header: Hardware → Receiver → Bridge → Open MCT */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                03 One Mission View · Open MCT Telemetry Suite
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-slate-400">Team Sputnik / MMMUT Gorakhpur</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified mission telemetry architecture. Live sensor packets stream simultaneously into time-series plots, attitude gimbal, and navigation radar.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyToClipboard}
              className="px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded flex items-center gap-1.5 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Bridge Script Copied' : 'Get Bridge Script'}</span>
            </button>
          </div>
        </div>

        {/* The Mandatory 4-Step Pipeline Indicator */}
        <div className="mt-3 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
            <span className="text-slate-500 font-semibold uppercase">Telemetry Data Pipeline:</span>
            <span className="text-cyan-400">Pipeline Status: ACTIVE STREAM</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {/* Step 1: Hardware */}
            <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold shrink-0">
                1
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-semibold text-slate-200 truncate">
                  Hardware (CanSat)
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate">
                  BMP280 · MPU6050 · GPS
                </div>
              </div>
            </div>

            {/* Step 2: Receiver */}
            <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 font-mono text-xs font-bold shrink-0">
                2
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-semibold text-slate-200 truncate">
                  Receiver (Ground RF)
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate">
                  ESP32 Wi-Fi / USB COM
                </div>
              </div>
            </div>

            {/* Step 3: Bridge */}
            <div className="bg-slate-900/60 border border-cyan-900/60 p-2.5 rounded flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400 font-mono text-xs font-bold shrink-0">
                3
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-semibold text-cyan-200 truncate">
                  Bridge (Local Server)
                </div>
                <div className="text-[10px] font-mono text-amber-400 truncate">
                  Start the bridge first
                </div>
              </div>
            </div>

            {/* Step 4: Open MCT */}
            <div className="bg-slate-900/60 border border-emerald-900/60 p-2.5 rounded flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold shrink-0">
                4
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-semibold text-emerald-200 truncate">
                  Open MCT (Mission View)
                </div>
                <div className="text-[10px] font-mono text-emerald-400 truncate">
                  Start Open MCT second
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Operating Rule: "Start the bridge first. Start Open MCT second. Keep both running."</span>
          </div>
        </div>
      </div>

      {/* NASA Open MCT Layout Stage: Left Tree + Right Multi-Pane Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
        {/* Left Column: NASA Open MCT Telemetry Object Tree (3 cols) */}
        <div className="lg:col-span-3 bg-slate-950/90 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900 text-xs font-mono text-slate-400">
              <span className="font-semibold text-slate-200 uppercase tracking-wide">
                Telemetry Tree
              </span>
              <span className="text-[10px] text-cyan-400">ORBITRA'26</span>
            </div>

            {/* Tree nodes */}
            <div className="space-y-1 text-xs font-mono">
              {/* Root */}
              <div>
                <button
                  onClick={() => toggleFolder('root')}
                  className="w-full flex items-center gap-1.5 py-1 px-1.5 text-slate-300 hover:bg-slate-900 rounded text-left"
                >
                  {openFolders.root ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span className="font-semibold text-slate-200">ORBITRA '26 Mission</span>
                </button>

                {openFolders.root && (
                  <div className="ml-3 pl-2 border-l border-slate-800 space-y-1 mt-1">
                    {/* Team Sputnik */}
                    <button
                      onClick={() => toggleFolder('sputnik')}
                      className="w-full flex items-center gap-1.5 py-1 px-1.5 text-slate-300 hover:bg-slate-900 rounded text-left"
                    >
                      {openFolders.sputnik ? (
                        <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span className="text-cyan-300 font-medium">Team Sputnik (MMMUT)</span>
                    </button>

                    {openFolders.sputnik && (
                      <div className="ml-3 pl-2 border-l border-slate-800 space-y-1">
                        {/* Leaf: All in One Mission View */}
                        <button
                          onClick={() => setSelectedTreeItem('all')}
                          className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded text-left ${
                            selectedTreeItem === 'all'
                              ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/80'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <Activity className="w-3 h-3 text-cyan-400" />
                          <span>One Mission View</span>
                        </button>

                        {/* Sensors */}
                        <button
                          onClick={() => setSelectedTreeItem('bmp280')}
                          className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded text-left ${
                            selectedTreeItem === 'bmp280'
                              ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/80'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <span className="text-slate-500">·</span>
                          <span>BMP280 (Alt & Press)</span>
                        </button>

                        <button
                          onClick={() => setSelectedTreeItem('dht11')}
                          className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded text-left ${
                            selectedTreeItem === 'dht11'
                              ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/80'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <span className="text-slate-500">·</span>
                          <span>DHT11 (Temp & Humidity)</span>
                        </button>

                        <button
                          onClick={() => setSelectedTreeItem('mpu6050')}
                          className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded text-left ${
                            selectedTreeItem === 'mpu6050'
                              ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/80'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <span className="text-slate-500">·</span>
                          <span>MPU6050 (6-DoF IMU)</span>
                        </button>

                        <button
                          onClick={() => setSelectedTreeItem('gps')}
                          className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded text-left ${
                            selectedTreeItem === 'gps'
                              ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/80'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <span className="text-slate-500">·</span>
                          <span>NEO-6M GNSS Fix</span>
                        </button>

                        <button
                          onClick={() => setSelectedTreeItem('power')}
                          className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded text-left ${
                            selectedTreeItem === 'power'
                              ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/80'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <span className="text-slate-500">·</span>
                          <span>Power & LiPo 2S</span>
                        </button>

                        <button
                          onClick={() => setSelectedTreeItem('raw')}
                          className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded text-left ${
                            selectedTreeItem === 'raw'
                              ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/80'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <Terminal className="w-3 h-3 text-emerald-400" />
                          <span>Raw Telemetry Stream</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dictionary Metadata Footer */}
          <div className="pt-3 border-t border-slate-900 text-[10px] font-mono text-slate-500 space-y-1">
            <div>PROVIDER: <span className="text-slate-300">Open MCT Bridge v2.1</span></div>
            <div>STREAM ENDPOINT: <span className="text-cyan-400">ws://localhost:8080</span></div>
            <div>STATUS: <span className="text-emerald-400">TELEMETRY SYNCHRONIZED</span></div>
          </div>
        </div>

        {/* Right Stage: One Mission View Panes (9 cols) */}
        <div className="lg:col-span-9 flex flex-col gap-3">
          {/* Top Multi-Pane Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Quick KPI 1 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">
                ALTITUDE MSL
              </span>
              <div className="text-2xl font-mono font-bold text-cyan-300 tabular-nums">
                {packet ? packet.altitude.toFixed(1) : '--'} <span className="text-xs text-slate-400 font-normal">m</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">
                PEAK: {packet ? packet.peakAltitude.toFixed(1) : '--'} m
              </div>
            </div>

            {/* Quick KPI 2 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">
                DESCENT SPEED
              </span>
              <div className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
                {packet ? (packet.descentRate > 0 ? `+${packet.descentRate.toFixed(2)}` : packet.descentRate.toFixed(2)) : '--'} <span className="text-xs text-slate-400 font-normal">m/s</span>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-1">
                CHUTE: {packet?.flightState.replace('_', ' ')}
              </div>
            </div>

            {/* Quick KPI 3 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">
                AVIONICS BUS & RF
              </span>
              <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                {packet ? packet.voltage.toFixed(2) : '--'} <span className="text-xs text-slate-400 font-normal">V</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">
                RSSI: {packet ? `${packet.rssi} dBm` : '--'} · {hzRate.toFixed(1)} Hz
              </div>
            </div>
          </div>

          {/* Primary Viewport according to selected tree node */}
          {selectedTreeItem === 'raw' ? (
            /* Raw Telemetry Terminal Table */
            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 flex-1 flex flex-col min-h-[360px]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900 text-xs font-mono text-slate-400">
                <span className="text-slate-200 font-semibold uppercase">
                  Raw Telemetry Packet Ledger (Alphanumeric Stream)
                </span>
                <span>{history.length} Packets Received</span>
              </div>

              <div className="flex-1 overflow-auto font-mono text-xs text-slate-300 space-y-1 max-h-[380px]">
                {history.slice(-30).reverse().map((pkt) => (
                  <div
                    key={pkt.id + '-' + pkt.packetCount}
                    className="p-1.5 bg-slate-900/40 hover:bg-slate-900 rounded border border-slate-800/60 flex items-center justify-between gap-2"
                  >
                    <span className="text-cyan-400 font-semibold shrink-0">#{pkt.packetCount}</span>
                    <span className="text-slate-500 shrink-0">[{pkt.timestamp}]</span>
                    <span className="text-slate-200 truncate flex-1">{pkt.rawString}</span>
                    <span className="text-[10px] text-emerald-400 shrink-0">CRC OK</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Multi-Pane Mission Display */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
              {/* Flight Altitude & Pressure Chart */}
              <div className="h-full">
                <TelemetryChart
                  title="Open MCT Live Plot · Altitude & Pressure"
                  subtitle="Synchronized time-series telemetry"
                  timestamps={timestamps}
                  series={mainFlightSeries}
                  timeWindow={60}
                  height={240}
                />
              </div>

              {/* 3D Attitude Indicator */}
              <div className="h-full min-h-[240px]">
                {packet && (
                  <Attitude3D
                    pitch={packet.pitch}
                    roll={packet.roll}
                    yaw={packet.yaw}
                  />
                )}
              </div>
            </div>
          )}

          {/* Bottom GPS Ground Map */}
          {selectedTreeItem !== 'raw' && packet && (
            <div className="h-[210px]">
              <GpsMap
                lat={packet.gpsLat}
                lng={packet.gpsLng}
                altitude={packet.gpsAlt}
                satellites={packet.gpsSats}
                trajectory={history.map((h) => ({
                  lat: h.gpsLat,
                  lng: h.gpsLng,
                  alt: h.altitude,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* NASA Open MCT Time Conductor Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" />
            <span className="text-slate-200 font-semibold">TIME CONDUCTOR</span>
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded">
            <button
              onClick={() => setTimeConductorMode('LIVE')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                timeConductorMode === 'LIVE'
                  ? 'bg-slate-800 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              REAL-TIME
            </button>
            <button
              onClick={() => setTimeConductorMode('FIXED')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                timeConductorMode === 'FIXED'
                  ? 'bg-slate-800 text-amber-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              HISTORICAL
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div>
            <span className="text-slate-500">WINDOW:</span>{' '}
            <span className="text-slate-200">START: 00:00:00 · END: {packet?.timestamp || 'NOW'}</span>
          </div>
          <div>
            <span className="text-slate-500">CLOCK:</span>{' '}
            <span className="text-cyan-400 font-bold">UTC / MET</span>
          </div>
        </div>
      </div>
    </div>
  );
};
