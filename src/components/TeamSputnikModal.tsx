import React from 'react';
import { Users, Award, GraduationCap, X, ShieldCheck, MapPin, Satellite, Rocket } from 'lucide-react';

interface TeamSputnikModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamSputnikModal: React.FC<TeamSputnikModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const teamLeader = {
    name: 'UJJWAL YADAV',
    role: 'TEAM LEADER & MISSION DIRECTOR',
    specialization: 'Mission Systems & Flight Architecture',
  };

  const members = [
    {
      num: '01',
      name: 'PRAKHAR DHAR DUBEY',
      role: 'TELEMETRY & FLIGHT SOFTWARE',
      subsystem: 'GCS Ground Station & Open MCT Integration',
    },
    {
      num: '02',
      name: 'PRIYANSHU YADAV',
      role: 'AVIONICS & SENSOR SUITE',
      subsystem: 'BMP280, MPU6050 & DHT11 Weather Sensors',
    },
    {
      num: '03',
      name: 'RATNESH KUMAR SINGH',
      role: 'WIRELESS COMMS & TELEMETRY',
      subsystem: 'ESP32 2.4GHz Wireless & USB Ground Link',
    },
    {
      num: '04',
      name: 'ATUL KUMAR MAURYA',
      role: 'STRUCTURES & RECOVERY SUBSYSTEM',
      subsystem: 'Parachute Ejection & Payload Separation',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-2xl w-full p-5 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                ORBITRA ’26 FLIGHT ROSTER
              </span>
            </div>
            <h2 className="text-xl font-mono font-bold text-slate-100 mt-1">
              TEAM SPUTNIK
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mt-0.5">
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span>MADAN MOHAN MALVIYA UNIVERSITY OF TECHNOLOGY, GORAKHPUR</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {/* University Credential Strip */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded p-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-slate-300 font-semibold">MMMUT GORAKHPUR (UP, INDIA)</span>
                <div className="text-[10px] text-slate-500">
                  Latitude 26.7321° N · Longitude 83.4332° E · Ground Station
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-emerald-400 font-semibold block">VERIFIED ENTRY</span>
              <span className="text-[10px] text-slate-500">ORBITRA '26 CANSAT</span>
            </div>
          </div>

          {/* Team Leader Card */}
          <div className="bg-cyan-950/40 border border-cyan-800/60 rounded p-3.5">
            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider mb-1">
              TEAM LEADER
            </div>
            <div className="text-lg font-mono font-bold text-cyan-100">
              {teamLeader.name}
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-cyan-300/80 mt-1">
              <span>{teamLeader.role}</span>
              <span className="text-slate-400">{teamLeader.specialization}</span>
            </div>
          </div>

          {/* Team Members List */}
          <div>
            <div className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider mb-2">
              FLIGHT CREW MEMBERS (4)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {members.map((m) => (
                <div
                  key={m.num}
                  className="bg-slate-900/50 border border-slate-800/80 rounded p-3 text-xs font-mono"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span className="text-cyan-400 font-bold">MEMBER {m.num}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="font-semibold text-slate-100 text-sm">
                    {m.name}
                  </div>
                  <div className="text-slate-300 text-[11px] mt-1 font-medium">
                    {m.role}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {m.subsystem}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-900 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>MISSION CALLSIGN: SPUTNIK-1</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition-colors"
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  );
};
