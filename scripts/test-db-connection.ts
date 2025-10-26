/**
 * Simple database connection test
 * Run: npx tsx scripts/test-db-connection.ts
 */

import { db } from '../db'
import { sql } from 'drizzle-orm'

async function testConnection() {
  console.log('🔌 Testing database connection...\n')

  try {
    // Try to execute a simple query
    const result = await db.execute(sql`SELECT 1 as test`)

    console.log('✅ Database connection successful!')
    console.log('   Response:', result)

    // Try to list tables
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 10
    `)

    console.log('\n📋 Tables in database:')
    if (tables.rows && tables.rows.length > 0) {
      tables.rows.forEach((row: any) => {
        console.log(`   - ${row.table_name}`)
      })
    } else {
      console.log('   (No tables found - database might be empty)')
    }

    console.log('\n✅ Connection test passed!')
    process.exit(0)

  } catch (error) {
    console.error('❌ Database connection failed!')
    console.error('\nError details:')
    console.error(error)

    if (error instanceof Error) {
      if (error.message.includes('password')) {
        console.error('\n💡 Tip: Check your DATABASE_URL password in .env file')
        console.error('   - Make sure there are no extra spaces')
        console.error('   - Special characters might need URL encoding')
        console.error('   - Get fresh connection string from Neon dashboard')
      }
    }

    process.exit(1)
  }
}

testConnection()
