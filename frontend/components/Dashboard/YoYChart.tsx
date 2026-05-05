import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';
import type { YoYDataPoint } from '@/utils/calculations';

interface Props {
  data: YoYDataPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="bg-background-card border border-gray-700 rounded-lg p-3 text-sm shadow-lg">
      <p className="text-gray-400 font-medium mb-1">{label}</p>
      <p className={`font-semibold ${val >= 0 ? 'text-success' : 'text-danger'}`}>
        {val != null ? `${val > 0 ? '+' : ''}${val}%` : 'First year'}
      </p>
    </div>
  );
}

export default function YoYChart({ data }: Props) {
  const chartData = data.filter((d) => d.growth !== null);

  if (chartData.length === 0) {
    return (
      <div className="card flex items-center justify-center h-64">
        <p className="text-muted">Need at least 2 salary entries for YoY comparison</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-white font-semibold mb-4">Year-over-Year Growth</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis dataKey="year" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#6b7280" />
          <Bar dataKey="growth" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, idx) => (
              <Cell
                key={idx}
                fill={(entry.growth ?? 0) >= 0 ? '#10b981' : '#ef4444'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
