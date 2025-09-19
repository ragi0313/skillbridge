import { db } from "@/db"
import { sql } from "drizzle-orm"
import fs from 'fs'
import path from 'path'

interface Migration {
  id: string
  name: string
  description: string
  up: () => Promise<void>
  down: () => Promise<void>
  appliedAt?: Date
}

interface MigrationRecord {
  id: string
  name: string
  description: string
  applied_at: Date
  checksum: string
}

class MigrationManager {
  private migrationsPath: string
  private migrations: Migration[] = []

  constructor(migrationsPath = 'db/migrations') {
    this.migrationsPath = path.resolve(process.cwd(), migrationsPath)
  }

  // Ensure migrations table exists
  private async ensureMigrationsTable() {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL
      )
    `)
  }

  // Generate checksum for migration content
  private generateChecksum(content: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  // Load migrations from file system
  private async loadMigrations() {
    try {
      // Create migrations directory if it doesn't exist
      if (!fs.existsSync(this.migrationsPath)) {
        fs.mkdirSync(this.migrationsPath, { recursive: true })
        console.log(`Created migrations directory: ${this.migrationsPath}`)
      }

      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql') || file.endsWith('.ts') || file.endsWith('.js'))
        .sort()

      for (const file of files) {
        const filePath = path.join(this.migrationsPath, file)
        const migration = await this.loadMigration(filePath)
        if (migration) {
          this.migrations.push(migration)
        }
      }
    } catch (error) {
      console.error('Error loading migrations:', error)
    }
  }

  // Load individual migration file
  private async loadMigration(filePath: string): Promise<Migration | null> {
    const fileName = path.basename(filePath)
    const [timestamp, ...nameParts] = fileName.replace(/\.(sql|ts|js)$/, '').split('_')
    const name = nameParts.join('_')

    try {
      if (filePath.endsWith('.sql')) {
        // Handle SQL migration files
        const content = fs.readFileSync(filePath, 'utf8')
        const upSql = this.extractUpMigration(content)
        const downSql = this.extractDownMigration(content)

        return {
          id: timestamp,
          name,
          description: `SQL migration: ${name}`,
          up: async () => {
            if (upSql) {
              await db.execute(sql.raw(upSql))
            }
          },
          down: async () => {
            if (downSql) {
              await db.execute(sql.raw(downSql))
            } else {
              throw new Error(`No down migration found for ${fileName}`)
            }
          }
        }
      } else {
        // Handle TypeScript/JavaScript migration files
        const migration = require(filePath)

        if (!migration.up || !migration.down) {
          throw new Error(`Migration ${fileName} must export 'up' and 'down' functions`)
        }

        return {
          id: timestamp,
          name,
          description: migration.description || `Migration: ${name}`,
          up: migration.up,
          down: migration.down
        }
      }
    } catch (error) {
      console.error(`Error loading migration ${fileName}:`, error)
      return null
    }
  }

  // Extract UP migration from SQL file
  private extractUpMigration(content: string): string | null {
    const upMatch = content.match(/-- UP\s*\n([\s\S]*?)(?=-- DOWN|$)/i)
    return upMatch ? upMatch[1].trim() : content.trim()
  }

  // Extract DOWN migration from SQL file
  private extractDownMigration(content: string): string | null {
    const downMatch = content.match(/-- DOWN\s*\n([\s\S]*?)$/i)
    return downMatch ? downMatch[1].trim() : null
  }

  // Get applied migrations
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, name, description, applied_at, checksum
        FROM migrations
        ORDER BY applied_at
      `)
      return result.rows as MigrationRecord[]
    } catch (error) {
      // If table doesn't exist, return empty array
      return []
    }
  }

  // Record migration as applied
  private async recordMigration(migration: Migration, checksum: string) {
    await db.execute(sql`
      INSERT INTO migrations (id, name, description, checksum)
      VALUES (${migration.id}, ${migration.name}, ${migration.description}, ${checksum})
    `)
  }

  // Remove migration record
  private async removeMigrationRecord(migrationId: string) {
    await db.execute(sql`
      DELETE FROM migrations WHERE id = ${migrationId}
    `)
  }

  // Run pending migrations
  async migrate(): Promise<void> {
    console.log('Starting database migration...')

    await this.ensureMigrationsTable()
    await this.loadMigrations()

    const appliedMigrations = await this.getAppliedMigrations()
    const appliedIds = new Set(appliedMigrations.map(m => m.id))

    const pendingMigrations = this.migrations.filter(m => !appliedIds.has(m.id))

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations.')
      return
    }

    console.log(`Found ${pendingMigrations.length} pending migrations:`)
    pendingMigrations.forEach(m => console.log(`  - ${m.id}: ${m.name}`))

    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration: ${migration.id} - ${migration.name}`)

        // Run migration in transaction
        await db.transaction(async (tx) => {
          // Apply the migration
          await migration.up()

          // Record as applied
          const checksum = this.generateChecksum(migration.id + migration.name)
          await this.recordMigration(migration, checksum)
        })

        console.log(`✅ Migration ${migration.id} applied successfully`)
      } catch (error) {
        console.error(`❌ Failed to apply migration ${migration.id}:`, error)
        throw error
      }
    }

    console.log('Database migration completed successfully!')
  }

  // Rollback last migration
  async rollback(): Promise<void> {
    console.log('Rolling back last migration...')

    await this.ensureMigrationsTable()
    await this.loadMigrations()

    const appliedMigrations = await this.getAppliedMigrations()

    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback.')
      return
    }

    const lastMigration = appliedMigrations[appliedMigrations.length - 1]
    const migration = this.migrations.find(m => m.id === lastMigration.id)

    if (!migration) {
      throw new Error(`Migration ${lastMigration.id} not found in migration files`)
    }

    try {
      console.log(`Rolling back migration: ${migration.id} - ${migration.name}`)

      // Run rollback in transaction
      await db.transaction(async (tx) => {
        // Apply the rollback
        await migration.down()

        // Remove from migrations table
        await this.removeMigrationRecord(migration.id)
      })

      console.log(`✅ Migration ${migration.id} rolled back successfully`)
    } catch (error) {
      console.error(`❌ Failed to rollback migration ${migration.id}:`, error)
      throw error
    }
  }

  // Get migration status
  async status(): Promise<void> {
    await this.ensureMigrationsTable()
    await this.loadMigrations()

    const appliedMigrations = await this.getAppliedMigrations()
    const appliedIds = new Set(appliedMigrations.map(m => m.id))

    console.log('\nMigration Status:')
    console.log('================')

    if (this.migrations.length === 0) {
      console.log('No migration files found.')
      return
    }

    this.migrations.forEach(migration => {
      const status = appliedIds.has(migration.id) ? '✅ Applied' : '⏳ Pending'
      const appliedMigration = appliedMigrations.find(m => m.id === migration.id)
      const appliedAt = appliedMigration ? ` (${appliedMigration.applied_at.toISOString()})` : ''

      console.log(`${status} ${migration.id}: ${migration.name}${appliedAt}`)
    })

    const pendingCount = this.migrations.filter(m => !appliedIds.has(m.id)).length
    console.log(`\nTotal: ${this.migrations.length} migrations, ${pendingCount} pending`)
  }

  // Create new migration file
  async createMigration(name: string, type: 'sql' | 'ts' = 'sql'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
    const fileName = `${timestamp}_${name}.${type}`
    const filePath = path.join(this.migrationsPath, fileName)

    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(this.migrationsPath)) {
      fs.mkdirSync(this.migrationsPath, { recursive: true })
    }

    let content: string

    if (type === 'sql') {
      content = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- UP
-- Add your migration SQL here


-- DOWN
-- Add your rollback SQL here

`
    } else {
      content = `// Migration: ${name}
// Created: ${new Date().toISOString()}

import { db } from "@/db"
import { sql } from "drizzle-orm"

export const description = "${name}"

export async function up() {
  // Add your migration logic here
  // Example:
  // await db.execute(sql\`CREATE TABLE example (id SERIAL PRIMARY KEY)\`)
}

export async function down() {
  // Add your rollback logic here
  // Example:
  // await db.execute(sql\`DROP TABLE example\`)
}
`
    }

    fs.writeFileSync(filePath, content)
    console.log(`Created migration file: ${fileName}`)

    return filePath
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager()

// CLI-like functions for easy use
export const migrate = () => migrationManager.migrate()
export const rollback = () => migrationManager.rollback()
export const migrationStatus = () => migrationManager.status()
export const createMigration = (name: string, type: 'sql' | 'ts' = 'sql') =>
  migrationManager.createMigration(name, type)