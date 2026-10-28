import React, { useState, useEffect, useRef } from 'react';
import { serialService } from '../services/serialService';
import { SerialPortStatus } from '../types/telemetry';
import { 
  Usb, 
  Send, 
  Terminal, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  Radio,
  Sliders,
  Play,
  Zap
} from 'lucide-react';

interface UsbCommandDeckProps {
  onSimulateLaunch?: () => void;
  onSimulateParachute?: () => void;
  isSimulating: boolean;
}

interface LogEntry {
  id: string;
  time: string;
  direction: 'RX' | 'TX' | 'SYS';
  text: string;
}

export const UsbCommandDeck: React.FC<UsbCommandDeckProps> = ({
  onSimulateLaunch,
  onSimulateParachute,
  isSimulating,
}) => {
  const [status, setStatus] = useState<SerialPortStatus>(serialService.getStatus());
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [customCommand, setCustomCommand] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      time: new Date().toTimeString().split(' ')[0],
      direction: 'SYS',
      text: 'USB Serial Ground Subsystem Initialized. Ready for transceiver handshake.',
    },
  ]);
  const [isWebSerialSupported, setIsWebSerialSupported] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsWebSerialSupported(serialService.isSupported());

    const unsubscribeStatus = serialService.onStatus((newStatus) => {
      setStatus(newStatus);
    });

    const unsubscribeLog = serialService.onLog((direction, message) => {
      setLogs((prev) => [
        ...prev.slice(-150),
        {
          id: Math.random().toString(36).substring(2, 9),
          time: new Date().toTimeString().split(' ')[0],
          direction,
          text: message,
        },
      ]);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeLog();
    };
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleConnect = async () => {
    if (status.connected) {
      await serialService.disconnect();
    } else {
      const res = await serialService.connectPhysical(baudRate);
      if (!res.success) {
        // Automatically provide prompt and fallback to virtual port if requested
        serialService.emitLog('SYS', 'Tip: You can also click "Connect Virtual USB" to test commands and telemetry immediately without external hardware.');
      }
    }
  };

  const handleVirtualConnect = () => {
    if (status.connected) {
      serialService.disconnect();
    }
    serialService.connectVirtual('COM3 (CP2102 USB to UART)', baudRate);
  };

  const handleSendCommand = async (cmdText: string) => {
    if (!cmdText.trim()) return;
    await serialService.transmit(cmdText.trim());
    setCustomCommand('');
  };

  const quickCommands = [
    { code: 'CAL_ALT', label: 'Zero Barometer', desc: 'Calibrate sea-level pressure reference' },
    { code: 'DEPLOY_CHUTE', label: 'Manual Ejection', desc: 'Trigger backup pyrotechnic/servo deploy' },
    { code: 'PING', label: 'Ping Transceiver', desc: 'Test downlink latency' },
    { code: 'RATE_5HZ', label: 'Set Rate 5 Hz', desc: 'High telemetry frequency' },
    { code: 'BUZZER_ON', label: 'Recovery Buzzer', desc: 'Ground location siren' },
    { code: 'CAMERA_REC', label: 'Record Video', desc: 'Trigger onboard payload camera' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Controller Bar */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Usb className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wide">
              USB Transceiver Link & Uplink Controller
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">BAUD:</span>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={status.connected}
              className="bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1 rounded text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value={9600}>9600</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={57600}>57600</option>
              <option value={115200}>115200 (Default)</option>
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {status.connected ? (
            <button
              onClick={handleConnect}
              className="px-3 py-1.5 text-xs font-mono bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Disconnect USB Port</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleConnect}
                className="px-3 py-1.5 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded flex items-center gap-1.5 transition-colors shadow-sm shadow-cyan-900/30 cursor-pointer"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Connect Physical USB</span>
              </button>

              <button
                onClick={handleVirtualConnect}
                className="px-3 py-1.5 text-xs font-mono bg-amber-600/90 hover:bg-amber-500 text-white font-medium rounded flex items-center gap-1.5 transition-colors shadow-sm shadow-amber-900/30 cursor-pointer"
                title="Connect virtual CP2102 UART transceiver"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Virtual USB Port</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Web Serial Browser Notice if not supported */}
      {!isWebSerialSupported && (
        <div className="bg-amber-950/40 border border-amber-900/60 rounded-lg p-3 text-xs font-mono text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-200">
              Web Serial API Notice
            </div>
            <p className="text-amber-400/90 mt-0.5">
              Direct USB serial hardware connectivity requires a Chromium-based browser (Google Chrome, Microsoft Edge, or Opera). In other browsers, you can use the built-in realistic flight simulator and download the Node.js bridge script.
            </p>
          </div>
        </div>
      )}

      {/* Status diagnostics strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg text-xs font-mono">
          <span className="text-slate-500 block uppercase text-[10px]">DEVICE / PORT</span>
          <span className="text-slate-200 font-semibold truncate block mt-0.5">
            {status.connected ? status.portName : isSimulating ? 'Simulator Loopback' : 'Disconnected'}
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg text-xs font-mono">
          <span className="text-slate-500 block uppercase text-[10px]">BYTES SENT (TX)</span>
          <span className="text-cyan-400 font-semibold block mt-0.5 tabular-nums">
            {status.bytesSent} B
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg text-xs font-mono">
          <span className="text-slate-500 block uppercase text-[10px]">BYTES RECEIVED (RX)</span>
          <span className="text-emerald-400 font-semibold block mt-0.5 tabular-nums">
            {status.bytesReceived} B
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg text-xs font-mono">
          <span className="text-slate-500 block uppercase text-[10px]">PACKET ERRORS</span>
          <span className="text-slate-400 font-semibold block mt-0.5 tabular-nums">
            {status.errorCount}
          </span>
        </div>
      </div>

      {/* Main Command & Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[420px]">
        {/* Left: Quick Uplink Commands (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900 text-xs font-mono text-slate-400">
              <span className="font-semibold text-slate-200 uppercase tracking-wide">
                Quick Uplink Commands (Transmit)
              </span>
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-[11px] font-mono text-slate-500 mb-3">
              Click to transmit standardized CanSat/CubeSat telecommand packets over the connected USB port or radio bridge.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickCommands.map((cmd) => (
                <button
                  key={cmd.code}
                  onClick={() => handleSendCommand(`CMD,SPUTNIK,${cmd.code}`)}
                  className="p-2.5 text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-800 rounded transition-colors group"
                >
                  <div className="text-xs font-mono font-semibold text-cyan-300 group-hover:text-cyan-200 flex items-center justify-between">
                    <span>{cmd.label}</span>
                    <Send className="w-3 h-3 text-slate-600 group-hover:text-cyan-400" />
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1 line-clamp-1">
                    {cmd.desc}
                  </div>
                  <div className="text-[9px] font-mono text-slate-600 mt-0.5">
                    CMD,SPUTNIK,{cmd.code}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Terminal Box */}
          <div className="pt-3 mt-3 border-t border-slate-900">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Custom Command Transmitter
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCommand(customCommand);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="e.g. CMD,SPUTNIK,PING"
                className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 px-3 py-1.5 rounded text-xs font-mono focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Serial Terminal Ledger (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/90 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-200 uppercase tracking-wide">
                  Live USB Serial Monitor (TX / RX)
                </span>
              </div>

              <button
                onClick={() => setLogs([])}
                className="p-1 hover:bg-slate-900 text-slate-500 hover:text-slate-300 rounded"
                title="Clear Terminal"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Terminal Window */}
            <div className="h-[320px] overflow-y-auto bg-slate-950 rounded p-2.5 font-mono text-[11px] space-y-1.5 border border-slate-900">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                  <span
                    className={`font-semibold shrink-0 select-none ${
                      log.direction === 'TX'
                        ? 'text-cyan-400'
                        : log.direction === 'RX'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {log.direction}:
                  </span>
                  <span
                    className={`break-all ${
                      log.direction === 'TX'
                        ? 'text-cyan-200'
                        : log.direction === 'RX'
                        ? 'text-slate-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>

          <div className="pt-2 text-[10px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-900 mt-2">
            <span>READY FOR SERIAL DATA OVER USB</span>
            <span className="text-slate-400">ENCODING: UTF-8 / ASCII CSV</span>
          </div>
        </div>
      </div>
    </div>
  );
};
