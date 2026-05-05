const { Client } = require('pg');
const AWS = require('aws-sdk');

const cognito = new AWS.CognitoIdentityServiceProvider({ region: process.env.COGNITO_REGION });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json',
};

function response(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

function extractToken(event) {
  const auth = event.headers?.Authorization || event.headers?.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// Eurozone HICP inflation rates (annual %)
const INFLATION_RATES = {
  2015: 0.0, 2016: 0.2, 2017: 1.5, 2018: 1.9,
  2019: 1.3, 2020: -0.1, 2021: 2.6, 2022: 8.4,
  2023: 5.3, 2024: 2.4,
};

function getSalaryForYear(jobs, year) {
  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${year}-12-31`);

  // Find the job that was active during most of this year
  const active = jobs
    .filter(j => {
      const start = new Date(j.start_date);
      const end = j.end_date ? new Date(j.end_date) : new Date('9999-12-31');
      return start <= yearEnd && end >= yearStart;
    })
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  if (active.length === 0) return null;
  const job = active[0];
  return parseFloat(job.base_salary) + parseFloat(job.bonus);
}

function calcInflationCumulative(fromYear, toYear) {
  let factor = 1;
  for (let y = fromYear + 1; y <= toYear; y++) {
    factor *= 1 + (INFLATION_RATES[y] || 0) / 100;
  }
  return factor;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, {});

  const db = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const accessToken = extractToken(event);
    if (!accessToken) return response(401, { error: 'Authorization token required' });

    const cognitoUser = await cognito.getUser({ AccessToken: accessToken }).promise();
    const cognitoSub = cognitoUser.UserAttributes.find(a => a.Name === 'sub')?.Value;

    await db.connect();

    const userResult = await db.query('SELECT id FROM users WHERE cognito_sub = $1', [cognitoSub]);
    if (userResult.rows.length === 0) return response(404, { error: 'User not found' });

    const userId = userResult.rows[0].id;

    const jobsResult = await db.query(
      'SELECT * FROM jobs WHERE user_id = $1 ORDER BY start_date ASC',
      [userId]
    );

    const jobs = jobsResult.rows;

    if (jobs.length === 0) {
      return response(200, {
        currentSalary: 0,
        yearsInCareer: 0,
        totalGrowthPercent: 0,
        realGrowthPercent: 0,
        yoyGrowthData: [],
        salaryTimeline: [],
      });
    }

    const firstJob = jobs[0];
    const latestJob = jobs[jobs.length - 1];
    const currentSalary = parseFloat(latestJob.base_salary) + parseFloat(latestJob.bonus);

    const firstYear = new Date(firstJob.start_date).getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsInCareer = currentYear - firstYear;

    const firstSalary = parseFloat(firstJob.base_salary) + parseFloat(firstJob.bonus);
    const totalGrowthPercent = firstSalary > 0
      ? Math.round(((currentSalary - firstSalary) / firstSalary) * 100 * 10) / 10
      : 0;

    // Build year-by-year data
    const salaryTimeline = [];
    const yoyGrowthData = [];
    let prevSalary = null;

    for (let year = firstYear; year <= currentYear; year++) {
      const salary = getSalaryForYear(jobs, year);
      if (salary === null) continue;

      const inflationFactor = calcInflationCumulative(firstYear, year);
      const salaryInflationAdjusted = Math.round(firstSalary * inflationFactor);

      salaryTimeline.push({ year, salary, salaryInflationAdjusted });

      const growth = prevSalary !== null
        ? Math.round(((salary - prevSalary) / prevSalary) * 100 * 10) / 10
        : null;

      yoyGrowthData.push({ year, growth, salary });
      prevSalary = salary;
    }

    // Real growth: compare current salary vs inflation-adjusted first salary
    const totalInflationFactor = calcInflationCumulative(firstYear, currentYear);
    const inflationAdjustedFirstSalary = firstSalary * totalInflationFactor;
    const realGrowthPercent = inflationAdjustedFirstSalary > 0
      ? Math.round(((currentSalary - inflationAdjustedFirstSalary) / inflationAdjustedFirstSalary) * 100 * 10) / 10
      : 0;

    return response(200, {
      currentSalary,
      yearsInCareer,
      totalGrowthPercent,
      realGrowthPercent,
      yoyGrowthData,
      salaryTimeline,
    });
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    if (err.code === 'NotAuthorizedException') return response(401, { error: 'Invalid or expired token' });
    return response(500, { error: 'Internal server error' });
  } finally {
    await db.end().catch(() => {});
  }
};
