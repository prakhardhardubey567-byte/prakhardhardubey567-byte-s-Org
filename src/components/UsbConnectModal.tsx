import React, { useState, useEffect } from 'react';
import { serialService } from '../services/serialService';
import { SerialPortStatus } from '../types/telemetry';
import { 
  Usb, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Zap, 
  Terminal, 
  ArrowRight,
  RefreshCw,
  Cpu
} from 'lucide-react';

interface UsbConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUsbTab: () => void;
}

export const UsbConnectModal: React.FC<UsbConnectModalProps> = ({
  isOpen,
  onClose,
  onOpenUsbTab,
}) => {
  const [status, setStatus] = useState<SerialPortStatus>(serialService.getStatus());
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [virtualPortType, setVirtualPortType] = useState('COM3 (CP2102 USB to UART)');

  useEffect(() => {
    const unsub = serialService.onStatus((s) => setStatus(s));
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const isWebSerialSupported = serialService.isSupported();

  const handlePhysicalConnect = async () => {
    setErrorMessage(null);
    setIsScanning(true);
    const result = await serialService.connectPhysical(baudRate);
    setIsScanning(false);
    if (!result.success) {
      setErrorMessage(result.error || 'Failed to connect. Please select a valid COM port.');
    } else {
      onClose();
      onOpenUsbTab();
    }
  };

  const handleVirtualConnect = () => {
    setErrorMessage(null);
    serialService.connectVirtual(virtualPortType, baudRate);
    onClose();
    onOpenUsbTab();
  };

  const handleDisconnect = async () => {
    await serialService.disconnect();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-xl w-full p-5 shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-400">
              <Usb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-slate-100 uppercase tracking-wide">
                USB Hardware Connection Hub
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Connect your ground receiver or CanSat transceiver over USB Serial
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

        {/* Content */}
        <div className="mt-4 space-y-4">
          {/* Current Status Banner */}
          <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
            status.connected
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-300'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${status.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <div>
                <span className="font-semibold block">
                  {status.connected ? `CONNECTED: ${status.portName}` : 'USB PORT DISCONNECTED'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {status.connected ? `Baud Rate: ${status.baudRate} · Bytes In: ${status.bytesReceived} B · Bytes Out: ${status.bytesSent} B` : 'Select a physical or virtual port below to begin transmission'}
                </span>
              </div>
            </div>

            {status.connected && (
              <button
                onClick={handleDisconnect}
                className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 rounded font-medium transition-colors shrink-0"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Baud Rate Config */}
          <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg text-xs font-mono flex items-center justify-between">
            <span className="text-slate-400">SELECT UART BAUD RATE:</span>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={status.connected}
              className="bg-slate-950 border border-slate-700 text-cyan-300 px-3 py-1 rounded font-mono font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value={9600}>9600 Baud</option>
              <option value={19200}>19200 Baud</option>
              <option value={38400}>38400 Baud</option>
              <option value={57600}>57600 Baud</option>
              <option value={115200}>115200 Baud (Recommended)</option>
            </select>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/50 border border-rose-900 rounded-lg text-xs font-mono text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Connection Notice:</div>
                <div className="text-[11px] mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Connection Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Physical Web Serial */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-800/80 p-3.5 rounded-lg flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                  <span className="text-cyan-400 font-bold uppercase">METHOD A</span>
                  <Usb className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-sm font-mono font-semibold text-slate-200">
                  Physical Hardware USB
                </h3>
                <p className="text-[11px] font-mono text-slate-400 mt-1 leading-relaxed">
                  Pairs directly with your plugged-in Arduino, ESP32, STM32, or LoRa Ground Receiver via Web Serial API.
                </p>
              </div>

              <div className="mt-4">
                <button
                  onClick={handlePhysicalConnect}
                  disabled={isScanning || status.connected}
                  className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-mono text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors shadow-sm shadow-cyan-900/40"
                >
                  <Usb className="w-3.5 h-3.5" />
                  <span>{isScanning ? 'Scanning Ports...' : 'Connect Physical USB'}</span>
                </button>
              </div>
            </div>

            {/* Option 2: Virtual USB COM Port (Ready-to-use!) */}
            <div className="bg-slate-900/60 border border-slate-800 hover:border-amber-800/80 p-3.5 rounded-lg flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                  <span className="text-amber-400 font-bold uppercase">METHOD B (INSTANT)</span>
                  <Cpu className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-sm font-mono font-semibold text-slate-200">
                  Virtual USB COM Port
                </h3>
                <p className="text-[11px] font-mono text-slate-400 mt-1 leading-relaxed">
                  Emulates a real CP2102/CH340 transceiver. Allows testing live packet transmission and telecommands immediately!
                </p>

                <select
                  value={virtualPortType}
                  onChange={(e) => setVirtualPortType(e.target.value)}
                  className="mt-2 w-full bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1 rounded text-[11px] font-mono focus:outline-none"
                >
                  <option value="COM3 (CP2102 USB to UART)">COM3 - Silicon Labs CP2102</option>
                  <option value="COM4 (CH340 Arduino Serial)">COM4 - CH340 Arduino / ESP32</option>
                  <option value="/dev/ttyUSB0 (FTDI FT232R)">/dev/ttyUSB0 - FTDI FT232R</option>
                </select>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleVirtualConnect}
                  disabled={status.connected}
                  className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-mono text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors shadow-sm shadow-amber-900/40"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Connect Virtual Port</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-900 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>TEAM SPUTNIK · ORBITRA '26 GCS</span>
          <button
            onClick={() => {
              onClose();
              onOpenUsbTab();
            }}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
          >
            <span>Open USB Transmit Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
