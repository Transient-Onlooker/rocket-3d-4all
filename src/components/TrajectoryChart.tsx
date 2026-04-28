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
  parsing: false,
  scales: {
    x: {
      type: 'linear',
      title: { display: true, text: 'Downrange distance (m)', color: '#d6ecff' },
      ticks: { color: '#d6ecff' },
      grid: { color: 'rgba(214,236,255,0.1)' },
    },
    y: {
      title: { display: true, text: 'Altitude (m)', color: '#d6ecff' },
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
  const telemetry = sampleTelemetry(useSimStore((state) => state.telemetry));
  const peakAltitude = telemetry.reduce((highest, point) => Math.max(highest, point.y), 0);
  const eventMarkers = telemetry.filter(
    (point, index) =>
      index === 0 ||
      point.flightPhase !== telemetry[Math.max(index - 1, 0)]?.flightPhase ||
      point.y === peakAltitude,
  );

  return (
    <section className="rounded-[2rem] border border-white/10 bg-panel/90 p-5">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">Trajectory</h2>
        <p className="text-sm text-sky/70">2D path from launch rail to touchdown.</p>
      </div>
      <div className="h-[380px] rounded-[1.5rem] border border-white/5 bg-black/10 p-3">
        <Line
          options={options}
          data={{
            datasets: [
              {
                label: 'Flight path',
                data: telemetry.map((point) => ({ x: point.x, y: point.y })),
                borderColor: '#ff9f4a',
                backgroundColor: '#ff9f4a',
                pointRadius: 0,
                borderWidth: 2,
              },
              {
                label: 'Phase markers',
                data: eventMarkers.map((point) => ({ x: point.x, y: point.y })),
                borderColor: '#7dd3fc',
                backgroundColor: '#7dd3fc',
                pointRadius: 4,
                showLine: false,
              },
            ],
          }}
        />
      </div>
    </section>
  );
}
