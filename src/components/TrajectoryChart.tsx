import {
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Line } from 'react-chartjs-2';
import { useSimStore } from '../store/simStore';
import { interpolateTelemetry } from '../utils/telemetry';

ChartJS.register(LinearScale, LineElement, PointElement, Tooltip, Legend);

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  parsing: false,
  scales: {
    x: {
      type: 'linear',
      title: { display: true, text: '사거리 (m)', color: '#d6ecff' },
      ticks: { color: '#d6ecff' },
      grid: { color: 'rgba(214,236,255,0.1)' },
    },
    y: {
      title: { display: true, text: '고도 (m)', color: '#d6ecff' },
      ticks: { color: '#d6ecff' },
      grid: { color: 'rgba(214,236,255,0.1)' },
    },
  },
  plugins: {
    legend: {
      labels: { color: '#d6ecff' },
    },
  },
};

export function TrajectoryChart() {
  const fullTelemetry = useSimStore((state) => state.telemetry);
  const launchReady = useSimStore((state) => state.launchReady);
  const playbackTime = useSimStore((state) => state.playbackTime);
  const setPlaybackTime = useSimStore((state) => state.setPlaybackTime);
  const chartRef = useRef<ChartJS<'line'> | null>(null);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const chartKey =
    fullTelemetry.length === 0
      ? 'trajectory-empty'
      : `trajectory-${fullTelemetry.length}-${fullTelemetry[fullTelemetry.length - 1].t.toFixed(2)}-${fullTelemetry[fullTelemetry.length - 1].x.toFixed(2)}-${fullTelemetry[fullTelemetry.length - 1].y.toFixed(2)}`;
  const peakAltitude = fullTelemetry.reduce((highest, point) => Math.max(highest, point.y), 0);
  const currentPoint = interpolateTelemetry(fullTelemetry, playbackTime);
  const eventMarkers = fullTelemetry.filter(
    (point, index) =>
      index === 0 ||
      point.flightPhase !== fullTelemetry[Math.max(index - 1, 0)]?.flightPhase ||
      point.y === peakAltitude,
  );

  useEffect(() => {
    if (!isDraggingMarker) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const nextTime = getPlaybackTimeFromPointer(chartRef.current, fullTelemetry, event.clientX);
      if (nextTime !== null) {
        setPlaybackTime(nextTime);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingMarker(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fullTelemetry, isDraggingMarker, setPlaybackTime]);

  const handleMarkerMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) {
      return;
    }

    const currentX = xScale.getPixelForValue(currentPoint.x);
    const currentY = yScale.getPixelForValue(currentPoint.y);
    const rect = chart.canvas.getBoundingClientRect();
    const dx = event.clientX - (rect.left + currentX);
    const dy = event.clientY - (rect.top + currentY);

    if (Math.hypot(dx, dy) > 16) {
      return;
    }

    event.preventDefault();
    setIsDraggingMarker(true);
    const nextTime = getPlaybackTimeFromPointer(chart, fullTelemetry, event.clientX);
    if (nextTime !== null) {
      setPlaybackTime(nextTime);
    }
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-panel/90 p-5">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">궤적</h2>
        <p className="text-sm text-sky/70">3D 재생 중인 로켓 위치가 아래 2D 궤적에서도 점으로 함께 움직입니다.</p>
      </div>
      <div
        className="relative h-[380px] rounded-[1.5rem] border border-white/5 bg-black/10 p-3"
        onMouseDown={handleMarkerMouseDown}
      >
        <Line
          key={chartKey}
          ref={chartRef}
          options={options}
          data={{
            datasets: [
              {
                label: '비행 경로',
                data: fullTelemetry.map((point) => ({ x: point.x, y: point.y })),
                borderColor: '#ff9f4a',
                backgroundColor: '#ff9f4a',
                pointRadius: 0,
                borderWidth: 2,
              },
              {
                label: '이벤트 지점',
                data: eventMarkers.map((point) => ({ x: point.x, y: point.y })),
                borderColor: '#7dd3fc',
                backgroundColor: '#7dd3fc',
                pointRadius: 4,
                showLine: false,
              },
              {
                label: '현재 위치',
                data: [{ x: currentPoint.x, y: currentPoint.y }],
                borderColor: '#f8fafc',
                backgroundColor: '#f8fafc',
                pointRadius: isDraggingMarker ? 8 : 6,
                pointHoverRadius: 8,
                pointBorderWidth: 2,
                pointBorderColor: '#fb923c',
                showLine: false,
              },
            ],
          }}
        />
        {!launchReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px]">
            <div className="rounded-[1.3rem] border border-rose-300/25 bg-rose-300/12 px-5 py-4 text-center text-rose-50">
              <div className="text-xs uppercase tracking-[0.28em] text-rose-100/75">Trajectory Unavailable</div>
              <div className="mt-2 text-lg font-semibold">이륙 불가</div>
              <div className="mt-2 text-sm text-rose-100/85">추중비가 1 미만이라 유효한 비행 궤적이 생성되지 않았습니다.</div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getPlaybackTimeFromPointer(chart: ChartJS<'line'> | null, telemetry: Array<{ x: number; t: number }>, clientX: number) {
  if (!chart || telemetry.length === 0) {
    return null;
  }

  const xScale = chart.scales.x;
  if (!xScale) {
    return null;
  }

  const rect = chart.canvas.getBoundingClientRect();
  const pixelX = clamp(clientX - rect.left, xScale.left, xScale.right);
  const targetX = xScale.getValueForPixel(pixelX);
  if (typeof targetX !== 'number' || Number.isNaN(targetX)) {
    return null;
  }

  let nearestPoint = telemetry[0];
  let nearestDistance = Math.abs(nearestPoint.x - targetX);

  for (let index = 1; index < telemetry.length; index += 1) {
    const point = telemetry[index];
    const distance = Math.abs(point.x - targetX);
    if (distance < nearestDistance) {
      nearestPoint = point;
      nearestDistance = distance;
    }
  }

  return nearestPoint.t;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
