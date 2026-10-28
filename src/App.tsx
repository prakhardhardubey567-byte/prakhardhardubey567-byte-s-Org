import React, { useState, useEffect, useRef } from 'react';
import { serialService } from './services/serialService';
import { simulationService } from './services/simulationService';
import { TelemetryPacket, SerialPortStatus } from './types/telemetry';
import { LiveValuesView } from './components/LiveValuesView';
import { TimeSeriesView } from './components/TimeSeriesView';
import { OpenMctView } from './components/OpenMctView';
import { HardwarePipelineView } from './components/HardwarePipelineView';
import { UsbCommandDeck } from './components/UsbCommandDeck';
import { TeamSputnikModal } from './components/TeamSputnikModal';
import { SensorShowcaseView } from './components/SensorShowcaseView';
import { UsbConnectModal } from './components/UsbConnectModal';
import { ThresholdWarningBanner } from './components/ThresholdWarningBanner';
import { ThresholdConfigModal } from './components/ThresholdConfigModal';
import { MissionChecklistSidebar } from './components/MissionChecklistSidebar';
import { thresholdService } from './services/thresholdService';
import { ThresholdRule, AlertSeverity, AlarmIncident } from './types/thresholds';
import { 
  Radio, 
  Usb, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  ShieldCheck, 
  GraduationCap,
  Activity,
  Layers,
  Sparkles,
  Cpu,
  AlertTriangle,
  AlertOctagon,
  Sliders,
  CheckSquare
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'live' | 'plots' | 'openmct' | 'pipeline' | 'usb' | 'sensors'>('live');
  const [currentPacket, setCurrentPacket] = useState<TelemetryPacket | null>(null);
  const [history, setHistory] = useState<TelemetryPacket[]>([]);
  const [serialStatus, setSerialStatus] = useState<SerialPortStatus>(serialService.getStatus());
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [audioBeep, setAudioBeep] = useState<boolean>(false);
  const [showTeamModal, setShowTeamModal] = useState<boolean>(false);
  const [showUsbModal, setShowUsbModal] = useState<boolean>(false);
  const [showThresholdModal, setShowThresholdModal] = useState<boolean>(false);
  const [showChecklistSidebar, setShowChecklistSidebar] = useState<boolean>(false);
  const [thresholdRules, setThresholdRules] = useState<ThresholdRule[]>([]);
  const [maxSeverity, setMaxSeverity] = useState<AlertSeverity>('NOMINAL');
  const [alarmIncidents, setAlarmIncidents] = useState<AlarmIncident[]>([]);

  // Mission Elapsed Time (MET)
  const [missionElapsedSec, setMissionElapsedSec] = useState<number>(0);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(true);

  // Packet frequency calculation
  const [packetCountLastSec, setPacketCountLastSec] = useState<number>(0);
  const [hzRate, setHzRate] = useState<number>(2.0);
  const packetCountRef = useRef<number>(0);

  // Audio Context for telemetry beeps
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTelemetryBeep = (isAlarm: boolean = false) => {
    if (!audioBeep) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isAlarm ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isAlarm ? 880 : 1450, ctx.currentTime);
      gain.gain.setValueAtTime(isAlarm ? 0.08 : 0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (isAlarm ? 0.12 : 0.05));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (isAlarm ? 0.12 : 0.05));
    } catch (e) {
      // Audio autoplay restrictions
    }
  };

  // Subscribe to serial packets
  useEffect(() => {
    // Start simulator by default so user immediately sees live data
    simulationService.start();
    setIsSimulating(true);

    const unsubPacket = serialService.onPacket((packet) => {
      packetCountRef.current++;
      setCurrentPacket(packet);

      // Evaluate threshold monitoring
      const evalRes = thresholdService.evaluate(packet);
      setThresholdRules(evalRes.rules);
      setMaxSeverity(evalRes.maxSeverity);
      setAlarmIncidents(thresholdService.getIncidents());

      playTelemetryBeep(evalRes.maxSeverity === 'CRITICAL');

      setHistory((prev) => {
        // Keep up to 600 packets in memory for smooth charting
        const next = [...prev, packet];
        if (next.length > 600) next.shift();
        return next;
      });
    });

    const unsubStatus = serialService.onStatus((status) => {
      setSerialStatus(status);
      if (status.connected) {
        // If real USB connects, stop simulator to receive real hardware data
        simulationService.stop();
        setIsSimulating(false);
      }
    });

    return () => {
      unsubPacket();
      unsubStatus();
      simulationService.stop();
    };
  }, [audioBeep]);

  // Frequency calculator
  useEffect(() => {
    const timer = setInterval(() => {
      setHzRate(packetCountRef.current);
      packetCountRef.current = 0;
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mission Elapsed Time timer
  useEffect(() => {
    if (!isClockRunning) return;
    const interval = setInterval(() => {
      setMissionElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isClockRunning]);

  const formatMet = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `T+${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSimulation = () => {
    if (isSimulating) {
      simulationService.stop();
      setIsSimulating(false);
    } else {
      simulationService.start();
      setIsSimulating(true);
    }
  };

  const handleUsbConnectToggle = async () => {
    if (serialStatus.connected) {
      await serialService.disconnect();
    } else {
      const ok = await serialService.connectPhysical(115200);
      if (ok.success) {
        setActiveTab('usb');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* 1. Mandatory Top Bar Contract: Exactly 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-[#07090e]/95 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('live');
          }}
          className="text-base font-bold font-mono tracking-tight text-slate-100 whitespace-nowrap shrink-0 flex items-center gap-2 hover:text-cyan-400 transition-colors"
        >
          <span className="w-2.5 h-2.5 rounded-xs bg-cyan-400 inline-block" />
          <span>ORBITRA ’26 · TEAM SPUTNIK</span>
        </a>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-mono font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('live')}
            className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'live' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
            }`}
          >
            <span>01 Live Values</span>
          </button>

          <button
            onClick={() => setActiveTab('plots')}
            className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'plots' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
            }`}
          >
            <span>02 Time-Series Plots</span>
          </button>

          <button
            onClick={() => setActiveTab('openmct')}
            className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'openmct' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
            }`}
          >
            <span>03 Open MCT View</span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'pipeline' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
            }`}
          >
            <span>Hardware Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('usb')}
            className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'usb' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
            }`}
          >
            <span>USB Transceiver</span>
          </button>

          <button
            onClick={() => setActiveTab('sensors')}
            className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'sensors' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5' : ''
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sensor Suite & Photos</span>
          </button>

          <button
            onClick={() => setShowChecklistSidebar(true)}
            className="hover:text-cyan-400 text-slate-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            title="Open Pre-Flight Mission Checklist"
          >
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mission Checklist</span>
          </button>

          <button
            onClick={() => setShowTeamModal(true)}
            className="hover:text-amber-400 text-slate-400 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Team Sputnik</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowUsbModal(true)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
              serialStatus.connected
                ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-300 hover:bg-emerald-900/80 shadow-sm shadow-emerald-900/40'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-900/30'
            }`}
            title="Click to manage USB hardware connection"
          >
            <Usb className="w-3.5 h-3.5" />
            <span>
              {serialStatus.connected
                ? `USB: ${serialStatus.portName.split(' ')[0]} (Connected)`
                : 'Connect USB Port'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex items-center overflow-x-auto gap-2 px-4 py-2 border-b border-slate-800 bg-slate-950 text-xs font-mono">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'live' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-400'
          }`}
        >
          01 Live
        </button>
        <button
          onClick={() => setActiveTab('plots')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'plots' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-400'
          }`}
        >
          02 Plots
        </button>
        <button
          onClick={() => setActiveTab('openmct')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'openmct' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-400'
          }`}
        >
          03 Open MCT
        </button>
        <button
          onClick={() => setActiveTab('sensors')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'sensors' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-400'
          }`}
        >
          Sensors
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'pipeline' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-400'
          }`}
        >
          Pipeline
        </button>
        <button
          onClick={() => setActiveTab('usb')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'usb' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-400'
          }`}
        >
          USB Transmit
        </button>
        <button
          onClick={() => setShowChecklistSidebar(true)}
          className="px-2.5 py-1 rounded whitespace-nowrap text-cyan-300 bg-cyan-950/60 border border-cyan-800 flex items-center gap-1"
        >
          <CheckSquare className="w-3 h-3" />
          <span>Checklist</span>
        </button>
        <button
          onClick={() => setShowTeamModal(true)}
          className="px-2.5 py-1 rounded whitespace-nowrap text-amber-400"
        >
          Team Sputnik
        </button>
      </div>

      {/* Main Mission Control Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Real-time Threshold Warning Banner (Master Alarm) */}
        <ThresholdWarningBanner
          rules={thresholdRules}
          maxSeverity={maxSeverity}
          onOpenConfig={() => setShowThresholdModal(true)}
        />

        {/* Mission Status Header Strip - Zero Pill Discipline */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-cyan-400 font-semibold">ORBITRA ’26 TELEMETRY GROUND STATION</span>
              <span className="text-slate-600">·</span>
              <span>MMMUT GORAKHPUR</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-xl font-mono font-bold text-slate-100 tracking-tight">
                TEAM SPUTNIK
              </h1>
              <span className="text-xs font-mono text-slate-400">
                Leader: <span className="text-slate-200 font-medium">Ujjwal Yadav</span>
              </span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <button
                onClick={() => setShowTeamModal(true)}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-2 hidden sm:inline"
              >
                View 4 Members
              </button>
            </div>
          </div>

          {/* Telemetry Clock & Status Controls */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-mono text-xs">
            {/* Mission Elapsed Time */}
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded flex items-center gap-2">
              <span className="text-slate-500">MET:</span>
              <span className="text-cyan-300 font-bold text-sm tracking-wide">
                {formatMet(missionElapsedSec)}
              </span>
              <button
                onClick={() => setIsClockRunning((r) => !r)}
                className="p-1 hover:text-slate-200 text-slate-500"
                title={isClockRunning ? 'Hold Clock' : 'Start Clock'}
              >
                {isClockRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setMissionElapsedSec(0)}
                className="p-1 hover:text-slate-200 text-slate-500"
                title="Reset MET"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Master Caution / Threshold Indicator */}
            <button
              onClick={() => setShowThresholdModal(true)}
              className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 transition-colors cursor-pointer ${
                maxSeverity === 'CRITICAL'
                  ? 'bg-rose-950/80 border-rose-600 text-rose-200 animate-pulse shadow-sm shadow-rose-900/50'
                  : maxSeverity === 'WARNING'
                  ? 'bg-amber-950/80 border-amber-600 text-amber-200 shadow-sm shadow-amber-900/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Inspect Mission Thresholds & Safety Limits"
            >
              {maxSeverity === 'CRITICAL' ? (
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              ) : maxSeverity === 'WARNING' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="text-[11px] font-bold">
                {maxSeverity === 'CRITICAL'
                  ? '✖ CRITICAL BREACH'
                  : maxSeverity === 'WARNING'
                  ? '▲ CAUTION'
                  : 'LIMITS NOMINAL'}
              </span>
            </button>

            {/* Mission Pre-Flight Checklist Panel Trigger */}
            <button
              onClick={() => setShowChecklistSidebar(true)}
              className="px-2.5 py-1.5 rounded border border-cyan-800/80 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Open Pre-Flight Mission Checklist Sidebar"
            >
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-bold">FLIGHT CHECKLIST</span>
            </button>

            {/* Audio telemetry chirps */}
            <button
              onClick={() => setAudioBeep((b) => !b)}
              className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 transition-colors ${
                audioBeep
                  ? 'bg-cyan-950/50 border-cyan-800 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Telemetry Audio Pips"
            >
              {audioBeep ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{audioBeep ? 'Audio ON' : 'Muted'}</span>
            </button>

            {/* Clickable USB Link Status button */}
            <button
              onClick={() => setShowUsbModal(true)}
              className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 transition-colors cursor-pointer ${
                serialStatus.connected
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Configure USB Hardware or Virtual Transceiver"
            >
              <Usb className="w-3.5 h-3.5" />
              <span className="text-[11px]">
                {serialStatus.connected ? `${serialStatus.portName.split(' ')[0]} Active` : 'USB Disconnected'}
              </span>
            </button>

            {/* Simulation toggle */}
            <button
              onClick={toggleSimulation}
              className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 transition-colors ${
                isSimulating
                  ? 'bg-amber-950/50 border-amber-800 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Flight Simulator"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[11px]">
                {isSimulating ? 'Sim Stream' : 'Sim Paused'}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Viewport Routing */}
        {activeTab === 'live' && (
          <LiveValuesView
            packet={currentPacket}
            history={history}
            hzRate={hzRate}
            rules={thresholdRules}
          />
        )}

        {activeTab === 'plots' && (
          <TimeSeriesView
            history={history}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused((p) => !p)}
            onClearHistory={() => setHistory([])}
          />
        )}

        {activeTab === 'openmct' && (
          <OpenMctView
            packet={currentPacket}
            history={history}
            hzRate={hzRate}
          />
        )}

        {activeTab === 'sensors' && (
          <SensorShowcaseView />
        )}

        {activeTab === 'pipeline' && (
          <HardwarePipelineView
            onTriggerLaunch={() => simulationService.triggerLaunch()}
            onTriggerParachute={() => simulationService.triggerParachute()}
            onResetSimulation={() => simulationService.reset()}
            isSimulating={isSimulating}
          />
        )}

        {activeTab === 'usb' && (
          <UsbCommandDeck
            onSimulateLaunch={() => simulationService.triggerLaunch()}
            onSimulateParachute={() => simulationService.triggerParachute()}
            isSimulating={isSimulating}
          />
        )}
      </main>

      {/* Mission Pre-Flight Checklist Sidebar Panel */}
      <MissionChecklistSidebar
        isOpen={showChecklistSidebar}
        onClose={() => setShowChecklistSidebar(false)}
        currentPacket={currentPacket}
        hzRate={hzRate}
      />

      {/* Team Sputnik Modal */}
      <TeamSputnikModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
      />

      {/* USB Hardware Connection Modal */}
      <UsbConnectModal
        isOpen={showUsbModal}
        onClose={() => setShowUsbModal(false)}
        onOpenUsbTab={() => setActiveTab('usb')}
      />

      {/* Mission Threshold Limits & Alert Calibration Modal */}
      <ThresholdConfigModal
        isOpen={showThresholdModal}
        onClose={() => setShowThresholdModal(false)}
        incidents={alarmIncidents}
        onClearIncidents={() => {
          thresholdService.clearIncidents();
          setAlarmIncidents([]);
        }}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 mt-8 bg-slate-950/80 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>ORBITRA ’26 CAN-SAT MISSION CONTROL</span>
          <span>·</span>
          <span>TEAM SPUTNIK</span>
          <span>·</span>
          <span>MADAN MOHAN MALVIYA UNIVERSITY OF TECHNOLOGY, GORAKHPUR</span>
        </div>
        <div className="flex items-center gap-3">
          <span>STREAM: {serialStatus.connected ? 'USB HARDWARE' : 'FLIGHT SIMULATOR'}</span>
          <span>·</span>
          <span className="text-cyan-400">TELEMETRY NOMINAL</span>
        </div>
      </footer>
    </div>
  );
}
