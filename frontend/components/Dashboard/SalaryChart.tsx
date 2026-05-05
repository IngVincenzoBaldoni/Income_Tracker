import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatCurrency, type SalaryTimelinePoint } from '@/utils/calculations';

interface Props {
  data: SalaryTimelinePoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background-card border border-gray-700 rounded-lg p-3 text-sm shadow-lg">
      <p className="text-gray-400 font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="text-white font-semibold">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SalaryChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card flex items-center justify-center h-64">
        <p className="text-muted">Add salary entries to see your timeline</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-white font-semibold mb-4">Salary Timeline</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="year" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <YAxis
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#9ca3af', fontSize: '13px' }}
          />
          <Line
            type="monotone"
            dataKey="salary"
            name="Nominal salary"
            stroke="#0066cc"
            strokeWidth={2.5}
            dot={{ fill: '#0066cc', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="salaryInflationAdjusted"
            name="Inflation-adjusted baseline"
            stroke="#6b7280"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-muted text-xs mt-3">
        Dashed line shows what your starting salary would need to be today to match inflation.
        When your nominal line is above it, your purchasing power grew.
      </p>
    </div>
  );
}
