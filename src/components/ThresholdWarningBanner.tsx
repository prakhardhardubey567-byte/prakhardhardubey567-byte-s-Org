import React, { useState } from 'react';
import { ThresholdRule, AlertSeverity } from '../types/thresholds';
import { thresholdService } from '../services/thresholdService';
import { serialService } from '../services/serialService';
import { 
  AlertTriangle, 
  AlertOctagon, 
  ShieldAlert, 
  Check, 
  Sliders, 
  Send, 
  Volume2, 
  VolumeX,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ThresholdWarningBannerProps {
  rules: ThresholdRule[];
  maxSeverity: AlertSeverity;
  onOpenConfig: () => void;
}

export const ThresholdWarningBanner: React.FC<ThresholdWarningBannerProps> = ({
  rules,
  maxSeverity,
  onOpenConfig,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Filter only violated rules
  const activeViolations = rules.filter((r) => r.severity !== 'NOMINAL');

  if (activeViolations.length === 0 || isDismissed) {
    return null;
  }

  const isCritical = maxSeverity === 'CRITICAL';

  const handleAcknowledgeAll = () => {
    activeViolations.forEach((v) => thresholdService.acknowledgeAlarm(v.id));
    setIsDismissed(true);
  };

  const handleEmergencyChuteEject = async () => {
    await serialService.transmit('CMD,SPUTNIK,DEPLOY_CHUTE');
  };

  return (
    <div
      className={`rounded-lg border p-3.5 transition-all duration-300 font-mono ${
        isCritical
          ? 'bg-rose-950/90 border-rose-600 shadow-lg shadow-rose-950/50'
          : 'bg-amber-950/90 border-amber-600 shadow-lg shadow-amber-950/40'
      }`}
    >
      {/* Banner Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-1.5 rounded ${
              isCritical ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-slate-950'
            }`}
          >
            {isCritical ? (
              <AlertOctagon className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isCritical ? 'text-rose-200' : 'text-amber-200'
                }`}
              >
                {isCritical ? '✖ MASTER CRITICAL LIMIT BREACH' : '▲ MISSION THRESHOLD CAUTION'}
              </span>
              <span className="text-white/40">·</span>
              <span className="text-xs text-white/90 font-medium">
                {activeViolations.length} Active {activeViolations.length === 1 ? 'Anomaly' : 'Anomalies'} Detected
              </span>
            </div>
            <p className="text-[11px] text-white/70 mt-0.5">
              Live sensor telemetry has exceeded defined mission safety limits for ORBITRA '26 flight profile.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* If descent or altitude critical, show emergency shortcut */}
          {activeViolations.some((v) => v.id === 'descentRate' || v.id === 'altitude') && (
            <button
              onClick={handleEmergencyChuteEject}
              className="px-2.5 py-1 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm"
              title="Send Emergency Parachute Deploy Command"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Eject Backup Chute</span>
            </button>
          )}

          <button
            onClick={onOpenConfig}
            className="px-2.5 py-1 text-xs bg-black/40 hover:bg-black/60 text-white/90 border border-white/20 rounded flex items-center gap-1.5 transition-colors"
            title="Configure Threshold Limits"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Calibrate Limits</span>
          </button>

          <button
            onClick={handleAcknowledgeAll}
            className="px-2.5 py-1 text-xs bg-black/40 hover:bg-black/60 text-white/90 border border-white/20 rounded flex items-center gap-1.5 transition-colors"
            title="Acknowledge and silence alarm banner"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Acknowledge</span>
          </button>

          <button
            onClick={() => setIsExpanded((e) => !e)}
            className="p-1 hover:bg-black/40 text-white/80 rounded"
            title={isExpanded ? 'Collapse Alert Details' : 'Expand Alert Details'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Violations Detail List */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3 pt-1">
          {activeViolations.map((v) => {
            const isItemCritical = v.severity === 'CRITICAL';
            return (
              <div
                key={v.id}
                className={`p-2.5 rounded border text-xs ${
                  isItemCritical
                    ? 'bg-rose-950/70 border-rose-700/80 text-rose-100'
                    : 'bg-amber-950/70 border-amber-700/80 text-amber-100'
                }`}
              >
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10 text-[10px] uppercase font-bold tracking-wider">
                  <span className={isItemCritical ? 'text-rose-300' : 'text-amber-300'}>
                    {v.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold ${
                      isItemCritical ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {v.severity}
                  </span>
                </div>

                <div className="flex items-baseline justify-between my-1">
                  <span className="text-[11px] text-white/70">CURRENT READING:</span>
                  <span className="text-base font-bold tabular-nums text-white">
                    {v.currentValue.toFixed(1)} {v.unit}
                  </span>
                </div>

                <div className="text-[10px] text-white/75 mt-1 leading-snug">
                  {v.message}
                </div>

                <div className="text-[10px] text-cyan-200 mt-1.5 pt-1 border-t border-white/10 font-sans">
                  <span className="font-mono text-cyan-400 font-bold uppercase">ACTION: </span>
                  {v.recommendation}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
