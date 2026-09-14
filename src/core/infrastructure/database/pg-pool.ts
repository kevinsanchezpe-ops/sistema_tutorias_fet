import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, Client } = pg;

export interface PgConfig {
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  connectionString?: string;
}

export function getPgConfig(): PgConfig {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString && !connectionString.includes('TU_PASSWORD_AQUI')) {
    return { connectionString };
  }

  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || '';
  const host = process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.PGPORT || '5432', 10);
  const database = process.env.PGDATABASE || 'gt_db';

  return {
    user,
    password,
    host,
    port,
    database
  };
}

let pool: pg.Pool | null = null;

export async function ensureDatabaseExists(): Promise<void> {
  const config = getPgConfig();
  const targetDb = config.database || 'gt_db';

  // Attempt connecting to the target database directly
  try {
    const testPool = new Pool(config);
    const client = await testPool.connect();
    client.release();
    await testPool.end();
    return; // Database exists and connection succeeded
  } catch (err: any) {
    // Error 3D000 means database does not exist
    if (err.code === '3D000') {
      console.log(`[PostgreSQL] La base de datos "${targetDb}" no existe. Creándola automáticamente...`);
      // Connect to default 'postgres' database to create the target database
      const adminConfig = { ...config, database: 'postgres', connectionString: undefined };
      const adminClient = new Client(adminConfig);
      await adminClient.connect();
      await adminClient.query(`CREATE DATABASE "${targetDb}";`);
      await adminClient.end();
      console.log(`[PostgreSQL] Base de datos "${targetDb}" creada exitosamente.`);
    } else {
      // Re-throw any other error (such as auth failed)
      throw err;
    }
  }
}

export async function getPgPool(): Promise<pg.Pool> {
  if (pool) return pool;

  const config = getPgConfig();
  pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Error inesperado en el pool de conexiones:', err.message);
  });

  return pool;
}
