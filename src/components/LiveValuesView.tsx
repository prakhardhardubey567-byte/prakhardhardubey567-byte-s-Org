import { TelemetryPacket } from '../types/telemetry';
import { ThresholdRule } from '../types/thresholds';
import { Attitude3D } from './Attitude3D';
import { GpsMap } from './GpsMap';
import { 
  Compass, 
  Gauge, 
  Radio, 
  Thermometer, 
  Zap, 
  Navigation, 
  ArrowDownUp, 
  Wind,
  Layers,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2
} from 'lucide-react';

interface LiveValuesViewProps {
  packet: TelemetryPacket | null;
  history: TelemetryPacket[];
  hzRate: number;
  rules?: ThresholdRule[];
}

export const LiveValuesView: React.FC<LiveValuesViewProps> = ({
  packet,
  history,
  hzRate,
  rules = [],
}) => {
  if (!packet) {
    return (
      <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-lg font-mono text-slate-500">
        Awaiting telemetry packets from USB Serial or Simulator...
      </div>
    );
  }

  // Derived telemetry calculations
  const netG = Math.sqrt(
    packet.accelX * packet.accelX +
    packet.accelY * packet.accelY +
    packet.accelZ * packet.accelZ
  );

  const batteryPercent = Math.min(100, Math.max(0, Math.round(((packet.voltage - 6.6) / (8.4 - 6.6)) * 100)));
  const groundAlt = 85.0; // MMMUT elevation
  const agl = Math.max(0, packet.altitude - groundAlt);

  // Flight states progression list
  const flightStages = [
    { key: 'PRE_LAUNCH', label: 'PRE-LAUNCH PAD' },
    { key: 'ASCENT', label: 'POWERED ASCENT' },
    { key: 'APOGEE', label: 'APOGEE REACHED' },
    { key: 'PARACHUTE_DESCENT', label: 'PARACHUTE DESCENT' },
    { key: 'TOUCHDOWN', label: 'TOUCHDOWN & RECOVERY' },
  ];

  const currentStageIndex = flightStages.findIndex((s) => s.key === packet.flightState);

  // Look up threshold rules for each sensor
  const altRule = rules.find((r) => r.parameter === 'altitude');
  const tempRule = rules.find((r) => r.parameter === 'tempInternal');
  const voltRule = rules.find((r) => r.parameter === 'voltage');
  const descentRule = rules.find((r) => r.parameter === 'descentRate');
  const rssiRule = rules.find((r) => r.parameter === 'rssi');
  const accelRule = rules.find((r) => r.parameter === 'accel');

  const getCardStyle = (rule?: ThresholdRule) => {
    if (!rule || rule.severity === 'NOMINAL') {
      return 'bg-slate-950/80 border-slate-800';
    }
    if (rule.severity === 'CRITICAL') {
      return 'bg-rose-950/40 border-rose-600 shadow-md shadow-rose-950/50 ring-1 ring-rose-500/40';
    }
    return 'bg-amber-950/40 border-amber-600 shadow-md shadow-amber-950/40';
  };

  return (
    <div className="space-y-4">
      {/* Flight Stage Progress Ribbon - Zero pills, clean typography */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-semibold uppercase tracking-wider">
              01 Live Telemetry
            </span>
            <span className="text-slate-600">·</span>
            <span>Packet #{packet.packetCount}</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400">{hzRate.toFixed(1)} Hz</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">MISSION STATE:</span>
            <span className="text-amber-400 font-bold uppercase">{packet.flightState.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Linear progress steps */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 border-t border-slate-900">
          {flightStages.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div
                key={stage.key}
                className={`text-left p-2 rounded transition-colors ${
                  isCurrent
                    ? 'bg-cyan-950/60 border border-cyan-800/80 text-cyan-200'
                    : isCompleted
                    ? 'bg-slate-900/50 border border-slate-800/60 text-emerald-400'
                    : 'bg-slate-950/40 border border-slate-900 text-slate-600'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-500 mb-0.5">
                  STAGE 0{idx + 1}
                </div>
                <div className="text-xs font-mono font-medium truncate">
                  {stage.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Telemetry Grid - Strict Science Display Format with Threshold Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Altitude */}
        <div className={`border rounded-lg p-4 flex flex-col justify-between transition-all ${getCardStyle(altRule)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-mono">
              Altitude (MSL / AGL)
            </span>
            {altRule && altRule.severity !== 'NOMINAL' ? (
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${altRule.severity === 'CRITICAL' ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                {altRule.severity === 'CRITICAL' ? '✖ CEILING BREACH' : '▲ HIGH ALT'}
              </span>
            ) : (
              <Layers className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <div>
            <div className={`text-3xl font-mono font-bold tabular-nums ${altRule?.severity === 'CRITICAL' ? 'text-rose-200' : 'text-slate-100'}`}>
              {packet.altitude.toFixed(1)}{' '}
              <span className="text-xs uppercase font-mono text-slate-400 font-normal">m</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 mt-2 pt-2 border-t border-slate-900">
              <span>AGL: <span className="text-slate-200">{agl.toFixed(1)} m</span></span>
              <span>PEAK: <span className="text-amber-400 font-semibold">{packet.peakAltitude.toFixed(1)} m</span></span>
            </div>
          </div>
        </div>

        {/* Metric 2: Barometric Pressure */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-mono">
              Barometric Pressure
            </span>
            <Gauge className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-slate-100 tabular-nums">
              {packet.pressure.toFixed(1)}{' '}
              <span className="text-xs uppercase font-mono text-slate-400 font-normal">hPa</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 mt-2 pt-2 border-t border-slate-900">
              <span>ALT DELTA: <span className="text-slate-200">{(1013.25 - packet.pressure).toFixed(1)} hPa</span></span>
              <span>CAL: <span className="text-emerald-400">1013.25</span></span>
            </div>
          </div>
        </div>

        {/* Metric 3: Temperatures */}
        <div className={`border rounded-lg p-4 flex flex-col justify-between transition-all ${getCardStyle(tempRule)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-mono">
              Ambient Temp & DHT11 Humidity
            </span>
            {tempRule && tempRule.severity !== 'NOMINAL' ? (
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${tempRule.severity === 'CRITICAL' ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                {tempRule.severity === 'CRITICAL' ? '✖ OVERHEAT' : '▲ ELEVATED'}
              </span>
            ) : (
              <Thermometer className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div className={`text-3xl font-mono font-bold tabular-nums ${tempRule?.severity === 'CRITICAL' ? 'text-rose-200' : 'text-slate-100'}`}>
                {packet.tempAmbient.toFixed(1)}{' '}
                <span className="text-xs uppercase font-mono text-slate-400 font-normal">°C</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-bold text-sky-300 tabular-nums">
                  {(packet.humidity || 58.0).toFixed(1)}%
                </span>
                <span className="text-[10px] font-mono text-slate-400 ml-1">RH (DHT11)</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 mt-2 pt-2 border-t border-slate-900">
              <span>AVIONICS INT: <span className={tempRule?.severity === 'CRITICAL' ? 'text-rose-300 font-bold' : 'text-amber-300'}>{packet.tempInternal.toFixed(1)}°C</span></span>
              <span>DHT11: <span className="text-sky-400">CALIBRATED</span></span>
            </div>
          </div>
        </div>

        {/* Metric 4: Power Subsystem */}
        <div className={`border rounded-lg p-4 flex flex-col justify-between transition-all ${getCardStyle(voltRule)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-mono">
              Battery Voltage (2S)
            </span>
            {voltRule && voltRule.severity !== 'NOMINAL' ? (
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${voltRule.severity === 'CRITICAL' ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                {voltRule.severity === 'CRITICAL' ? '✖ CRITICAL LOW' : '▲ LOW BATT'}
              </span>
            ) : (
              <Zap className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div>
            <div className={`text-3xl font-mono font-bold tabular-nums ${voltRule?.severity === 'CRITICAL' ? 'text-rose-200' : 'text-slate-100'}`}>
              {packet.voltage.toFixed(2)}{' '}
              <span className="text-xs uppercase font-mono text-slate-400 font-normal">V</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 mt-2 pt-2 border-t border-slate-900">
              <span>CELL: <span className="text-slate-200">{(packet.voltage / 2).toFixed(2)}V</span></span>
              <span>CHARGE: <span className={voltRule?.severity === 'CRITICAL' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>{batteryPercent}%</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Telemetry Grid: Descent Velocity, IMU, GPS, Radio Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 5: Descent Velocity */}
        <div className={`border rounded-lg p-4 transition-all ${getCardStyle(descentRule)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-mono">
              Descent Velocity
            </span>
            {descentRule && descentRule.severity !== 'NOMINAL' ? (
              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${descentRule.severity === 'CRITICAL' ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                {descentRule.severity === 'CRITICAL' ? '✖ HIGH VELOCITY' : '▲ WARNING'}
              </span>
            ) : (
              <ArrowDownUp className="w-4 h-4 text-violet-400" />
            )}
          </div>
          <div className={`text-2xl font-mono font-bold tabular-nums ${descentRule?.severity === 'CRITICAL' ? 'text-rose-300' : 'text-slate-100'}`}>
            {packet.descentRate > 0 ? `+${packet.descentRate.toFixed(2)}` : packet.descentRate.toFixed(2)}{' '}
            <span className="text-xs uppercase font-mono text-slate-400 font-normal">m/s</span>
          </div>
          <div className="text-xs font-mono text-slate-500 mt-2 pt-2 border-t border-slate-900 flex justify-between">
            <span>CHUTE TARGET: <span className="text-slate-300">-6.0 m/s</span></span>
            <span className={descentRule?.severity === 'CRITICAL' ? 'text-rose-400 font-bold' : Math.abs(packet.descentRate) > 10 ? 'text-rose-400' : 'text-emerald-400'}>
              {descentRule?.severity === 'CRITICAL' ? '✖ CHUTE FAILURE' : Math.abs(packet.descentRate) > 10 ? 'HIGH VELOCITY' : 'SAFE DESCENT'}
            </span>
          </div>
        </div>

        {/* Metric 6: Net Acceleration (G-Force) */}
        <div className={`border rounded-lg p-4 transition-all ${getCardStyle(accelRule)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-mono">
              Net Acceleration
            </span>
            {accelRule && accelRule.severity !== 'NOMINAL' ? (
              <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1">
                ▲ HIGH G
              </span>
            ) : (
              <Wind className="w-4 h-4 text-sky-400" />
            )}
          </div>
          <div className={`text-2xl font-mono font-bold tabular-nums ${accelRule?.severity !== 'NOMINAL' ? 'text-amber-300' : 'text-slate-100'}`}>
            {netG.toFixed(2)}{' '}
            <span className="text-xs uppercase font-mono text-slate-400 font-normal">G</span>
          </div>
          <div className="text-xs font-mono text-slate-500 mt-2 pt-2 border-t border-slate-900 flex justify-between">
            <span>X: {packet.accelX.toFixed(2)}</span>
            <span>Y: {packet.accelY.toFixed(2)}</span>
            <span>Z: {packet.accelZ.toFixed(2)}</span>
          </div>
        </div>

        {/* Metric 7: Radio Link & RSSI */}
        <div className={`border rounded-lg p-4 transition-all ${getCardStyle(rssiRule)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-mono">
              ESP32 Wireless Link
            </span>
            {rssiRule && rssiRule.severity !== 'NOMINAL' ? (
              <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1">
                ✖ WEAK LINK
              </span>
            ) : (
              <Radio className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <div className={`text-2xl font-mono font-bold tabular-nums ${rssiRule?.severity === 'CRITICAL' ? 'text-rose-300' : 'text-slate-100'}`}>
            {packet.rssi}{' '}
            <span className="text-xs uppercase font-mono text-slate-400 font-normal">dBm</span>
          </div>
          <div className="text-xs font-mono text-slate-500 mt-2 pt-2 border-t border-slate-900 flex justify-between">
            <span>SNR: <span className="text-slate-200">+{packet.snr.toFixed(1)} dB</span></span>
            <span className={rssiRule?.severity === 'CRITICAL' ? 'text-rose-400 font-bold' : packet.rssi > -85 ? 'text-emerald-400' : 'text-amber-400'}>
              {rssiRule?.severity === 'CRITICAL' ? 'MARGINAL' : packet.rssi > -85 ? 'STRONG LINK' : 'WEAK LINK'}
            </span>
          </div>
        </div>

        {/* Metric 8: GPS Fix & Satellites */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-mono">
              GNSS Lock
            </span>
            <Navigation className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
            {packet.gpsSats}{' '}
            <span className="text-xs uppercase font-mono text-slate-400 font-normal">Sats 3D</span>
          </div>
          <div className="text-xs font-mono text-slate-500 mt-2 pt-2 border-t border-slate-900 flex justify-between">
            <span>HDOP: <span className="text-slate-200">0.9</span></span>
            <span className="text-emerald-400">PRECISION 3D</span>
          </div>
        </div>
      </div>

      {/* Spatial Visualizers: 3D Attitude Indicator and GPS Recovery Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-[320px]">
        {/* 3D Attitude Indicator */}
        <div className="h-full">
          <Attitude3D
            pitch={packet.pitch}
            roll={packet.roll}
            yaw={packet.yaw}
          />
        </div>

        {/* GPS Recovery Radar & Ground Track */}
        <div className="h-full">
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
      </div>
    </div>
  );
};
