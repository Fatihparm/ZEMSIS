// One-time script to create the database
const { Client } = require('pg');

async function createDb() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'postgres' // connect to default db first
  });

  try {
    await client.connect();
    // Check if db exists
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'jet-grout-calc'"
    );
    if (res.rows.length === 0) {
      await client.query('CREATE DATABASE "jet-grout-calc"');
      console.log('✅ Database "jet-grout-calc" created successfully');
    } else {
      console.log('ℹ️  Database "jet-grout-calc" already exists');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

createDb();
