import { formatCurrency } from '@/utils/calculations';

interface Props {
  currentSalary: number;
  yearsInCareer: number;
  totalGrowthPercent: number;
  realGrowthPercent: number;
}

function MetricCard({ label, value, sub, positive }: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="metric-card">
      <p className="text-muted text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold ${positive === undefined ? 'text-white' : positive ? 'text-success' : 'text-danger'}`}>
        {value}
      </p>
      {sub && <p className="text-muted text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function MetricsCards({ currentSalary, yearsInCareer, totalGrowthPercent, realGrowthPercent }: Props) {
  const inflationImpact = totalGrowthPercent - realGrowthPercent;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Current salary"
        value={formatCurrency(currentSalary)}
        sub="Base + bonus"
      />
      <MetricCard
        label="Career length"
        value={`${yearsInCareer} yr${yearsInCareer !== 1 ? 's' : ''}`}
        sub="From first job"
      />
      <MetricCard
        label="Total growth"
        value={`${totalGrowthPercent > 0 ? '+' : ''}${totalGrowthPercent}%`}
        sub="Nominal"
        positive={totalGrowthPercent >= 0}
      />
      <MetricCard
        label="Real growth"
        value={`${realGrowthPercent > 0 ? '+' : ''}${realGrowthPercent}%`}
        sub={`After ~${inflationImpact.toFixed(1)}% inflation`}
        positive={realGrowthPercent >= 0}
      />
    </div>
  );
}
