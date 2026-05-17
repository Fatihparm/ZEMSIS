/**
 * migrate-to-uuid.js
 *
 * One-time migration: drops old SERIAL-based tables and recreates them
 * with UUID primary keys. Run ONCE on the server:
 *
 *   node migrate-to-uuid.js
 *
 * WARNING: This drops all existing users and projects data.
 * Back up your data before running this script.
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('⚙️  Starting UUID migration...');

    await client.query('BEGIN');

    // Drop dependent tables first (FK constraint order)
    await client.query('DROP TABLE IF EXISTS projects CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('🗑️  Old tables dropped');

    // Recreate with UUID keys (gen_random_uuid() is built-in since PostgreSQL 13)
    await client.query(`
      CREATE TABLE users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name     VARCHAR(100) NOT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE projects (
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
      )
    `);

    await client.query('CREATE INDEX idx_projects_user_id ON projects(user_id)');

    await client.query('COMMIT');
    console.log('✅  UUID migration complete — all tables recreated with UUID keys.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
