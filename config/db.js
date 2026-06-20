
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.PG_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.setMaxListeners(20);

export const db = drizzle(pool);
export default pool;