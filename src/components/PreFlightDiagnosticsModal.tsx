import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Cpu, 
  Activity, 
  Radio, 
  Compass, 
  Droplets, 
  BatteryCharging, 
  Wind, 
  Volume2, 
  ShieldCheck, 
  Play, 
  RotateCcw, 
  X, 
  Check, 
  Terminal, 
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';

export interface PreFlightCheckItem {
  id: string;
  name: string;
  category: string;
  bus: string;
  nominalValue: string;
  description: string;
  diagnosticPrompt: string;
  status: 'PENDING' | 'CHECKING' | 'VERIFYING' | 'PASS' | 'WARN';
}

const INITIAL_SENSORS: PreFlightCheckItem[] = [
  {
    id: 'esp32',
    name: 'ESP32 Flight Computer',
    category: 'Avionics Core',
    bus: 'Xtensa LX6 @ 240MHz',
    nominalValue: '240 MHz · 520KB SRAM',
    description: 'Dual-core MCU, SPI Flash CRC-32 & FreeRTOS Telemetry Thread',
    diagnosticPrompt: 'Interrogating CPU registers & Flash CRC parity...',
    status: 'PENDING',
  },
  {
    id: 'bmp280',
    name: 'BMP280 Barometric Pressure',
    category: 'Atmospheric',
    bus: 'I2C 0x76 (400 kHz)',
    nominalValue: '1013.25 hPa · 184.2m QNH',
    description: 'Bosch baro/altimeter calibration coeffs & pressure delta',
    diagnosticPrompt: 'Reading trimming registers & zeroing altitude datum...',
    status: 'PENDING',
  },
  {
    id: 'mpu6050',
    name: 'MPU6050 6-DoF Gyro & Accel',
    category: 'Kinematics',
    bus: 'I2C 0x68 (400 kHz)',
    nominalValue: '1.00G Z-axis · 0.0°/s Drift',
    description: '3-axis accelerometer + 3-axis gyroscope zero-rate offset nulling',
    diagnosticPrompt: 'Sampling 50-point IMU vector & nulling gyro drift...',
    status: 'PENDING',
  },
  {
    id: 'dht11',
    name: 'DHT11 Humidity & Temp',
    category: 'Meteorology',
    bus: '1-Wire GPIO 4',
    nominalValue: '58.4% RH · 28.2 °C',
    description: 'Capacitive relative humidity & NTC thermistor 40-bit handshake',
    diagnosticPrompt: 'Pinging single-bus 80µs low pulse & validating 40-bit CRC...',
    status: 'PENDING',
  },
  {
    id: 'neo6m',
    name: 'NEO-6M GNSS / GPS Module',
    category: 'Navigation',
    bus: 'UART2 9600 Baud',
    nominalValue: '8 Satellites · 3D Fix',
    description: 'u-blox NMEA $GNGGA sentence stream & dilution of precision',
    diagnosticPrompt: 'Parsing ephemeris almanac & locking 3D coordinates...',
    status: 'PENDING',
  },
  {
    id: 'power',
    name: '2S 7.4V LiPo & AMS1117 Rail',
    category: 'Power Subsystem',
    bus: 'ADC Pin 34 + LDO Rail',
    nominalValue: '8.35 V (96%) · 3.31V Reg',
    description: 'Dual-cell LiPo state of charge & AMS1117 3.3V step-down stability',
    diagnosticPrompt: 'Sampling ADC voltage divider & checking ripple noise...',
    status: 'PENDING',
  },
  {
    id: 'servo',
    name: 'Parachute Ejection Servo',
    category: 'Recovery System',
    bus: 'PWM Timer 1 (GPIO 18)',
    nominalValue: '0° Locked · PWM 1000µs',
    description: 'SG90 micro servo actuator loop, mechanical hatch retainer',
    diagnosticPrompt: 'Testing 1000µs-1500µs trim pulse & continuity loop...',
    status: 'PENDING',
  },
  {
    id: 'rf_buzzer',
    name: 'Telemetry Link & Buzzer',
    category: 'Ground Station Comms',
    bus: '2.4GHz RF Link / Buzzer',
    nominalValue: 'RSSI -68 dBm · Transducer OK',
    description: 'Ground bridge packet handshake & acoustic recovery beacon',
    diagnosticPrompt: 'Pinging ground transceiver bridge & acoustic pip test...',
    status: 'PENDING',
  },
];

interface PreFlightDiagnosticsModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onDismiss: () => void;
  autoCloseDelayMs?: number;
}

export const PreFlightDiagnosticsModal: React.FC<PreFlightDiagnosticsModalProps> = ({
  isOpen,
  onComplete,
  onDismiss,
  autoCloseDelayMs = 2200,
}) => {
  const [items, setItems] = useState<PreFlightCheckItem[]>(INITIAL_SENSORS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number>(3);
  const [autoProceedActive, setAutoProceedActive] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play subtle audio confirmation tones
  const playTone = (type: 'tick' | 'pass' | 'allGood') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'pass') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1046, now); // C6
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'allGood') {
        // High aerospace dual chime: 880Hz -> 1320Hz -> 1760Hz
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        const gain3 = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, now + 0.12);
        gain2.gain.setValueAtTime(0.08, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.38);

        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(1760, now + 0.24);
        gain3.gain.setValueAtTime(0.08, now + 0.24);
        gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(now + 0.24);
        osc3.stop(now + 0.55);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Reset and restart the diagnostic sequence
  const startDiagnostics = () => {
    setItems(INITIAL_SENSORS.map(s => ({ ...s, status: 'PENDING' })));
    setCurrentIndex(0);
    setIsDone(false);
    setAutoProceedActive(false);
    setCountdown(3);
    setLogs([
      `[00:00.000] INIT: Initializing CanSat Orbitra '26 Power-On Self-Test (POST)...`,
      `[00:00.045] BUS: Scanning I2C bus @ 400kHz and 1-Wire GPIO interfaces...`,
      `[00:00.090] FLIGHT_COMPUTER: Ready for sequential hardware diagnostic cycle.`,
    ]);
  };

  useEffect(() => {
    if (isOpen) {
      startDiagnostics();
    }
  }, [isOpen]);

  // Run the sequential diagnosis
  useEffect(() => {
    if (!isOpen || isDone) return;

    if (currentIndex < items.length) {
      const currentItem = items[currentIndex];

      // Phase 1: Set to CHECKING
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === currentIndex ? { ...item, status: 'CHECKING' } : item
        )
      );

      const timestamp = (0.2 + currentIndex * 0.45).toFixed(3);
      setLogs((prev) => [
        ...prev,
        `[00:${timestamp}] PROBE: ${currentItem.name} (${currentItem.bus}) -> ${currentItem.diagnosticPrompt}`,
      ]);
      playTone('tick');

      // Phase 2: After short delay, verify thresholds / false checking calibration
      const t1 = setTimeout(() => {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === currentIndex ? { ...item, status: 'VERIFYING' } : item
          )
        );

        setLogs((prev) => [
          ...prev,
          `[00:${(parseFloat(timestamp) + 0.15).toFixed(3)}] VERIFY: Calculating tolerance boundaries for ${currentItem.name}...`,
        ]);

        // Phase 3: Final pass
        const t2 = setTimeout(() => {
          setItems((prev) =>
            prev.map((item, idx) =>
              idx === currentIndex ? { ...item, status: 'PASS' } : item
            )
          );

          setLogs((prev) => [
            ...prev,
            `[00:${(parseFloat(timestamp) + 0.35).toFixed(3)}] PASS: [OK] ${currentItem.name} Nominal: ${currentItem.nominalValue}`,
          ]);
          playTone('pass');

          // Advance to next sensor
          setCurrentIndex((idx) => idx + 1);
        }, 280);

        return () => clearTimeout(t2);
      }, 260);

      return () => clearTimeout(t1);
    } else {
      // All sensors passed!
      setIsDone(true);
      setAutoProceedActive(true);
      playTone('allGood');
      setLogs((prev) => [
        ...prev,
        `[00:${(0.2 + items.length * 0.45 + 0.1).toFixed(3)}] STATUS: ALL 8 SENSORS VERIFIED & NOMINAL.`,
        `[00:${(0.2 + items.length * 0.45 + 0.2).toFixed(3)}] AUTHORIZATION: GOOD TO GO FOR LAUNCH.`,
        `[00:${(0.2 + items.length * 0.45 + 0.3).toFixed(3)}] FEED: Unlocking Live Telemetry Bus Data Stream...`,
      ]);
    }
  }, [isOpen, currentIndex, isDone]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Countdown timer when done
  useEffect(() => {
    if (!autoProceedActive) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoProceedActive, onComplete]);

  if (!isOpen) return null;

  const passedCount = items.filter((i) => i.status === 'PASS').length;
  const progressPercent = Math.round((passedCount / items.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#090d16] border border-cyan-800/80 rounded-xl shadow-2xl shadow-cyan-950/60 flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header HUD */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#0d1527] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
                  Orbitra ’26 Avionics · Power-On Self-Test (POST)
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                  v2.4
                </span>
              </div>
              <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
                PRE-FLIGHT SENSOR & SUBSYSTEM DIAGNOSTICS
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startDiagnostics}
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
              title="Re-run Diagnostic Self-Test"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
              title="Bypass / Skip Pre-Flight Check"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar banner */}
        <div className="px-6 py-3 bg-[#0c1220] border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-xs font-mono text-slate-300 whitespace-nowrap">
              Diagnostic Health:
            </div>
            <div className="w-48 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/60">
              <div
                className={`h-full transition-all duration-300 ${
                  isDone
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-sm shadow-emerald-500/50'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {progressPercent}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({passedCount}/{items.length} Modules Nominal)
            </span>
          </div>

          {/* Quick status pill */}
          <div>
            {!isDone ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-950/70 border border-cyan-800/80 text-cyan-300 font-mono text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                Interrogating Sensor Bus #{currentIndex + 1}...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-950/80 border border-emerald-600 text-emerald-300 font-mono text-xs font-bold animate-pulse shadow-sm shadow-emerald-900/50">
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                ALL SYSTEMS GO FOR LAUNCH
              </span>
            )}
          </div>
        </div>

        {/* Body content: Sensor grid & terminal console */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Main Triumphant "GOOD TO GO" Aerospace Banner when completed */}
          {isDone && (
            <div className="relative overflow-hidden rounded-xl border-2 border-emerald-500/80 bg-gradient-to-r from-emerald-950/90 via-[#06241a] to-emerald-950/90 p-5 shadow-lg shadow-emerald-950/50 animate-in zoom-in-95 duration-300">
              <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-400 text-slate-950 uppercase">
                        Clearance Granted
                      </span>
                      <span className="text-xs font-mono text-emerald-300/80">
                        Zero Faults Detected
                      </span>
                    </div>
                    <h3 className="text-lg font-mono font-bold text-white tracking-wide mt-1">
                      ALL SENSORS NOMINAL · GOOD TO GO FOR LAUNCH
                    </h3>
                    <p className="text-xs font-mono text-emerald-200/90 mt-0.5">
                      Hardware calibration verified across all 8 subsystems. CanSat avionics cleared for live telemetry downlink.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={onComplete}
                    className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-900/50 hover:scale-105 cursor-pointer"
                  >
                    <span>PROCEED TO LIVE TELEMETRY</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="ml-1 px-1.5 py-0.5 bg-black/20 rounded text-[10px]">
                      {countdown}s
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sensor Diagnostics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {items.map((item, idx) => {
              const isChecking = item.status === 'CHECKING' || item.status === 'VERIFYING';
              const isPass = item.status === 'PASS';
              const isPending = item.status === 'PENDING';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                    isPass
                      ? 'bg-[#0a1818]/70 border-emerald-700/60 shadow-sm shadow-emerald-950/20'
                      : isChecking
                      ? 'bg-cyan-950/50 border-cyan-500/80 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                      : 'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}
                >
                  {/* Subtle top indicator bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-0.5 ${
                      isPass
                        ? 'bg-emerald-500'
                        : isChecking
                        ? 'bg-cyan-400 animate-pulse'
                        : 'bg-transparent'
                    }`}
                  />

                  <div>
                    {/* Header item */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        {item.category}
                      </span>
                      {isPass && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> PASS
                        </span>
                      )}
                      {isChecking && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                          {item.status === 'VERIFYING' ? 'VERIFY' : 'POLL'}
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[10px] font-mono text-slate-500">
                          QUEUED
                        </span>
                      )}
                    </div>

                    {/* Sensor Name */}
                    <h4
                      className={`text-xs font-mono font-bold mb-1 leading-snug ${
                        isPass ? 'text-slate-100' : isChecking ? 'text-cyan-200' : 'text-slate-400'
                      }`}
                    >
                      {item.name}
                    </h4>

                    {/* Bus / interface */}
                    <div className="text-[10px] font-mono text-slate-400 mb-2">
                      Bus: <span className="text-slate-300">{item.bus}</span>
                    </div>

                    {/* Detailed description */}
                    <p className="text-[10px] text-slate-400 leading-tight mb-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Reading / nominal result */}
                  <div className="pt-2 border-t border-slate-800/80 mt-1">
                    <div className="text-[9px] font-mono text-slate-500 uppercase">
                      Nominal Readout:
                    </div>
                    <div
                      className={`text-[11px] font-mono font-semibold truncate ${
                        isPass
                          ? 'text-emerald-300'
                          : isChecking
                          ? 'text-cyan-300 animate-pulse'
                          : 'text-slate-500'
                      }`}
                    >
                      {isPass ? item.nominalValue : isChecking ? 'Sampling register...' : 'Waiting for bus...'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Diagnostics Terminal Stream */}
          <div className="bg-[#05070c] border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>AVIONICS DIAGNOSTIC TELETYPE & TELEMETRY STREAM</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                BAUD 115200 · PACKET CRC-16
              </span>
            </div>

            <div
              ref={logContainerRef}
              className="h-28 overflow-y-auto font-mono text-[11px] space-y-1 pr-2 scrollbar-thin scrollbar-thumb-slate-800"
            >
              {logs.map((log, i) => {
                const isPass = log.includes('PASS:') || log.includes('GOOD TO GO') || log.includes('NOMINAL');
                const isVerify = log.includes('VERIFY:');
                const isProbe = log.includes('PROBE:');
                return (
                  <div
                    key={i}
                    className={`leading-relaxed ${
                      isPass
                        ? 'text-emerald-400 font-semibold'
                        : isVerify
                        ? 'text-amber-300'
                        : isProbe
                        ? 'text-cyan-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {log}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mission Control: Madan Mohan Malviya University of Technology (MMMUT)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startDiagnostics}
              className="px-3 py-1.5 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-run Diagnostics</span>
            </button>

            {isDone ? (
              <button
                onClick={onComplete}
                className="px-4 py-1.5 text-xs font-mono font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-900/50"
              >
                <span>Enter Live Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-xs font-mono rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Skip diagnostic check and go directly to telemetry"
              >
                <span>Bypass / Show Live Data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
