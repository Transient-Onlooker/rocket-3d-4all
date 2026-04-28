import { Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Clone, Html, Line, OrbitControls, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useSimStore } from '../store/simStore';
import type { TelemetryPoint } from '../types/rocket';

const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;
const CAMERA_MODES = ['follow', 'overview'] as const;
type CameraMode = (typeof CAMERA_MODES)[number];

export function FlightViewport3D() {
  const telemetry = useSimStore((state) => state.telemetry);
  const params = useSimStore((state) => state.params);
  const events = useSimStore((state) => state.events);
  const summary = useSimStore((state) => state.summary);
  const duration = telemetry[telemetry.length - 1]?.t ?? 0;
  const [isPlaying, setIsPlaying] = useState(true);
  const [loopPlayback, setLoopPlayback] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<(typeof PLAYBACK_SPEEDS)[number]>(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setCurrentTime(0);
  }, [telemetry]);

  useEffect(() => {
    if (!isPlaying || duration <= 0) {
      return;
    }

    let frameId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentTime((time) => {
        const nextTime = time + delta * playbackSpeed;
        if (nextTime >= duration) {
          if (loopPlayback) {
            return 0;
          }

          setIsPlaying(false);
          return duration;
        }

        return nextTime;
      });

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [duration, isPlaying, loopPlayback, playbackSpeed]);

  const currentPoint = interpolateTelemetry(telemetry, currentTime);
  const sceneExtent = Math.max(summary.peakAltitude, summary.downrangeDistance, 50);
  const scale = 36 / sceneExtent;
  const trailPoints = telemetry
    .filter((_, index) => index % Math.max(1, Math.ceil(telemetry.length / 140)) === 0)
    .map((point) => [point.x * scale, point.y * scale, 0] as [number, number, number]);
  const railAngle = (params.launchAngleDeg * Math.PI) / 180;
  const railEnd: [number, number, number] = [
    Math.cos(railAngle) * params.launchRailLength * scale,
    Math.sin(railAngle) * params.launchRailLength * scale,
    0,
  ];
  const hudItems = [
    { label: '고도', value: `${currentPoint.y.toFixed(0)} m` },
    { label: '속도', value: `${currentPoint.speed.toFixed(1)} m/s` },
    { label: '동압', value: `${(currentPoint.dynamicPressure / 1000).toFixed(1)} kPa` },
    { label: '단계', value: phaseLabel(currentPoint.flightPhase) },
  ];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-panel/90 p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">3D 비행 뷰</h2>
          <p className="text-sm text-sky/70">현재 시뮬레이션 궤적을 추적형 3D 화면에서 재생합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            onClick={() => setIsPlaying((playing) => !playing)}
          >
            {isPlaying ? '일시정지' : '재생'}
          </button>
          <button
            className={[
              'rounded-full border px-4 py-2 text-sm font-semibold transition',
              loopPlayback
                ? 'border-sky-300/40 bg-sky-300/15 text-sky-50'
                : 'border-white/10 bg-white/5 text-sky/75 hover:bg-white/10',
            ].join(' ')}
            onClick={() => setLoopPlayback((loop) => !loop)}
          >
            {loopPlayback ? '반복 켜짐' : '반복 꺼짐'}
          </button>
          {CAMERA_MODES.map((mode) => (
            <button
              key={mode}
              className={[
                'rounded-full border px-3 py-2 text-xs font-semibold uppercase transition',
                cameraMode === mode
                  ? 'border-emerald-300/35 bg-emerald-300/12 text-emerald-50'
                  : 'border-white/10 bg-white/5 text-sky/75 hover:bg-white/10',
              ].join(' ')}
              onClick={() => setCameraMode(mode)}
            >
              {mode === 'follow' ? '추적' : '개요'}
            </button>
          ))}
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              className={[
                'rounded-full border px-3 py-2 text-xs font-semibold transition',
                playbackSpeed === speed
                  ? 'border-sky-300/40 bg-sky-300/15 text-sky-50'
                  : 'border-white/10 bg-white/5 text-sky/75 hover:bg-white/10',
              ].join(' ')}
              onClick={() => setPlaybackSpeed(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-white/5 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.08),rgba(0,0,0,0.18)_50%,rgba(0,0,0,0.3)_100%)]">
        <div className="h-[440px]">
          <Canvas shadows dpr={[1, 2]}>
            <color attach="background" args={['#06101d']} />
            <fog attach="fog" args={['#06101d', 30, 120]} />
            <ambientLight intensity={0.7} />
            <directionalLight castShadow intensity={1.8} position={[14, 20, 12]} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
            <directionalLight intensity={0.5} position={[-12, 8, -10]} color="#7dd3fc" />
            <Stars radius={120} depth={40} count={1500} factor={4} saturation={0} fade speed={0.3} />
            <SceneGround />
            <Line points={[[0, 0, 0], railEnd]} color="#7dd3fc" lineWidth={2} />
            <Line points={trailPoints} color="#ff9f4a" lineWidth={2} />
            <EventBeacons telemetry={telemetry} eventTimes={events.map((event) => event.time)} scale={scale} />
            <LaunchPad />
            <Suspense fallback={<RocketSilhouette point={currentPoint} scale={scale} />}>
              <RocketModel point={currentPoint} scale={scale} />
            </Suspense>
            <FollowCamera point={currentPoint} scale={scale} mode={cameraMode} />
            <OrbitControls
              enablePan={cameraMode === 'overview'}
              enableRotate={cameraMode === 'overview'}
              enableZoom
              maxPolarAngle={Math.PI * 0.48}
              minDistance={10}
              maxDistance={80}
            />
          </Canvas>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <input
            className="slider w-full"
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={Math.min(currentTime, duration)}
            onChange={(event) => setCurrentTime(Number(event.target.value))}
          />
          <div className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-sm text-sky/75">
            T+{currentTime.toFixed(1)}s
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {hudItems.map((item) => (
            <div key={item.label} className="rounded-[1.1rem] border border-white/10 bg-black/10 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-sky/55">{item.label}</div>
              <div className="mt-1 text-sm font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SceneGround() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#0d2031" roughness={0.95} metalness={0.05} />
      </mesh>
      <gridHelper args={[120, 40, '#294863', '#173047']} position={[0, 0, 0]} />
    </group>
  );
}

function LaunchPad() {
  return (
    <group position={[0, 0, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.55, 0.75, 0.4, 24]} />
        <meshStandardMaterial color="#64748b" metalness={0.55} roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 0.65, 0]}>
        <boxGeometry args={[0.35, 1.2, 0.35]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function EventBeacons({
  telemetry,
  eventTimes,
  scale,
}: {
  telemetry: TelemetryPoint[];
  eventTimes: number[];
  scale: number;
}) {
  return (
    <>
      {eventTimes.map((time) => {
        const point = interpolateTelemetry(telemetry, time);
        return (
          <group key={time} position={[point.x * scale, Math.max(0.45, point.y * scale + 0.45), 0]}>
            <mesh>
              <sphereGeometry args={[0.16, 16, 16]} />
              <meshStandardMaterial color="#7dd3fc" emissive="#0ea5e9" emissiveIntensity={0.7} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function RocketModel({ point, scale }: { point: TelemetryPoint; scale: number }) {
  const gltf = useGLTF('/models/explorer-jupiter-c-rocket.glb');
  const angle = Math.atan2(point.vy, Math.max(0.001, point.vx));
  const modelScale = 0.85;

  return (
    <group position={[point.x * scale, Math.max(0.45, point.y * scale + 0.45), 0]} rotation={[0, 0, Math.PI / 2 - angle]}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={[modelScale, modelScale, modelScale]}>
        <Clone object={gltf.scene} castShadow receiveShadow />
      </group>
      {point.thrust > 0 ? (
        <mesh position={[0, -1.55, 0]}>
          <coneGeometry args={[0.14, 1 + Math.min(0.85, point.thrust / 3200), 14]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.8} />
        </mesh>
      ) : null}
      <Html position={[0, 2.2, 0]} center distanceFactor={12}>
        <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-sky-100 backdrop-blur">
          {phaseLabel(point.flightPhase)}
        </div>
      </Html>
    </group>
  );
}

function RocketSilhouette({ point, scale }: { point: TelemetryPoint; scale: number }) {
  const angle = Math.atan2(point.vy, Math.max(0.001, point.vx));

  return (
    <group position={[point.x * scale, Math.max(0.45, point.y * scale + 0.45), 0]} rotation={[0, 0, Math.PI / 2 - angle]}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.22, 1.9, 24]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh castShadow position={[0, 1.12, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.22, 0.55, 24]} />
          <meshStandardMaterial color="#fb923c" metalness={0.35} roughness={0.35} />
        </mesh>
        <mesh castShadow position={[0, -0.95, 0.18]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.09, 0.45, 0.3]} />
          <meshStandardMaterial color="#7dd3fc" metalness={0.2} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0, -0.95, -0.18]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[0.09, 0.45, 0.3]} />
          <meshStandardMaterial color="#7dd3fc" metalness={0.2} roughness={0.5} />
        </mesh>
        {point.thrust > 0 ? (
          <mesh position={[0, -1.35, 0]}>
            <coneGeometry args={[0.14, 0.85 + Math.min(0.65, point.thrust / 4000), 14]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.75} />
          </mesh>
        ) : null}
      </group>
      <Html position={[0, 1.85, 0]} center distanceFactor={12}>
        <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-sky-100 backdrop-blur">
          {phaseLabel(point.flightPhase)}
        </div>
      </Html>
    </group>
  );
}

function FollowCamera({ point, scale, mode }: { point: TelemetryPoint; scale: number; mode: CameraMode }) {
  const { camera } = useThree();
  const target = new THREE.Vector3(point.x * scale, Math.max(1.2, point.y * scale + 1.2), 0);
  const desired =
    mode === 'follow'
      ? new THREE.Vector3(target.x - 10, target.y + 6, 14)
      : new THREE.Vector3(16, 18, 24);

  useFrame(() => {
    camera.position.lerp(desired, mode === 'follow' ? 0.06 : 0.04);
    camera.lookAt(mode === 'follow' ? target : new THREE.Vector3(0, Math.max(3, target.y * 0.35), 0));
  });

  return null;
}

function interpolateTelemetry(telemetry: TelemetryPoint[], time: number) {
  if (telemetry.length === 0) {
    return {
      t: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: 0,
      speed: 0,
      airRelativeSpeed: 0,
      ax: 0,
      ay: 0,
      acceleration: 0,
      thrust: 0,
      drag: 0,
      airDensity: 0,
      dynamicPressure: 0,
      gravity: 0,
      fuelRemaining: 0,
      flightPhase: 'coast' as const,
    };
  }

  let nextIndex = telemetry.findIndex((point) => point.t >= time);
  if (nextIndex === -1) {
    return telemetry[telemetry.length - 1];
  }

  if (nextIndex === 0) {
    return telemetry[0];
  }

  const previous = telemetry[nextIndex - 1];
  const next = telemetry[nextIndex];
  const duration = Math.max(0.0001, next.t - previous.t);
  const ratio = (time - previous.t) / duration;
  const phase = ratio < 0.5 ? previous.flightPhase : next.flightPhase;

  return {
    ...previous,
    t: time,
    x: THREE.MathUtils.lerp(previous.x, next.x, ratio),
    y: THREE.MathUtils.lerp(previous.y, next.y, ratio),
    vx: THREE.MathUtils.lerp(previous.vx, next.vx, ratio),
    vy: THREE.MathUtils.lerp(previous.vy, next.vy, ratio),
    mass: THREE.MathUtils.lerp(previous.mass, next.mass, ratio),
    speed: THREE.MathUtils.lerp(previous.speed, next.speed, ratio),
    airRelativeSpeed: THREE.MathUtils.lerp(previous.airRelativeSpeed, next.airRelativeSpeed, ratio),
    ax: THREE.MathUtils.lerp(previous.ax, next.ax, ratio),
    ay: THREE.MathUtils.lerp(previous.ay, next.ay, ratio),
    acceleration: THREE.MathUtils.lerp(previous.acceleration, next.acceleration, ratio),
    thrust: THREE.MathUtils.lerp(previous.thrust, next.thrust, ratio),
    drag: THREE.MathUtils.lerp(previous.drag, next.drag, ratio),
    airDensity: THREE.MathUtils.lerp(previous.airDensity, next.airDensity, ratio),
    dynamicPressure: THREE.MathUtils.lerp(previous.dynamicPressure, next.dynamicPressure, ratio),
    gravity: THREE.MathUtils.lerp(previous.gravity, next.gravity, ratio),
    fuelRemaining: THREE.MathUtils.lerp(previous.fuelRemaining, next.fuelRemaining, ratio),
    flightPhase: phase,
  };
}

function phaseLabel(phase: string) {
  switch (phase) {
    case 'rail':
      return '레일';
    case 'powered':
      return '추진';
    case 'coast':
      return '탄도';
    case 'descent':
      return '하강';
    default:
      return phase;
  }
}

useGLTF.preload('/models/explorer-jupiter-c-rocket.glb');
