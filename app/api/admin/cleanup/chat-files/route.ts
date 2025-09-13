import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { ChatFileCleanupService } from "@/lib/services/ChatFileCleanupService"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    // Only admin users can run cleanup
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { type = "full", daysOld, daysInactive } = body

    let result

    switch (type) {
      case "orphaned":
        result = await ChatFileCleanupService.cleanupOrphanedAttachments()
        break
      
      case "old":
        result = await ChatFileCleanupService.cleanupOldAttachments(daysOld || 30)
        break
      
      case "inactive":
        result = await ChatFileCleanupService.cleanupInactiveConversationFiles(daysInactive || 90)
        break
      
      case "full":
      default:
        result = await ChatFileCleanupService.runFullCleanup()
        break
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error("Chat file cleanup error:", error)
    return NextResponse.json(
      { 
        error: "Cleanup failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    )
  }
}