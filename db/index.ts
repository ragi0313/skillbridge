import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add timeouts to prevent hanging connections
  connectionTimeoutMillis: 10000, // 10 seconds to establish connection
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  statement_timeout: 30000, // 30 seconds statement timeout
})

export const db = drizzle(pool, { schema })
