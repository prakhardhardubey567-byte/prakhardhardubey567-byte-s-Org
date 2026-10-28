import React, { useState } from 'react';
import { TelemetryPacket } from '../types/telemetry';
import { TelemetryChart, ChartSeries } from './TelemetryChart';
import { Download, Pause, Play, Clock, RefreshCw } from 'lucide-react';

interface TimeSeriesViewProps {
  history: TelemetryPacket[];
  isPaused: boolean;
  onTogglePause: () => void;
  onClearHistory: () => void;
}

export const TimeSeriesView: React.FC<TimeSeriesViewProps> = ({
  history,
  isPaused,
  onTogglePause,
  onClearHistory,
}) => {
  const [timeWindow, setTimeWindow] = useState<number>(60); // 60 points default

  // Extract arrays for charts
  const timestamps = history.map((p) => p.timestamp);

  // Chart 1: Altitude & Barometric Pressure (Dual Axis)
  const altPressSeries: ChartSeries[] = [
    {
      key: 'alt',
      label: 'Altitude',
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

  // Chart 2: Thermal Profile
  const thermalSeries: ChartSeries[] = [
    {
      key: 'tempA',
      label: 'Ambient Temp',
      color: '#38bdf8',
      unit: '°C',
      data: history.map((p) => p.tempAmbient),
    },
    {
      key: 'tempI',
      label: 'Internal Temp',
      color: '#f97316',
      unit: '°C',
      data: history.map((p) => p.tempInternal),
    },
    {
      key: 'humidity',
      label: 'DHT11 Humidity',
      color: '#38bdf8',
      unit: '%',
      secondaryAxis: true,
      data: history.map((p) => p.humidity || 58.0),
    },
  ];

  // Chart 3: Power Subsystem (Dual Axis)
  const powerSeries: ChartSeries[] = [
    {
      key: 'voltage',
      label: 'Battery',
      color: '#10b981',
      unit: 'V',
      data: history.map((p) => p.voltage),
    },
    {
      key: 'current',
      label: 'Current',
      color: '#a855f7',
      unit: 'mA',
      secondaryAxis: true,
      data: history.map((p) => p.current),
    },
  ];

  // Chart 4: 3-Axis Accelerometer
  const accelSeries: ChartSeries[] = [
    {
      key: 'ax',
      label: 'Accel X',
      color: '#ef4444',
      unit: 'G',
      data: history.map((p) => p.accelX),
    },
    {
      key: 'ay',
      label: 'Accel Y',
      color: '#22c55e',
      unit: 'G',
      data: history.map((p) => p.accelY),
    },
    {
      key: 'az',
      label: 'Accel Z',
      color: '#3b82f6',
      unit: 'G',
      data: history.map((p) => p.accelZ),
    },
  ];

  // Chart 5: Gyro Attitude Rates
  const gyroSeries: ChartSeries[] = [
    {
      key: 'pitch',
      label: 'Pitch',
      color: '#f43f5e',
      unit: '°',
      data: history.map((p) => p.pitch),
    },
    {
      key: 'roll',
      label: 'Roll',
      color: '#0ea5e9',
      unit: '°',
      data: history.map((p) => p.roll),
    },
    {
      key: 'yaw',
      label: 'Yaw',
      color: '#eab308',
      unit: '°',
      data: history.map((p) => p.yaw),
    },
  ];

  // Chart 6: Descent Rate & RSSI
  const descentRssiSeries: ChartSeries[] = [
    {
      key: 'descent',
      label: 'Descent Velocity',
      color: '#8b5cf6',
      unit: 'm/s',
      data: history.map((p) => p.descentRate),
    },
    {
      key: 'rssi',
      label: 'ESP32 RSSI',
      color: '#06b6d4',
      unit: 'dBm',
      secondaryAxis: true,
      data: history.map((p) => p.rssi),
    },
  ];

  // Export full CSV telemetry
  const handleExportCsv = () => {
    if (history.length === 0) return;
    const headers = [
      'TEAM_ID',
      'PACKET_COUNT',
      'TIMESTAMP',
      'MISSION_TIME_SEC',
      'ALTITUDE_M',
      'PRESSURE_HPA',
      'TEMP_AMBIENT_C',
      'TEMP_INTERNAL_C',
      'VOLTAGE_V',
      'CURRENT_MA',
      'ACCEL_X_G',
      'ACCEL_Y_G',
      'ACCEL_Z_G',
      'PITCH_DEG',
      'ROLL_DEG',
      'YAW_DEG',
      'DESCENT_RATE_MS',
      'GPS_LAT',
      'GPS_LNG',
      'GPS_ALT',
      'GPS_SATS',
      'RSSI_DBM',
      'FLIGHT_STATE',
    ];

    const rows = history.map((p) => [
      p.teamId,
      p.packetCount,
      p.timestamp,
      p.missionTime,
      p.altitude.toFixed(2),
      p.pressure.toFixed(2),
      p.tempAmbient.toFixed(2),
      p.tempInternal.toFixed(2),
      p.voltage.toFixed(2),
      p.current.toFixed(1),
      p.accelX.toFixed(3),
      p.accelY.toFixed(3),
      p.accelZ.toFixed(3),
      p.pitch.toFixed(2),
      p.roll.toFixed(2),
      p.yaw.toFixed(2),
      p.descentRate.toFixed(2),
      p.gpsLat.toFixed(6),
      p.gpsLng.toFixed(6),
      p.gpsAlt.toFixed(2),
      p.gpsSats,
      p.rssi,
      p.flightState,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ORBITRA26_TEAM_SPUTNIK_TELEMETRY_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-cyan-400 font-semibold uppercase tracking-wider">
              02 Time-Series Plots
            </span>
            <span className="text-slate-600">·</span>
            <span>{history.length} Samples Cached</span>
          </div>

          {/* Interactive filter controls - allowed button segmented control */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-md">
            {[
              { label: '30s', val: 30 },
              { label: '60s', val: 60 },
              { label: '5m', val: 300 },
              { label: 'All', val: 10000 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setTimeWindow(opt.val)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  timeWindow === opt.val
                    ? 'bg-slate-800 text-cyan-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
            className={`px-3 py-1.5 text-xs font-mono rounded border flex items-center gap-1.5 transition-colors ${
              isPaused
                ? 'bg-amber-950/50 border-amber-800 text-amber-300 hover:bg-amber-900/50'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Stream' : 'Freeze Graph'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={history.length === 0}
            className="px-3 py-1.5 text-xs font-mono bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-800/80 rounded flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onClearHistory}
            className="p-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded transition-colors"
            title="Clear Buffer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid of 6 High Precision Time Series Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Plot 1: Altitude & Pressure */}
        <TelemetryChart
          title="Altitude & Barometric Pressure"
          subtitle="Dual Axis (Cyan: Alt m MSL · Amber: Pressure hPa)"
          timestamps={timestamps}
          series={altPressSeries}
          timeWindow={timeWindow}
          height={210}
        />

        {/* Plot 2: Thermal Profile */}
        <TelemetryChart
          title="Thermal Telemetry"
          subtitle="Sky: Ambient °C · Orange: Internal Avionics °C"
          timestamps={timestamps}
          series={thermalSeries}
          timeWindow={timeWindow}
          height={210}
        />

        {/* Plot 3: Power Subsystem */}
        <TelemetryChart
          title="Power Bus & Battery Health"
          subtitle="Emerald: 2S Pack Voltage (V) · Violet: Load Current (mA)"
          timestamps={timestamps}
          series={powerSeries}
          timeWindow={timeWindow}
          height={210}
        />

        {/* Plot 4: 3-Axis Accelerometer */}
        <TelemetryChart
          title="Linear Acceleration (3-Axis IMU)"
          subtitle="Red: Accel X · Green: Accel Y · Blue: Accel Z (G)"
          timestamps={timestamps}
          series={accelSeries}
          timeWindow={timeWindow}
          height={210}
        />

        {/* Plot 5: Gyro Attitude Dynamics */}
        <TelemetryChart
          title="Attitude Orientation Angles"
          subtitle="Rose: Pitch · Sky: Roll · Yellow: Yaw (deg)"
          timestamps={timestamps}
          series={gyroSeries}
          timeWindow={timeWindow}
          height={210}
        />

        {/* Plot 6: Descent Rate & RF Signal RSSI */}
        <TelemetryChart
          title="Descent Velocity & RF Link Strength"
          subtitle="Violet: Descent m/s · Cyan: ESP32 Link RSSI dBm"
          timestamps={timestamps}
          series={descentRssiSeries}
          timeWindow={timeWindow}
          height={210}
        />
      </div>
    </div>
  );
};
