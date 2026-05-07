import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
)

export function ClicksChart({ series }) {
  const hasData = series && series.labels && series.labels.length > 0

  if (!hasData) {
    return (
      <div className="p-6 border border-gray-200 rounded-xl bg-white text-center">
        <p className="text-sm text-gray-400">Henüz tıklama verisi yok</p>
      </div>
    )
  }

  const data = {
    labels: series.labels,
    datasets: [
      {
        label: 'Günlük Tıklama',
        data: series.data,
        borderColor: 'rgba(139, 92, 246, 1)',
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0].label,
          label: (item) => ` ${item.raw} tıklama`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: { size: 11 },
        },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  }

  return (
    <div className="p-4 border border-gray-200 rounded-xl bg-white">
      <p className="text-sm font-medium text-gray-500 mb-3">Günlük Tıklama Grafiği</p>
      <Line data={data} options={options} />
    </div>
  )
}
