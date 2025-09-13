import { NextRequest, NextResponse } from "next/server"
import { ChatFileCleanupService } from "@/lib/services/ChatFileCleanupService"
import { validateCronAuth, cronRateLimiter, createCronResponse } from '@/lib/middleware/rate-limit-cron'

export async function GET(request: NextRequest) {
  try {
    // Validate authentication and rate limiting
    const authResult = validateCronAuth(request)
    if (!authResult.isValid) {
      const rateLimit = cronRateLimiter.isRateLimited(request)
      return new Response(JSON.stringify({ 
        error: authResult.error,
        timestamp: new Date().toISOString()
      }), { 
        status: 401,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetTime / 1000))
        }
      })
    }

    console.log("🚀 Starting scheduled chat file cleanup...")

    // Run cleanup for orphaned files and old files (30+ days)
    const orphanedResult = await ChatFileCleanupService.cleanupOrphanedAttachments()
    const oldResult = await ChatFileCleanupService.cleanupOldAttachments(30)

    const totalDeleted = orphanedResult.deletedCount + oldResult.deletedCount
    const totalErrors = [...orphanedResult.errors, ...oldResult.errors]

    console.log(`✅ Scheduled cleanup completed. Deleted ${totalDeleted} files, ${totalErrors.length} errors`)

    const rateLimit = cronRateLimiter.isRateLimited(request)
    return createCronResponse({
      success: true,
      totalDeleted,
      orphanedDeleted: orphanedResult.deletedCount,
      oldFilesDeleted: oldResult.deletedCount,
      errors: totalErrors,
      timestamp: new Date().toISOString(),
    }, rateLimit)

  } catch (error) {
    console.error("❌ Scheduled chat file cleanup failed:", error)
    return NextResponse.json(
      { 
        error: "Cleanup failed", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Support both GET and POST for flexibility with cron services
  return GET(request)
}