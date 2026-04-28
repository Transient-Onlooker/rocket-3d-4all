import {
  Chart as ChartJS,
  CategoryScale,
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

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  scales: {
    x: {
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
  const reducedTelemetry = sampleTelemetry(telemetry);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-panel/90 p-5">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">텔레메트리</h2>
        <p className="text-sm text-sky/70">전체 비행 구간의 고도, 속도, 가속도, 동압을 확인합니다.</p>
      </div>
      <div className="h-[380px] rounded-[1.5rem] border border-white/5 bg-black/10 p-3">
        <Line
          options={options}
          data={{
            labels: reducedTelemetry.map((point) => point.t.toFixed(1)),
            datasets: [
              {
                label: '고도 (m)',
                data: reducedTelemetry.map((point) => point.y),
                borderColor: '#7dd3fc',
                pointRadius: 0,
                borderWidth: 2,
              },
              {
                label: '속도 (m/s)',
                data: reducedTelemetry.map((point) => point.speed),
                borderColor: '#ff9f4a',
                pointRadius: 0,
                borderWidth: 2,
              },
              {
                label: '가속도 (m/s^2)',
                data: reducedTelemetry.map((point) => point.acceleration),
                borderColor: '#f472b6',
                pointRadius: 0,
                borderWidth: 2,
              },
              {
                label: '동압 (kPa)',
                data: reducedTelemetry.map((point) => point.dynamicPressure / 1000),
                borderColor: '#34d399',
                pointRadius: 0,
                borderWidth: 2,
              },
            ],
          }}
        />
      </div>
    </section>
  );
}
