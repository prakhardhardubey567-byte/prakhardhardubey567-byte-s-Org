import React, { useState } from 'react';
import { ThresholdConfig, AlarmIncident } from '../types/thresholds';
import { thresholdService, DEFAULT_THRESHOLDS } from '../services/thresholdService';
import { serialService } from '../services/serialService';
import { 
  Sliders, 
  X, 
  Check, 
  RotateCcw, 
  AlertTriangle, 
  Sparkles, 
  Flame, 
  BatteryLow, 
  ArrowDownCircle, 
  History,
  ShieldCheck,
  Radio
} from 'lucide-react';

interface ThresholdConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: AlarmIncident[];
  onClearIncidents: () => void;
}

export const ThresholdConfigModal: React.FC<ThresholdConfigModalProps> = ({
  isOpen,
  onClose,
  incidents,
  onClearIncidents,
}) => {
  const [config, setConfig] = useState<ThresholdConfig>(thresholdService.getConfig());
  const [activeSubTab, setActiveSubTab] = useState<'limits' | 'test' | 'history'>('limits');
  const [savedFeedback, setSavedFeedback] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    thresholdService.updateConfig(config);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      onClose();
    }, 900);
  };

  const handleResetDefaults = () => {
    thresholdService.resetDefaults();
    setConfig({ ...DEFAULT_THRESHOLDS });
  };

  // Test Injections: inject simulated packets that trigger real threshold alerts
  const injectAlert = (type: 'overheat' | 'altitude' | 'battery' | 'descent' | 'nominal') => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    let alt = 450;
    let tempI = 28.5;
    let volt = 7.8;
    let descent = -5.8;
    let rssi = -72;
    let state = 'ASCENT';

    if (type === 'overheat') {
      tempI = 58.4; // Exceeds critical 55°C
    } else if (type === 'altitude') {
      alt = 1185.0; // Exceeds critical 1150m
      state = 'ASCENT';
    } else if (type === 'battery') {
      volt = 6.42; // Below critical 6.6V
    } else if (type === 'descent') {
      descent = -14.8; // Dangerous freefall
      state = 'PARACHUTE_DESCENT';
    } else if (type === 'nominal') {
      alt = 350;
      tempI = 28.0;
      volt = 7.9;
      descent = -6.0;
      state = 'PARACHUTE_DESCENT';
    }

    const testPacket = [
      'SPUTNIK',
      999,
      timeStr,
      alt.toFixed(1),
      (1013.25 - alt * 0.12).toFixed(1),
      '24.5',
      tempI.toFixed(1),
      volt.toFixed(2),
      '0.05',
      '-0.02',
      '9.81',
      '12.0',
      '-4.0',
      '180.0',
      descent.toFixed(2),
      '26.7321',
      '83.4332',
      alt.toFixed(1),
      '10',
      rssi,
      state,
    ].join(',');

    serialService.processLine(testPacket);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
      <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-2xl w-full p-5 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-amber-950/60 border border-amber-800 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                Mission Threshold Calibration & Limits
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure safety boundaries and test alert triggers for ORBITRA ’26
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg mt-3 text-xs">
          <button
            onClick={() => setActiveSubTab('limits')}
            className={`flex-1 py-1.5 rounded transition-colors ${
              activeSubTab === 'limits'
                ? 'bg-slate-800 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Safety Limits Calibration
          </button>
          <button
            onClick={() => setActiveSubTab('test')}
            className={`flex-1 py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 ${
              activeSubTab === 'test'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Alert Injections</span>
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex-1 py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'bg-slate-800 text-slate-200 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Alarm History ({incidents.length})</span>
          </button>
        </div>

        {/* Content based on active sub tab */}
        {activeSubTab === 'limits' && (
          <div className="mt-4 space-y-4 text-xs">
            {/* Limit Group 1: Altitude Ceiling */}
            <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>1. Altitude Ceiling Bounds</span>
                <span className="text-[10px] text-cyan-400 uppercase">Barometric MSL</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-amber-400 block mb-1">
                    WARNING CEILING (m):
                  </label>
                  <input
                    type="number"
                    value={config.altitudeMaxWarning}
                    onChange={(e) => setConfig({ ...config, altitudeMaxWarning: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-rose-400 block mb-1">
                    CRITICAL LIMIT (m):
                  </label>
                  <input
                    type="number"
                    value={config.altitudeMaxCritical}
                    onChange={(e) => setConfig({ ...config, altitudeMaxCritical: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Limit Group 2: Avionics Core Thermal */}
            <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>2. Internal Avionics Core Temperature</span>
                <span className="text-[10px] text-amber-400 uppercase">MCU Thermal</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-amber-400 block mb-1">
                    WARNING TEMP (°C):
                  </label>
                  <input
                    type="number"
                    value={config.tempInternalWarning}
                    onChange={(e) => setConfig({ ...config, tempInternalWarning: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-rose-400 block mb-1">
                    CRITICAL SHUTDOWN (°C):
                  </label>
                  <input
                    type="number"
                    value={config.tempInternalCritical}
                    onChange={(e) => setConfig({ ...config, tempInternalCritical: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Limit Group 3: 2S LiPo Battery Voltage */}
            <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>3. Battery Bus Voltage (2S LiPo)</span>
                <span className="text-[10px] text-emerald-400 uppercase">Power Subsystem</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-amber-400 block mb-1">
                    LOW VOLTAGE WARNING (V):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.voltageMinWarning}
                    onChange={(e) => setConfig({ ...config, voltageMinWarning: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-rose-400 block mb-1">
                    CRITICAL CUTOFF (V):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.voltageMinCritical}
                    onChange={(e) => setConfig({ ...config, voltageMinCritical: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Limit Group 4: Descent Velocity & High G */}
            <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-200">
                <span>4. Descent Velocity & Mechanical G-Force</span>
                <span className="text-[10px] text-violet-400 uppercase">Safety Envelope</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-rose-400 block mb-1">
                    CRITICAL DESCENT SPEED (m/s):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.descentVelocityCritical}
                    onChange={(e) => setConfig({ ...config, descentVelocityCritical: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-rose-500 font-mono"
                  />
                  <span className="text-[9px] text-slate-500">e.g. -11.0 m/s (indicates chute fail)</span>
                </div>
                <div>
                  <label className="text-[10px] text-amber-400 block mb-1">
                    MAX G-FORCE WARNING (G):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.accelMaxWarning}
                    onChange={(e) => setConfig({ ...config, accelMaxWarning: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[9px] text-slate-500">Normal launch is ~3.5G - 5G</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tab 2: Test Alert Injections */}
        {activeSubTab === 'test' && (
          <div className="mt-4 space-y-3 text-xs">
            <p className="text-slate-400 text-xs">
              Click any button below to instantly inject test telemetry exceeding that threshold to verify dashboard visual alarms, card flashing, and procedure recommendations:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => injectAlert('overheat')}
                className="p-3 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800 rounded-lg text-left flex items-start gap-2.5 transition-colors group cursor-pointer"
              >
                <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-200">Inject Overheat (58.4°C)</div>
                  <div className="text-[10px] text-rose-300/80 mt-0.5">
                    Triggers CRITICAL internal temperature alarm on HUD.
                  </div>
                </div>
              </button>

              <button
                onClick={() => injectAlert('altitude')}
                className="p-3 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800 rounded-lg text-left flex items-start gap-2.5 transition-colors group cursor-pointer"
              >
                <ArrowDownCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-cyan-200">Inject Ceiling Breach (1185m)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Triggers CRITICAL airspace altitude warning.
                  </div>
                </div>
              </button>

              <button
                onClick={() => injectAlert('battery')}
                className="p-3 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800 rounded-lg text-left flex items-start gap-2.5 transition-colors group cursor-pointer"
              >
                <BatteryLow className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-200">Inject Low Voltage (6.42V)</div>
                  <div className="text-[10px] text-amber-300/80 mt-0.5">
                    Triggers CRITICAL 2S LiPo brownout risk warning.
                  </div>
                </div>
              </button>

              <button
                onClick={() => injectAlert('descent')}
                className="p-3 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800 rounded-lg text-left flex items-start gap-2.5 transition-colors group cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-200">Inject Parachute Fail (-14.8 m/s)</div>
                  <div className="text-[10px] text-rose-300/80 mt-0.5">
                    Triggers CRITICAL high-velocity impact warning.
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => injectAlert('nominal')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-semibold border border-emerald-900/60 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Reset Telemetry to Nominal Conditions</span>
              </button>
            </div>
          </div>
        )}

        {/* Sub-Tab 3: Alarm History Log */}
        {activeSubTab === 'history' && (
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-900 text-slate-400">
              <span>Incident Ledger ({incidents.length} Records)</span>
              <button
                onClick={onClearIncidents}
                className="text-[10px] text-rose-400 hover:underline"
              >
                Clear Log
              </button>
            </div>

            {incidents.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No threshold violations recorded during this mission session.
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                {incidents.slice(-25).reverse().map((inc) => (
                  <div
                    key={inc.id}
                    className="p-2 bg-slate-900/60 border border-slate-800 rounded flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[10px]">[{inc.timestamp}]</span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {inc.severity}
                      </span>
                      <span className="font-semibold text-slate-200">{inc.name}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-white font-bold tabular-nums">
                        {inc.value.toFixed(1)} {inc.unit}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Limit: {inc.limit} {inc.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-900 flex items-center justify-between text-xs">
          <button
            onClick={handleResetDefaults}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-cyan-900/30 cursor-pointer"
            >
              {savedFeedback ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{savedFeedback ? 'Saved!' : 'Save Calibration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
