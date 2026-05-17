const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection
pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error:', err);
});

/**
 * Run the initial migration — creates tables if they don't exist.
 */
async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name     VARCHAR(100) NOT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
        name          VARCHAR(255) NOT NULL,
        description   TEXT DEFAULT '',
        parameters    JSONB NOT NULL DEFAULT '{}',
        soil_layers   JSONB DEFAULT '[]',
        results       JSONB DEFAULT NULL,
        drawing_data  JSONB DEFAULT NULL,
        extra_params  JSONB DEFAULT '{}',
        units         JSONB DEFAULT '{}',
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS extra_params JSONB DEFAULT '{}';

      -- Index for fast user-based lookups
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

      -- ── Report drafts (kullanıcı metin taslakları) ──────────
      CREATE TABLE IF NOT EXISTS report_drafts (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        sections    JSONB NOT NULL DEFAULT '{}',
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_report_drafts_project ON report_drafts(project_id);
    `);
    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, migrate };
