/**
 * migrate.js — Standalone migration script
 *
 * Docker ortamında çalıştırma:
 *   docker compose exec backend node migrate.js
 *
 * Yerel geliştirmede:
 *   DATABASE_URL=postgresql://... node migrate.js
 *
 * Bu script idempotent'tir: defalarca çalıştırılabilir,
 * her seferinde yalnızca eksik olanları ekler.
 */

require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  const client = await pool.connect();
  console.log('🔗 PostgreSQL bağlantısı kuruldu.');

  try {
    // ────────────────────────────────────────────────────────────
    // 1. users tablosu (ilk kez oluşturma + kolon eklemeleri)
    // ────────────────────────────────────────────────────────────
    console.log('\n[1/8] users tablosu...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name     VARCHAR(100) NOT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'user';
    `);
    console.log('   ✓ users.role kolonu hazır');

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS municipality VARCHAR(100) DEFAULT NULL;
    `);
    console.log('   ✓ users.municipality kolonu hazır');

    // ────────────────────────────────────────────────────────────
    // 2. projects tablosu
    // ────────────────────────────────────────────────────────────
    console.log('\n[2/8] projects tablosu...');
    await client.query(`
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
    `);
    await client.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS extra_params JSONB DEFAULT '{}';
    `);
    await client.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS improvement_method VARCHAR(50) NOT NULL DEFAULT 'jet_grout';
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    `);
    console.log('   ✓ projects tablosu hazır (improvement_method kolonu dahil)');

    // ────────────────────────────────────────────────────────────
    // 3. report_drafts tablosu
    // ────────────────────────────────────────────────────────────
    console.log('\n[3/8] report_drafts tablosu...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_drafts (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        sections    JSONB NOT NULL DEFAULT '{}',
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_report_drafts_project ON report_drafts(project_id);
    `);
    console.log('   ✓ report_drafts tablosu hazır');

    // ────────────────────────────────────────────────────────────
    // 4. report_images tablosu
    // ────────────────────────────────────────────────────────────
    console.log('\n[4/8] report_images tablosu...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_images (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
        section_key  VARCHAR(100) NOT NULL DEFAULT 'unknown',
        data         BYTEA NOT NULL,
        mime_type    VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
        width        INT NOT NULL DEFAULT 0,
        height       INT NOT NULL DEFAULT 0,
        file_size    INT NOT NULL DEFAULT 0,
        original_name VARCHAR(255) DEFAULT NULL,
        caption      TEXT DEFAULT '',
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_report_images_project
        ON report_images(project_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_report_images_project_section
        ON report_images(project_id, section_key);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_report_images_user
        ON report_images(user_id);
    `);
    console.log('   ✓ report_images tablosu hazır');

    // ────────────────────────────────────────────────────────────
    // 5. project_applications tablosu
    // ────────────────────────────────────────────────────────────
    console.log('\n[5/8] project_applications tablosu...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_applications (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
        municipality    VARCHAR(100) NOT NULL,
        status          VARCHAR(30) NOT NULL DEFAULT 'pending',
        rejection_note  TEXT DEFAULT NULL,
        applied_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at     TIMESTAMP DEFAULT NULL,
        reviewed_by     UUID REFERENCES users(id) DEFAULT NULL,
        UNIQUE(project_id)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_user   ON project_applications(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_muni   ON project_applications(municipality);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_status ON project_applications(status);
    `);
    console.log('   ✓ project_applications tablosu hazır');

    // ────────────────────────────────────────────────────────────
    // 6. report_verifications tablosu
    // ────────────────────────────────────────────────────────────
    console.log('\n[6/8] report_verifications tablosu...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_verifications (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code         VARCHAR(50) UNIQUE NOT NULL,
        project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
        user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
        project_name TEXT DEFAULT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_report_verifications_code
        ON report_verifications(code);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_report_verifications_project
        ON report_verifications(project_id);
    `);
    console.log('   ✓ report_verifications tablosu hazır');

    // ────────────────────────────────────────────────────────────
    // ────────────────────────────────────────────────────────────
    // 7. improvement_method index
    // ────────────────────────────────────────────────────────────
    console.log('\n[7/8] improvement_method index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_method ON projects(improvement_method);
    `);
    console.log('   ✓ idx_projects_method hazır');

    // ────────────────────────────────────────────────────────────
    // 8. Mevcut schema doğrulama (bilgi amaçlı)
    // ────────────────────────────────────────────────────────────
    console.log('\n[8/8] Schema doğrulama...');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('   Mevcut tablolar:', tables.rows.map(r => r.table_name).join(', '));

    const cols = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('role', 'municipality')
      ORDER BY column_name;
    `);
    if (cols.rows.length === 2) {
      console.log('   ✓ users.role ve users.municipality kolonları mevcut');
    } else {
      console.warn('   ⚠️  Beklenen kolonlar eksik:', cols.rows);
    }

    console.log('\n✅ Migration tamamlandı.\n');

  } catch (err) {
    console.error('\n❌ Migration hatası:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
