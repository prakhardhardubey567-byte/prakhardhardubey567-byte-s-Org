import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Attitude3DProps {
  pitch: number; // degrees
  roll: number;  // degrees
  yaw: number;   // degrees
}

export const Attitude3D: React.FC<Attitude3DProps> = ({ pitch, roll, yaw }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const satelliteRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 240;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.8, 2.2, 3.8);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 1.8);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf59e0b, 1.0);
    dirLight2.position.set(-5, -4, -5);
    scene.add(dirLight2);

    // Orbit grid / reference ring
    const gridHelper = new THREE.PolarGridHelper(2.2, 16, 8, 32, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -1.2;
    scene.add(gridHelper);

    // Group for satellite model
    const satGroup = new THREE.Group();
    satelliteRef.current = satGroup;
    scene.add(satGroup);

    // CanSat / CubeSat Body
    // Main chassis (1U CubeSat / Cylindrical CanSat hybrid)
    const bodyGeo = new THREE.CylinderGeometry(0.52, 0.52, 1.25, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.25,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    satGroup.add(body);

    // Thermal gold foil / payload ring
    const foilGeo = new THREE.CylinderGeometry(0.53, 0.53, 0.45, 24);
    const foilMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.3,
    });
    const foil = new THREE.Mesh(foilGeo, foilMat);
    foil.position.y = 0.1;
    satGroup.add(foil);

    // Solar panel wings
    const panelGeo = new THREE.BoxGeometry(0.04, 0.9, 0.55);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.6,
      roughness: 0.2,
    });

    const leftWing = new THREE.Mesh(panelGeo, panelMat);
    leftWing.position.set(-0.85, 0, 0);
    satGroup.add(leftWing);

    const rightWing = new THREE.Mesh(panelGeo, panelMat);
    rightWing.position.set(0.85, 0, 0);
    satGroup.add(rightWing);

    // Panel hinges / struts
    const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35);
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
    
    const leftStrut = new THREE.Mesh(strutGeo, strutMat);
    leftStrut.rotation.z = Math.PI / 2;
    leftStrut.position.set(-0.62, 0, 0);
    satGroup.add(leftStrut);

    const rightStrut = new THREE.Mesh(strutGeo, strutMat);
    rightStrut.rotation.z = Math.PI / 2;
    rightStrut.position.set(0.62, 0, 0);
    satGroup.add(rightStrut);

    // Top Antenna / Sensor probe
    const antennaGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.7);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(0, 0.95, 0);
    satGroup.add(antenna);

    // Antenna tip beacon
    const beaconGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 1.3, 0);
    satGroup.add(beacon);

    // Bottom Payload Camera Lens
    const lensGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.12, 16);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, -0.68, 0);
    satGroup.add(lens);

    // Axes helper (Red: X/Pitch, Green: Y/Yaw, Blue: Z/Roll)
    const axesHelper = new THREE.AxesHelper(1.1);
    satGroup.add(axesHelper);

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update orientation on pitch/roll/yaw prop change
  useEffect(() => {
    if (!satelliteRef.current) return;
    // Euler angles in radians
    const pitchRad = THREE.MathUtils.degToRad(pitch);
    const rollRad = THREE.MathUtils.degToRad(roll);
    const yawRad = THREE.MathUtils.degToRad(yaw);

    // Smooth rotation update
    satelliteRef.current.rotation.set(pitchRad, yawRad, rollRad, 'YXZ');
  }, [pitch, roll, yaw]);

  return (
    <div className="relative w-full h-full min-h-[220px] bg-slate-950/70 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      <div className="absolute top-2 left-3 z-10 text-xs font-mono text-slate-400 flex items-center gap-2">
        <span className="text-cyan-400 font-semibold">3D ATTITUDE GIMBAL</span>
        <span className="text-slate-600">·</span>
        <span>CANSAT / CUBESAT</span>
      </div>

      <div className="absolute top-2 right-3 z-10 text-[11px] font-mono text-slate-300 flex items-center gap-3 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
        <div>
          <span className="text-rose-400 font-bold">P:</span> {pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)}°
        </div>
        <div>
          <span className="text-sky-400 font-bold">R:</span> {roll > 0 ? `+${roll.toFixed(1)}` : roll.toFixed(1)}°
        </div>
        <div>
          <span className="text-amber-400 font-bold">Y:</span> {yaw.toFixed(1)}°
        </div>
      </div>

      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="absolute bottom-2 left-3 right-3 z-10 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-rose-500 inline-block" /> Pitch X
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-emerald-500 inline-block" /> Yaw Y
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-sky-500 inline-block" /> Roll Z
          </span>
        </div>
        <span className="text-slate-400">IMU 6-DOF FUSION</span>
      </div>
    </div>
  );
};
