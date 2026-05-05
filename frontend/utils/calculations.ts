export interface Job {
  id: string;
  company: string;
  jobTitle: string;
  startDate: string;
  endDate?: string | null;
  baseSalary: number;
  bonus: number;
  location: string;
  currency: string;
}

export interface YoYDataPoint {
  year: number;
  growth: number | null;
  salary: number;
}

export interface SalaryTimelinePoint {
  year: number;
  salary: number;
  salaryInflationAdjusted: number;
}

const INFLATION_RATES: Record<number, number> = {
  2015: 0.0, 2016: 0.2, 2017: 1.5, 2018: 1.9,
  2019: 1.3, 2020: -0.1, 2021: 2.6, 2022: 8.4,
  2023: 5.3, 2024: 2.4,
};

export function getCurrentSalary(jobs: Job[]): number {
  if (jobs.length === 0) return 0;
  const sorted = [...jobs].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  return sorted[0].baseSalary + sorted[0].bonus;
}

export function getYearsInCareer(jobs: Job[]): number {
  if (jobs.length === 0) return 0;
  const sorted = [...jobs].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const firstStart = new Date(sorted[0].startDate);
  const now = new Date();
  return Math.floor(
    (now.getTime() - firstStart.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
}

export function getTotalGrowthPercent(jobs: Job[]): number {
  if (jobs.length < 2) return 0;
  const sorted = [...jobs].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const first = sorted[0].baseSalary + sorted[0].bonus;
  const last = sorted[sorted.length - 1].baseSalary + sorted[sorted.length - 1].bonus;
  if (first === 0) return 0;
  return Math.round(((last - first) / first) * 100 * 10) / 10;
}

function getSalaryForYear(jobs: Job[], year: number): number | null {
  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${year}-12-31`);

  const active = jobs.filter((j) => {
    const start = new Date(j.startDate);
    const end = j.endDate ? new Date(j.endDate) : new Date('9999-12-31');
    return start <= yearEnd && end >= yearStart;
  });

  if (active.length === 0) return null;

  const latest = active.sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )[0];

  return latest.baseSalary + latest.bonus;
}

function cumulativeInflation(fromYear: number, toYear: number): number {
  let factor = 1;
  for (let y = fromYear + 1; y <= toYear; y++) {
    factor *= 1 + (INFLATION_RATES[y] ?? 0) / 100;
  }
  return factor;
}

export function buildYoYData(jobs: Job[]): YoYDataPoint[] {
  if (jobs.length === 0) return [];
  const sorted = [...jobs].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const firstYear = new Date(sorted[0].startDate).getFullYear();
  const currentYear = new Date().getFullYear();

  const data: YoYDataPoint[] = [];
  let prevSalary: number | null = null;

  for (let year = firstYear; year <= currentYear; year++) {
    const salary = getSalaryForYear(jobs, year);
    if (salary === null) continue;

    const growth =
      prevSalary !== null
        ? Math.round(((salary - prevSalary) / prevSalary) * 100 * 10) / 10
        : null;

    data.push({ year, growth, salary });
    prevSalary = salary;
  }

  return data;
}

export function buildSalaryTimeline(jobs: Job[]): SalaryTimelinePoint[] {
  if (jobs.length === 0) return [];
  const sorted = [...jobs].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const firstYear = new Date(sorted[0].startDate).getFullYear();
  const firstSalary = sorted[0].baseSalary + sorted[0].bonus;
  const currentYear = new Date().getFullYear();

  const points: SalaryTimelinePoint[] = [];

  for (let year = firstYear; year <= currentYear; year++) {
    const salary = getSalaryForYear(jobs, year);
    if (salary === null) continue;
    const inflFactor = cumulativeInflation(firstYear, year);
    points.push({
      year,
      salary,
      salaryInflationAdjusted: Math.round(firstSalary * inflFactor),
    });
  }

  return points;
}

export function getRealGrowthPercent(jobs: Job[]): number {
  if (jobs.length < 2) return 0;
  const sorted = [...jobs].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const firstYear = new Date(sorted[0].startDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const firstSalary = sorted[0].baseSalary + sorted[0].bonus;
  const currentSalary = sorted[sorted.length - 1].baseSalary + sorted[sorted.length - 1].bonus;

  const adjustedFirst = firstSalary * cumulativeInflation(firstYear, currentYear);
  if (adjustedFirst === 0) return 0;
  return Math.round(((currentSalary - adjustedFirst) / adjustedFirst) * 100 * 10) / 10;
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
