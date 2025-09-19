import { NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

// Simple health check for load balancers and uptime monitoring
// This endpoint performs minimal checks for fast response times
export async function GET() {
  try {
    // Quick database connectivity test
    await db.execute(sql`SELECT 1`)

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      timestamp: new Date().toISOString()
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  }
}

// Support HEAD requests for even faster health checks
export async function HEAD() {
  try {
    await db.execute(sql`SELECT 1`)
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}