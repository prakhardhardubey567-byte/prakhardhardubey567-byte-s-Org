import React, { useEffect } from 'react';
import { MissionChecklist } from './MissionChecklist';
import { TelemetryPacket } from '../types/telemetry';
import { 
  X, 
  CheckSquare, 
  Maximize2, 
  Minimize2, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface MissionChecklistSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPacket: TelemetryPacket | null;
  hzRate?: number;
}

export function MissionChecklistSidebar({
  isOpen,
  onClose,
  currentPacket,
  hzRate = 2.0
}: MissionChecklistSidebarProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel Container */}
      <aside 
        className="relative w-full max-w-lg sm:w-[460px] h-full bg-[#07090e] border-l border-slate-800 shadow-2xl flex flex-col z-10 animate-slideInRight"
        role="dialog"
        aria-modal="true"
        aria-label="Mission Pre-flight Checklist"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/95 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>PRE-FLIGHT CHECKLIST</span>
                <span className="text-[10px] font-normal text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/40">
                  ORBITRA ’26
                </span>
              </h2>
              <p className="text-[10px] font-mono text-slate-400">
                TEAM SPUTNIK · LAUNCH READINESS VERIFICATION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Checklist (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded Mission Checklist Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <MissionChecklist
            currentPacket={currentPacket}
            hzRate={hzRate}
            onClose={onClose}
          />
        </div>
      </aside>
    </div>
  );
}
