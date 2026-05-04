import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useSimStore } from '../store/simStore';
import type { TelemetryPoint } from '../types/rocket';
import { interpolateTelemetry } from '../utils/telemetry';

const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;
const CAMERA_MODES = ['follow', 'overview'] as const;
type CameraMode = (typeof CAMERA_MODES)[number];

export function FlightViewport3D() {
  const telemetry = useSimStore((state) => state.telemetry);
  const params = useSimStore((state) => state.params);
  const events = useSimStore((state) => state.events);
  const summary = useSimStore((state) => state.summary);
  const launchReady = useSimStore((state) => state.launchReady);
  const playbackTime = useSimStore((state) => state.playbackTime);
  const setPlaybackTime = useSimStore((state) => state.setPlaybackTime);
  const duration = telemetry[telemetry.length - 1]?.t ?? 0;
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const lastWheelAtRef = useRef(0);
  const lastPublishedTimeRef = useRef(0);
  const suppressNextPublishRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loopPlayback, setLoopPlayback] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<(typeof PLAYBACK_SPEEDS)[number]>(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>('overview');
  const [currentTime, setCurrentTime] = useState(0);
  const [autoFollowEnabled, setAutoFollowEnabled] = useState(false);

  useEffect(() => {
    setCurrentTime(0);
    setAutoFollowEnabled(cameraMode === 'follow');
    lastPublishedTimeRef.current = 0;
    setPlaybackTime(0);
  }, [cameraMode, setPlaybackTime, telemetry]);

  useEffect(() => {
    if (cameraMode === 'follow') {
      setAutoFollowEnabled(true);
    }
  }, [cameraMode]);

  useEffect(() => {
    const isExternalTime = Math.abs(playbackTime - lastPublishedTimeRef.current) > 0.01;
    if (isExternalTime && Math.abs(playbackTime - currentTime) > 0.01) {
      lastPublishedTimeRef.current = playbackTime;
      suppressNextPublishRef.current = true;
      setCurrentTime(playbackTime);
      setIsPlaying(false);
    }
  }, [currentTime, playbackTime]);

  useEffect(() => {
    if (suppressNextPublishRef.current) {
      suppressNextPublishRef.current = false;
      return;
    }

    if (Math.abs(lastPublishedTimeRef.current - currentTime) > 0.01) {
      lastPublishedTimeRef.current = currentTime;
      setPlaybackTime(currentTime);
    }
  }, [currentTime, setPlaybackTime]);

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
  const flownTrailPoints = telemetry
    .filter((point, index) => point.t <= currentTime && index % Math.max(1, Math.ceil(telemetry.length / 140)) === 0)
    .map((point) => [point.x * scale, point.y * scale, 0.04] as [number, number, number]);
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
    <section className="rounded-[1.5rem] border border-white/10 bg-panel/90 p-4 sm:rounded-[1.75rem] sm:p-5 xl:rounded-[2rem]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">3D 비행 뷰</h2>
          <p className="text-sm text-sky/70">드래그로 회전, 휠로 확대, 우클릭 드래그로 이동할 수 있습니다.</p>
        </div>
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar xl:mx-0 xl:flex-wrap xl:overflow-visible xl:px-0 xl:pb-0">
          <button
            className="whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 sm:px-4 sm:text-sm"
            onClick={() => setIsPlaying((playing) => !playing)}
          >
            {isPlaying ? '일시정지' : '재생'}
          </button>
          <button
            className={[
              'whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm',
              loopPlayback
                ? 'border-sky-300/40 bg-sky-300/15 text-sky-50'
                : 'border-white/10 bg-white/5 text-sky/75 hover:bg-white/10',
            ].join(' ')}
            onClick={() => setLoopPlayback((loop) => !loop)}
          >
            {loopPlayback ? '반복 켜짐' : '반복 꺼짐'}
          </button>
          <button
            className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-sky-50 transition hover:bg-white/10 sm:px-4 sm:text-sm"
            onClick={() => setAutoFollowEnabled(true)}
          >
            시점 재설정
          </button>
          {CAMERA_MODES.map((mode) => (
            <button
              key={mode}
              className={[
                'whitespace-nowrap rounded-full border px-3 py-2 text-[11px] font-semibold uppercase transition sm:text-xs',
                cameraMode === mode
                  ? 'border-emerald-300/35 bg-emerald-300/12 text-emerald-50'
                  : 'border-white/10 bg-white/5 text-sky/75 hover:bg-white/10',
              ].join(' ')}
              onClick={() => setCameraMode(mode)}
            >
              {mode === 'follow' ? '추적' : '자유'}
            </button>
          ))}
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              className={[
                'whitespace-nowrap rounded-full border px-3 py-2 text-[11px] font-semibold transition sm:text-xs',
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

      <div
        className="overflow-hidden rounded-[1.5rem] border border-white/5 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.08),rgba(0,0,0,0.18)_50%,rgba(0,0,0,0.3)_100%)]"
        onWheelCapture={() => {
          lastWheelAtRef.current = performance.now();
        }}
      >
        <div className="relative h-[320px] sm:h-[380px] xl:h-[440px]">
          <Canvas shadows dpr={[1, 2]}>
            <color attach="background" args={['#06101d']} />
            <fog attach="fog" args={['#06101d', 30, 120]} />
            <ambientLight intensity={0.7} />
            <directionalLight castShadow intensity={1.8} position={[14, 20, 12]} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
            <directionalLight intensity={0.5} position={[-12, 8, -10]} color="#7dd3fc" />
            <Stars radius={120} depth={40} count={1500} factor={4} saturation={0} fade speed={0.3} />
            <SceneGround />
            <Line points={[[0, 0, 0], railEnd]} color="#7dd3fc" lineWidth={2} />
            {trailPoints.length >= 2 ? <Line points={trailPoints} color="#7c5a38" lineWidth={1.2} transparent opacity={0.55} /> : null}
            {flownTrailPoints.length >= 2 ? <Line points={flownTrailPoints} color="#ff9f4a" lineWidth={3} /> : null}
            <EventBeacons telemetry={telemetry} eventTimes={events.map((event) => event.time)} scale={scale} />
            <LaunchPad />
            <RocketSilhouette telemetry={telemetry} currentTime={currentTime} scale={scale} />
            <FollowCamera
              controlsRef={controlsRef}
              point={currentPoint}
              scale={scale}
              mode={cameraMode}
              autoFollowEnabled={autoFollowEnabled}
            />
            <OrbitControls
              ref={controlsRef}
              makeDefault
              enablePan
              enableRotate
              enableZoom
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.9}
              zoomSpeed={0.9}
              panSpeed={0.8}
              maxPolarAngle={Math.PI * 0.48}
              minDistance={6}
              maxDistance={120}
              onStart={() => {
                const justZoomed = performance.now() - lastWheelAtRef.current < 160;
                if (cameraMode === 'follow' && !justZoomed) {
                  setAutoFollowEnabled(false);
                }
              }}
            />
          </Canvas>
          {!launchReady ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]">
              <div className="rounded-[1.4rem] border border-rose-300/25 bg-rose-300/12 px-6 py-4 text-center text-rose-50">
                <div className="text-xs uppercase tracking-[0.28em] text-rose-100/75">Launch Blocked</div>
                <div className="mt-2 text-lg font-semibold">이륙 불가</div>
                <div className="mt-2 text-sm text-rose-100/85">추력이 중량을 이기지 못해 발사 레일을 벗어날 수 없습니다.</div>
              </div>
            </div>
          ) : null}
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
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {hudItems.map((item) => (
            <div key={item.label} className="rounded-[1.1rem] border border-white/10 bg-black/10 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-sky/55">{item.label}</div>
              <div className="mt-1 text-sm font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-[1.25rem] border border-white/10 bg-black/10 px-4 py-3 text-xs leading-6 text-sky/70">
        추적 모드에서는 로켓을 따라가고, 드래그하는 순간 자동 추적이 잠시 해제됩니다. 다시 따라가게 하려면 <span className="font-semibold text-white">시점 재설정</span>을 누르세요.
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
          <group key={time} position={[point.x * scale, point.y * scale, 0]}>
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

function RocketSilhouette({
  telemetry,
  currentTime,
  scale,
}: {
  telemetry: TelemetryPoint[];
  currentTime: number;
  scale: number;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const flameRef = useRef<THREE.Mesh | null>(null);
  const latestPoint = interpolateTelemetry(telemetry, currentTime);
  const silhouetteScale = 1.05;

  useFrame(() => {
    const point = interpolateTelemetry(telemetry, currentTime);
    const angle = Math.atan2(point.vy, Math.max(0.001, point.vx));

    if (groupRef.current) {
      groupRef.current.position.set(point.x * scale, point.y * scale, 0);
      groupRef.current.rotation.set(0, 0, angle - Math.PI / 2);
    }

    if (flameRef.current) {
      flameRef.current.visible = point.thrust > 0;
      flameRef.current.scale.setScalar(1 + Math.min(0.45, point.thrust / 5000));
    }
  });

  return (
    <group
      ref={groupRef}
      position={[latestPoint.x * scale, latestPoint.y * scale, 0]}
      rotation={[0, 0, Math.atan2(latestPoint.vy, Math.max(0.001, latestPoint.vx)) - Math.PI / 2]}
    >
      <group scale={[silhouetteScale, silhouetteScale, silhouetteScale]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.22, 1.9, 24]} />
          <meshStandardMaterial color="#f8fafc" emissive="#1e293b" emissiveIntensity={0.18} metalness={0.55} roughness={0.22} />
        </mesh>
        <mesh castShadow position={[0, 1.12, 0]}>
          <coneGeometry args={[0.22, 0.55, 24]} />
          <meshStandardMaterial color="#fb923c" emissive="#7c2d12" emissiveIntensity={0.25} metalness={0.35} roughness={0.35} />
        </mesh>
        <mesh castShadow position={[0, -0.95, 0.18]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.09, 0.45, 0.3]} />
          <meshStandardMaterial color="#7dd3fc" metalness={0.2} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0, -0.95, -0.18]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[0.09, 0.45, 0.3]} />
          <meshStandardMaterial color="#7dd3fc" metalness={0.2} roughness={0.5} />
        </mesh>
        <mesh ref={flameRef} position={[0, -1.35, 0]} rotation={[0, 0, Math.PI]} visible={latestPoint.thrust > 0}>
          <coneGeometry args={[0.14, 0.85 + Math.min(0.65, latestPoint.thrust / 4000), 14]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.75} />
        </mesh>
      </group>
      <pointLight color="#fb923c" intensity={latestPoint.thrust > 0 ? 1.1 : 0.35} distance={5} position={[0, -0.8, 0]} />
    </group>
  );
}

function FollowCamera({
  controlsRef,
  point,
  scale,
  mode,
  autoFollowEnabled,
}: {
  controlsRef: { current: OrbitControlsImpl | null };
  point: TelemetryPoint;
  scale: number;
  mode: CameraMode;
  autoFollowEnabled: boolean;
}) {
  const { camera } = useThree();
  const initializedMode = useRef<CameraMode | null>(null);
  const target = new THREE.Vector3(point.x * scale, Math.max(1.2, point.y * scale + 1.2), 0);
  const overviewTarget = new THREE.Vector3(0, Math.max(3, target.y * 0.35), 0);
  const followPosition = new THREE.Vector3(target.x - 10, target.y + 6, 14);
  const overviewPosition = new THREE.Vector3(16, 18, 24);

  useFrame(() => {
    if (mode === 'overview') {
      if (initializedMode.current !== 'overview') {
        camera.position.copy(overviewPosition);
        camera.lookAt(overviewTarget);
        if (controlsRef.current) {
          controlsRef.current.target.copy(overviewTarget);
          controlsRef.current.update();
        }
        initializedMode.current = 'overview';
      }
      return;
    }

    initializedMode.current = 'follow';

    if (!autoFollowEnabled) {
      return;
    }

    camera.position.lerp(followPosition, 0.06);
    camera.lookAt(target);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(target, 0.08);
      controlsRef.current.update();
    }
  });

  return null;
}

function phaseLabel(phase: string) {
  switch (phase) {
    case 'rail':
      return '레일';
    case 'powered':
      return '추진';
    case 'coast':
      return '관성';
    case 'descent':
      return '하강';
    default:
      return phase;
  }
}
