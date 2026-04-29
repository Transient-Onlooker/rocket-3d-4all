import {
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useSimStore } from '../store/simStore';
import { sampleTelemetry } from '../utils/chartSampling';

ChartJS.register(LinearScale, LineElement, PointElement, Tooltip, Legend);

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  parsing: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  scales: {
    x: {
      type: 'linear',
      title: { display: true, text: '시간 (s)', color: '#d6ecff' },
      ticks: { color: '#d6ecff', maxTicksLimit: 10 },
      grid: { color: 'rgba(214,236,255,0.1)' },
    },
    y: {
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

export function TelemetryChart() {
  const telemetry = useSimStore((state) => state.telemetry);
  const launchReady = useSimStore((state) => state.launchReady);
  const playbackTime = useSimStore((state) => state.playbackTime);
  const reducedTelemetry = sampleTelemetry(telemetry);
  const chartKey =
    telemetry.length === 0
      ? 'telemetry-empty'
      : `telemetry-${telemetry.length}-${telemetry[telemetry.length - 1].t.toFixed(2)}-${telemetry[telemetry.length - 1].y.toFixed(2)}-${telemetry[telemetry.length - 1].speed.toFixed(2)}`;
  const plottedValues = reducedTelemetry.flatMap((point) => [point.y, point.speed, point.acceleration, point.dynamicPressure / 1000]);
  const verticalLineMin = plottedValues.length > 0 ? Math.min(...plottedValues) : 0;
  const verticalLineMax = plottedValues.length > 0 ? Math.max(...plottedValues) : 1;

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-panel/90 p-4 sm:rounded-[1.75rem] sm:p-5 xl:rounded-[2rem]">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">텔레메트리</h2>
        <p className="text-sm text-sky/70">전체 비행 구간의 고도, 속도, 가속도, 동압을 확인합니다.</p>
      </div>
      <div className="relative h-[300px] rounded-[1.25rem] border border-white/5 bg-black/10 p-3 sm:h-[340px] sm:rounded-[1.35rem] xl:h-[380px] xl:rounded-[1.5rem]">
        <Line
          key={chartKey}
          options={options}
          data={{
            datasets: [
              {
                label: '고도 (m)',
                data: reducedTelemetry.map((point) => ({ x: point.t, y: point.y })),
                borderColor: '#7dd3fc',
                pointRadius: 0,
                borderWidth: 2,
              },
              {
                label: '속도 (m/s)',
                data: reducedTelemetry.map((point) => ({ x: point.t, y: point.speed })),
                borderColor: '#ff9f4a',
                pointRadius: 0,
                borderWidth: 2,
              },
              {
                label: '가속도 (m/s^2)',
                data: reducedTelemetry.map((point) => ({ x: point.t, y: point.acceleration })),
                borderColor: '#f472b6',
                pointRadius: 0,
                borderWidth: 2,
              },
              {
                label: '동압 (kPa)',
                data: reducedTelemetry.map((point) => ({ x: point.t, y: point.dynamicPressure / 1000 })),
                borderColor: '#34d399',
                pointRadius: 0,
                borderWidth: 2,
              },
              {
                label: '현재 시점',
                data: [
                  { x: playbackTime, y: verticalLineMin },
                  { x: playbackTime, y: verticalLineMax },
                ],
                borderColor: '#f8fafc',
                pointRadius: 0,
                borderWidth: 2,
              },
            ],
          }}
        />
        {!launchReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px]">
            <div className="rounded-[1.3rem] border border-rose-300/25 bg-rose-300/12 px-5 py-4 text-center text-rose-50">
              <div className="text-xs uppercase tracking-[0.28em] text-rose-100/75">Telemetry Unavailable</div>
              <div className="mt-2 text-lg font-semibold">이륙 불가</div>
              <div className="mt-2 text-sm text-rose-100/85">발사 조건이 성립하지 않아 시간별 비행 데이터가 생성되지 않았습니다.</div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
