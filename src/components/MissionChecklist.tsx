import React, { useState, useMemo } from 'react';
import { 
  ChecklistItem, 
  ChecklistStatus, 
  ChecklistCategory 
} from '../types/checklist';
import { TelemetryPacket } from '../types/telemetry';
import { 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  Loader2, 
  CheckSquare, 
  RotateCcw, 
  Download, 
  Zap, 
  Radio, 
  Compass, 
  Navigation, 
  ShieldCheck, 
  Sliders, 
  UserCheck, 
  Cpu, 
  Activity,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';

interface MissionChecklistProps {
  currentPacket: TelemetryPacket | null;
  hzRate?: number;
  onClose?: () => void;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: 'CHK-01',
    title: 'ESP32 Flight Core & 2S Power Rail Check',
    category: 'POWER',
    status: 'GO',
    description: 'Verify 2S LiPo pack voltage, onboard AMS1117 3.3V voltage rail stability, and ESP32 boot cycle.',
    responsible: 'Priyanshu Yadav (Power Lead)',
    telemetryParam: 'battery',
    nominalCriteria: '≥ 8.2V (Nominal 8.4V pack), 3.3V rail ripple < 30mV',
    lastUpdated: 'T-15m 22s'
  },
  {
    id: 'CHK-02',
    title: 'ESP32 Wireless & Serial Telemetry Handshake',
    category: 'RF_COMMS',
    status: 'GO',
    description: 'Confirm bi-directional wireless UART telemetry stream with ground station, ESP32 packet integrity, and RSSI link budget.',
    responsible: 'Ratnesh Kumar Singh (Wireless Comms Lead)',
    telemetryParam: 'rssi',
    nominalCriteria: 'RSSI ≥ -80 dBm, SNR > 6.0 dB, 0 dropped frames in 30s',
    lastUpdated: 'T-12m 45s'
  },
  {
    id: 'CHK-03',
    title: 'BMP280 Barometer Ground Zero Reference',
    category: 'AVIONICS',
    status: 'GO',
    description: 'Calibrate sea-level pressure QNH datum and zero AGL baseline relative to MMMUT launch pad elevation (85m AMSL).',
    responsible: 'Priyanshu Yadav (Avionics)',
    telemetryParam: 'altitude',
    nominalCriteria: 'Altitude 0.0m ± 0.5m AGL, Atmospheric pressure 1008-1016 hPa',
    lastUpdated: 'T-10m 10s'
  },
  {
    id: 'CHK-04',
    title: 'MPU6050 6-DoF IMU Bias Nulling & Calibration',
    category: 'AVIONICS',
    status: 'GO',
    description: 'Sample 500 stationary gyro packets to compute drift offsets. Check vertical accelerometer reads 1.0G on pad.',
    responsible: 'Priyanshu Yadav (Avionics)',
    telemetryParam: 'gyro',
    nominalCriteria: 'Gyro drift < 0.1°/sec, Accel Z = 0.98G ~ 1.02G stationary',
    lastUpdated: 'T-08m 15s'
  },
  {
    id: 'CHK-05',
    title: 'DHT11 Humidity & Meteorology Sensor Calibration',
    category: 'AVIONICS',
    status: 'GO',
    description: 'Verify single-wire digital response, calibrated relative humidity (20-90% RH) and ambient temperature reading.',
    responsible: 'Priyanshu Yadav (Avionics)',
    telemetryParam: 'humidity',
    nominalCriteria: 'Relative humidity 20-90% RH nominal, 40-bit data packet valid',
    lastUpdated: 'T-07m 00s'
  },
  {
    id: 'CHK-06',
    title: 'NEO-6M GNSS 3D Satellite Fix Lock',
    category: 'AVIONICS',
    status: 'IN_PROGRESS',
    description: 'Verify almanac/ephemeris sync, minimum 6 satellites tracked, and HDOP precision before payload deployment.',
    responsible: 'Prakhar Dhar Dubey (Software & Navigation)',
    telemetryParam: 'gps',
    nominalCriteria: 'Tracked Satellites ≥ 6, HDOP < 1.5, 3D Fix Flag = TRUE',
    lastUpdated: 'T-05m 40s'
  },
  {
    id: 'CHK-07',
    title: 'Parachute Ejection Servo & Pyrotechnic Continuity',
    category: 'RECOVERY',
    status: 'GO',
    description: 'Test dual-stage deployment servo mechanism latch, spring tension, and backup burn-wire continuity loop.',
    responsible: 'Atul Kumar Maurya (Recovery Lead)',
    nominalCriteria: 'Latch lock verified, Servo sweep 0°->90°->0° nominal, Continuity < 2Ω',
    lastUpdated: 'T-04m 20s'
  },
  {
    id: 'CHK-08',
    title: 'Acoustic Recovery Siren & Touchdown Buzzer',
    category: 'RECOVERY',
    status: 'GO',
    description: 'Perform 0.5s audio pulse test on 105dB piezoelectric buzzer for post-landing locator beacon.',
    responsible: 'Atul Kumar Maurya (Recovery Lead)',
    nominalCriteria: 'Audible chirp confirmed on pad, trigger circuit impedance nominal',
    lastUpdated: 'T-03m 50s'
  },
  {
    id: 'CHK-09',
    title: 'Ground Station & Open MCT Telemetry Bridge',
    category: 'GROUND_STATION',
    status: 'GO',
    description: 'Validate WebSocket server port 8080 streaming, serial port buffer sync, and packet ingestion frequency.',
    responsible: 'Prakhar Dhar Dubey (Ground Systems)',
    telemetryParam: 'rate',
    nominalCriteria: 'Ingestion rate ≥ 2.0 Hz, zero socket reconnects in 60s',
    lastUpdated: 'T-02m 10s'
  },
  {
    id: 'CHK-10',
    title: 'Range Safety & Flight Director Launch Clearance',
    category: 'RANGE_SAFETY',
    status: 'PENDING',
    description: 'Final flight readiness review, airspace clearance window verification, and team sign-off for CanSat release.',
    responsible: 'Ujjwal Yadav (Team Leader & Launch Director)',
    nominalCriteria: 'All subsystems GO, Range perimeter cleared, Director authorization',
    lastUpdated: 'Pending Launch Call'
  }
];

export function MissionChecklist({ currentPacket, hzRate = 2.0 }: MissionChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const goCount = items.filter((i) => i.status === 'GO').length;
    const noGoCount = items.filter((i) => i.status === 'NO_GO').length;
    const inProgressCount = items.filter((i) => i.status === 'IN_PROGRESS').length;
    const pendingCount = items.filter((i) => i.status === 'PENDING').length;
    const percentGo = Math.round((goCount / total) * 100);

    let readinessState: 'FLIGHT_READY' | 'HOLD_NO_GO' | 'IN_PROGRESS' = 'IN_PROGRESS';
    if (noGoCount > 0) {
      readinessState = 'HOLD_NO_GO';
    } else if (goCount === total) {
      readinessState = 'FLIGHT_READY';
    }

    return { total, goCount, noGoCount, inProgressCount, pendingCount, percentGo, readinessState };
  }, [items]);

  // Status cycler when clicking the toggleable icon
  const cycleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const cycleOrder: ChecklistStatus[] = ['PENDING', 'IN_PROGRESS', 'GO', 'NO_GO'];
        const nextIdx = (cycleOrder.indexOf(item.status) + 1) % cycleOrder.length;
        return {
          ...item,
          status: cycleOrder[nextIdx],
          lastUpdated: 'Just now'
        };
      })
    );
  };

  // Direct set status
  const setItemStatus = (id: string, newStatus: ChecklistStatus) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus, lastUpdated: 'Just now' } : item
      )
    );
  };

  // Quick Action: Set All GO
  const handleSetAllGo = () => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, status: 'GO', lastUpdated: 'Signoff Complete' }))
    );
    showNotice('All checklist items updated to [GO]');
  };

  // Quick Action: Reset Checklist to Initial State
  const handleResetChecklist = () => {
    setItems(DEFAULT_CHECKLIST);
    showNotice('Checklist reset to baseline pre-flight values');
  };

  // Quick Action: Auto-Verify with Live Telemetry
  const handleAutoVerify = () => {
    if (!currentPacket) {
      showNotice('No live telemetry packet available to verify against');
      return;
    }

    let verifiedCount = 0;
    setItems((prev) =>
      prev.map((item) => {
        let shouldGo = false;
        if (item.telemetryParam === 'battery' && currentPacket.voltage >= 8.0) {
          shouldGo = true;
        } else if (item.telemetryParam === 'rssi' && currentPacket.rssi >= -90) {
          shouldGo = true;
        } else if (item.telemetryParam === 'altitude' && Math.abs(currentPacket.altitude) < 500) {
          shouldGo = true;
        } else if (item.telemetryParam === 'gps' && currentPacket.gpsSats >= 6) {
          shouldGo = true;
        } else if (item.telemetryParam === 'rate' && (hzRate || 0) >= 1.5) {
          shouldGo = true;
        } else if (item.telemetryParam === 'gyro' && Math.abs(currentPacket.yaw) < 360) {
          shouldGo = true;
        } else if (item.telemetryParam === 'humidity' && (currentPacket.humidity || 50) >= 15) {
          shouldGo = true;
        }

        if (shouldGo) {
          verifiedCount++;
          return { ...item, status: 'GO', lastUpdated: 'Verified Live' };
        }
        return item;
      })
    );

    showNotice(`Telemetry Auto-Check: ${verifiedCount} subsystems verified nominal!`);
  };

  const showNotice = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Export report as JSON/Text
  const handleExportReport = () => {
    const report = {
      mission: 'ORBITRA ’26 CAN-SAT TELEMETRY',
      team: 'TEAM SPUTNIK',
      institution: 'Madan Mohan Malviya University of Technology, Gorakhpur',
      flightDirector: 'Ujjwal Yadav',
      timestamp: new Date().toISOString(),
      summary: {
        total: stats.total,
        go: stats.goCount,
        noGo: stats.noGoCount,
        readiness: stats.readinessState
      },
      liveTelemetrySnapshot: currentPacket,
      tasks: items
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sputnik_checklist_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Flight readiness sign-off report downloaded');
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });

  // Render live telemetry value helper
  const renderLiveParamValue = (param?: ChecklistItem['telemetryParam']) => {
    if (!param || !currentPacket) return null;
    switch (param) {
      case 'battery':
        return (
          <span className="font-mono text-[11px] text-cyan-300">
            Live: {currentPacket.voltage.toFixed(2)}V
          </span>
        );
      case 'rssi':
        return (
          <span className="font-mono text-[11px] text-cyan-300">
            Live: {currentPacket.rssi} dBm
          </span>
        );
      case 'altitude':
        return (
          <span className="font-mono text-[11px] text-cyan-300">
            Live: {currentPacket.altitude.toFixed(1)}m
          </span>
        );
      case 'gps':
        return (
          <span className="font-mono text-[11px] text-cyan-300">
            Live: {currentPacket.gpsSats} Sats
          </span>
        );
      case 'gyro':
        return (
          <span className="font-mono text-[11px] text-cyan-300">
            Live: {currentPacket.yaw.toFixed(1)}°
          </span>
        );
      case 'humidity':
        return (
          <span className="font-mono text-[11px] text-cyan-300">
            Live: {(currentPacket.humidity || 58.0).toFixed(1)}% RH
          </span>
        );
      case 'rate':
        return (
          <span className="font-mono text-[11px] text-cyan-300">
            Live: {hzRate.toFixed(1)} Hz
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#07090e] text-slate-100 select-none">
      {/* Flight Readiness Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold tracking-wider text-slate-200">
              MISSION READINESS STATUS
            </span>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-400">
            {stats.goCount} / {stats.total} GO ({stats.percentGo}%)
          </span>
        </div>

        {/* Big Status Banner */}
        <div
          className={`p-2.5 rounded border flex items-center justify-between ${
            stats.readinessState === 'FLIGHT_READY'
              ? 'bg-emerald-950/50 border-emerald-600/80 text-emerald-200'
              : stats.readinessState === 'HOLD_NO_GO'
              ? 'bg-rose-950/50 border-rose-600/80 text-rose-200'
              : 'bg-amber-950/40 border-amber-600/70 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {stats.readinessState === 'FLIGHT_READY' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            {stats.readinessState === 'HOLD_NO_GO' && (
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
            )}
            {stats.readinessState === 'IN_PROGRESS' && (
              <Loader2 className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
            )}
            <div>
              <div className="text-xs font-mono font-bold tracking-wide">
                {stats.readinessState === 'FLIGHT_READY' && 'GO FOR FLIGHT · ALL SYSTEMS GREEN'}
                {stats.readinessState === 'HOLD_NO_GO' && 'LAUNCH HOLD · CRITICAL NO-GO'}
                {stats.readinessState === 'IN_PROGRESS' && 'PRE-FLIGHT VERIFICATION ACTIVE'}
              </div>
              <div className="text-[10px] font-mono text-slate-300">
                {stats.readinessState === 'FLIGHT_READY' && 'Director sign-off enabled · CanSat release cleared'}
                {stats.readinessState === 'HOLD_NO_GO' && `${stats.noGoCount} item(s) flagged NO-GO · Abort hold active`}
                {stats.readinessState === 'IN_PROGRESS' && `${stats.pendingCount + stats.inProgressCount} item(s) pending check`}
              </div>
            </div>
          </div>
          <div className="text-right font-mono text-xs hidden sm:block">
            <span className="text-slate-400">Director: </span>
            <span className="font-bold text-slate-200">Ujjwal Yadav</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3 border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              stats.readinessState === 'FLIGHT_READY'
                ? 'bg-emerald-400'
                : stats.readinessState === 'HOLD_NO_GO'
                ? 'bg-rose-500'
                : 'bg-amber-400'
            }`}
            style={{ width: `${stats.percentGo}%` }}
          />
        </div>

        {/* Status Counts Bar */}
        <div className="grid grid-cols-4 gap-2 mt-3 font-mono text-center">
          <button
            onClick={() => setStatusFilter(statusFilter === 'GO' ? 'ALL' : 'GO')}
            className={`px-2 py-1 rounded text-[11px] border transition-colors ${
              statusFilter === 'GO'
                ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="text-emerald-400 font-bold">{stats.goCount}</span> GO
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
            className={`px-2 py-1 rounded text-[11px] border transition-colors ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-amber-950 border-amber-600 text-amber-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="text-amber-400 font-bold">{stats.inProgressCount}</span> IN PROG
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`px-2 py-1 rounded text-[11px] border transition-colors ${
              statusFilter === 'PENDING'
                ? 'bg-slate-800 border-slate-500 text-slate-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <span className="text-slate-200 font-bold">{stats.pendingCount}</span> PEND
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'NO_GO' ? 'ALL' : 'NO_GO')}
            className={`px-2 py-1 rounded text-[11px] border transition-colors ${
              statusFilter === 'NO_GO'
                ? 'bg-rose-950 border-rose-600 text-rose-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="text-rose-400 font-bold">{stats.noGoCount}</span> NO-GO
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleAutoVerify}
            className="px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-700/80 hover:bg-cyan-900/80 text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Automatically check live sensor packets against criteria"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Auto-Check</span>
          </button>
          <button
            onClick={handleSetAllGo}
            className="px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-700/80 hover:bg-emerald-900/80 text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Mark all items as GO for launch"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Set All GO</span>
          </button>
          <button
            onClick={handleResetChecklist}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Reset checklist to initial pre-flight state"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <button
          onClick={handleExportReport}
          className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
          title="Download official signed checklist report"
        >
          <Download className="w-3 h-3 text-cyan-400" />
          <span>Export Sign-off</span>
        </button>
      </div>

      {/* Temporary feedback banner */}
      {feedbackMsg && (
        <div className="bg-cyan-950/90 border-b border-cyan-800 px-4 py-1.5 text-xs font-mono text-cyan-300 flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-3 h-3 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="px-4 py-2 border-b border-slate-900 bg-slate-950/50 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono no-scrollbar">
        <span className="text-slate-500 flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3 h-3" />
        </span>
        {['ALL', 'POWER', 'AVIONICS', 'RF_COMMS', 'RECOVERY', 'GROUND_STATION', 'RANGE_SAFETY'].map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {cat === 'ALL' ? `All (${items.length})` : cat.replace('_', ' ')}
            </button>
          )
        )}
      </div>

      {/* Checklist Tasks Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono text-slate-500">
            No checklist items match the current filter.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isGo = item.status === 'GO';
            const isNoGo = item.status === 'NO_GO';
            const isInProg = item.status === 'IN_PROGRESS';
            const isPending = item.status === 'PENDING';

            return (
              <div
                key={item.id}
                className={`p-3 rounded border transition-all ${
                  isGo
                    ? 'bg-slate-950/80 border-emerald-900/40 hover:border-emerald-700/60'
                    : isNoGo
                    ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700'
                    : isInProg
                    ? 'bg-amber-950/20 border-amber-900/50 hover:border-amber-700'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header row with toggleable status icon button */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {/* TOGGLEABLE STATUS ICON: Clicking directly cycles status */}
                    <button
                      onClick={() => cycleStatus(item.id)}
                      className={`p-1.5 rounded transition-all cursor-pointer shrink-0 mt-0.5 ${
                        isGo
                          ? 'bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900 border border-emerald-700/60 hover:scale-105'
                          : isNoGo
                          ? 'bg-rose-950/80 text-rose-400 hover:bg-rose-900 border border-rose-700/60 hover:scale-105'
                          : isInProg
                          ? 'bg-amber-950/80 text-amber-400 hover:bg-amber-900 border border-amber-700/60 hover:scale-105'
                          : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800 hover:scale-105'
                      }`}
                      title="Click to cycle status: PENDING → IN PROGRESS → GO → NO-GO"
                    >
                      {isGo && <CheckCircle2 className="w-4 h-4" />}
                      {isNoGo && <AlertOctagon className="w-4 h-4" />}
                      {isInProg && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isPending && <Clock className="w-4 h-4" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-cyan-400/90 font-bold bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                          {item.id}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          {item.category.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-xs font-mono font-bold text-slate-100 mt-1 leading-snug">
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  {/* Quick Status Buttons */}
                  <div className="flex items-center gap-1 font-mono text-[10px] shrink-0">
                    <button
                      onClick={() => setItemStatus(item.id, 'GO')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        isGo
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-emerald-400 hover:bg-emerald-950 border border-emerald-900/60'
                      }`}
                      title="Set to GO"
                    >
                      GO
                    </button>
                    <button
                      onClick={() => setItemStatus(item.id, 'NO_GO')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        isNoGo
                          ? 'bg-rose-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-rose-400 hover:bg-rose-950 border border-rose-900/60'
                      }`}
                      title="Set to NO-GO"
                    >
                      HOLD
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Subsystem Criteria & Live Metric Comparison */}
                <div className="mt-2.5 pt-2 border-t border-slate-900/80 flex flex-col gap-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-slate-500">Nominal Criteria:</span>
                    <span className="text-slate-300 text-right truncate max-w-[220px]">
                      {item.nominalCriteria}
                    </span>
                  </div>

                  {item.telemetryParam && (
                    <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/80">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-cyan-400" />
                        <span>Telemetry Link:</span>
                      </span>
                      {renderLiveParamValue(item.telemetryParam)}
                    </div>
                  )}

                  {/* Responsible Member & Updated Time */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1 text-slate-400">
                      <UserCheck className="w-3 h-3 text-amber-400/80" />
                      <span>{item.responsible}</span>
                    </span>
                    <span>{item.lastUpdated}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          <span>TEAM SPUTNIK · MMMUT GORAKHPUR</span>
        </div>
        <span>ORBITRA ’26 AVIONICS</span>
      </div>
    </div>
  );
}
