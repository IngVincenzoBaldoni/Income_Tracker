const { Client } = require('pg');

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_sub  VARCHAR(256) UNIQUE NOT NULL,
  email        VARCHAR(254) UNIQUE NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company      VARCHAR(255) NOT NULL,
  job_title    VARCHAR(255) NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE,
  base_salary  DECIMAL(12, 2) NOT NULL CHECK (base_salary > 0),
  bonus        DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  location     VARCHAR(255) NOT NULL,
  currency     VARCHAR(3) NOT NULL DEFAULT 'EUR',
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id    ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_user_start ON jobs(user_id, start_date DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`;

exports.handler = async () => {
  const db = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await db.connect();
    console.log('Connected to DB. Applying schema...');
    await db.query(SCHEMA);
    console.log('Schema applied successfully.');
    return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Schema applied' }) };
  } catch (err) {
    console.error('Migration error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  } finally {
    await db.end().catch(() => {});
  }
};
