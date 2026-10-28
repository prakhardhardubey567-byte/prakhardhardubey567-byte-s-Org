import React, { useEffect, useRef, useState } from 'react';

interface GpsMapProps {
  lat: number;
  lng: number;
  altitude: number;
  satellites: number;
  trajectory: Array<{ lat: number; lng: number; alt: number }>;
}

export const GpsMap: React.FC<GpsMapProps> = ({
  lat,
  lng,
  altitude,
  satellites,
  trajectory,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = 500m radius

  // Base ground station / launch pad coordinates (MMMUT Gorakhpur)
  const baseLat = 26.73214;
  const baseLng = 83.43321;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Scale calculation: degrees to pixels
    // 1 deg lat ~ 111,000 meters. 0.001 deg ~ 111 meters
    // At zoomLevel 1, radius = 400m
    const maxRadiusMeters = 500 / zoomLevel;
    const pxPerMeter = (Math.min(w, h) * 0.42) / maxRadiusMeters;

    // Draw radar circles
    const rings = [100, 250, 500, 1000];
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#475569';

    rings.forEach((r) => {
      const radiusPx = r * pxPerMeter;
      if (radiusPx < Math.min(w, h) * 0.6) {
        ctx.beginPath();
        ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillText(`${r}m`, cx + radiusPx + 3, cy - 2);
      }
    });

    // Crosshairs
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, h - 10);
    ctx.moveTo(10, cy);
    ctx.lineTo(w - 10, cy);
    ctx.stroke();

    // Cardinal directions
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 18);
    ctx.fillText('S', cx, h - 6);
    ctx.textAlign = 'left';
    ctx.fillText('E', w - 16, cy + 3);
    ctx.textAlign = 'right';
    ctx.fillText('W', 16, cy + 3);

    // Convert (lat, lng) to (x, y) relative to ground station base
    const toXY = (pLat: number, pLng: number) => {
      const dLat = (pLat - baseLat) * 111000; // North-South in meters
      const dLng = (pLng - baseLng) * 111000 * Math.cos((baseLat * Math.PI) / 180); // East-West in meters
      const x = cx + dLng * pxPerMeter;
      const y = cy - dLat * pxPerMeter;
      return { x, y, dLat, dLng };
    };

    // Draw Launch Pad / Ground Station Base marker
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#10b98188';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GROUND STN (MMMUT)', cx + 12, cy + 3);

    // Draw flight trajectory breadcrumbs
    if (trajectory.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);

      const first = toXY(trajectory[0].lat, trajectory[0].lng);
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < trajectory.length; i++) {
        const pt = toXY(trajectory[i].lat, trajectory[i].lng);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Current CanSat position
    const current = toXY(lat, lng);

    // Vector line from Ground Station to CanSat
    ctx.strokeStyle = '#f59e0b55';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Blinking target pin
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(current.x, current.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(current.x, current.y, 11, 0, Math.PI * 2);
    ctx.stroke();

    // Distance computation
    const distMeters = Math.sqrt(current.dLat * current.dLat + current.dLng * current.dLng);
    const bearingRad = Math.atan2(current.dLng, current.dLat);
    const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;

    // Label on target
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SPUTNIK [${distMeters.toFixed(0)}m @ ${bearingDeg.toFixed(0)}°]`, current.x + 14, current.y + 4);
  }, [lat, lng, altitude, trajectory, zoomLevel]);

  // Compute straight-line ground distance
  const dLat = (lat - baseLat) * 111000;
  const dLng = (lng - baseLng) * 111000 * Math.cos((baseLat * Math.PI) / 180);
  const groundDist = Math.sqrt(dLat * dLat + dLng * dLng);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-col relative h-full min-h-[220px]">
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-900">
        <div className="flex items-baseline gap-2">
          <h4 className="text-xs font-semibold text-slate-200 tracking-wide font-mono uppercase">
            GPS Ground Track & Recovery Radar
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">
            {satellites} SATS LOCKED
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomLevel((z) => Math.min(3, z * 1.5))}
            className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.4, z / 1.5))}
            className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded"
            title="Zoom Out"
          >
            -
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded"
            title="Reset Zoom"
          >
            1x
          </button>
        </div>
      </div>

      <div className="relative flex-1 w-full min-h-[160px]">
        <canvas ref={canvasRef} className="w-full h-full block rounded" />
      </div>

      <div className="pt-2 border-t border-slate-900 grid grid-cols-4 gap-2 text-[10px] font-mono text-slate-400">
        <div>
          <span className="text-slate-500 block">LATITUDE</span>
          <span className="text-slate-200 tabular-nums">{lat.toFixed(5)}°N</span>
        </div>
        <div>
          <span className="text-slate-500 block">LONGITUDE</span>
          <span className="text-slate-200 tabular-nums">{lng.toFixed(5)}°E</span>
        </div>
        <div>
          <span className="text-slate-500 block">GROUND DIST</span>
          <span className="text-amber-400 tabular-nums font-semibold">{groundDist.toFixed(1)} m</span>
        </div>
        <div>
          <span className="text-slate-500 block">GPS ALT</span>
          <span className="text-cyan-400 tabular-nums font-semibold">{altitude.toFixed(1)} m</span>
        </div>
      </div>
    </div>
  );
};
