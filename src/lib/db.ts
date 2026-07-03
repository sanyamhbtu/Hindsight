import { Pool } from '@neondatabase/serverless';

// Securely construct the connection string from fragmented env vars
const getDbUrl = () => {
  const username = process.env.DB_USERNAME || '';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || '';
  let host = process.env.DB_HOST || '';

  // If DB_HOST contains a prepended auth string (e.g. password@host), strip it
  if (host.includes('@')) {
    host = host.split('@')[1];
  }

  return `postgresql://${username}:${password}@${host}/${dbName}?sslmode=require`;
};

const pool = new Pool({ connectionString: getDbUrl() });

let isInitialized = false;

export async function query(text: string, params?: any[]) {
  if (!isInitialized) {
    await initDb();
    isInitialized = true;
  }
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function initDb() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS session_interactions (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const client = await pool.connect();
  try {
    await client.query(createTableQuery);
    
    // Create an index on session_id for faster lookups
    await client.query(`CREATE INDEX IF NOT EXISTS idx_session_id ON session_interactions(session_id);`);
  } catch (error) {
    console.error("Failed to initialize database table:", error);
  } finally {
    client.release();
  }
}
