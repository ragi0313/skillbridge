import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { userReports } from "@/db/schema"
import { eq } from "drizzle-orm"
import { logAdminAction, getClientIpAddress, AUDIT_ACTIONS, ENTITY_TYPES } from "@/lib/admin/audit-log"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const reportId = parseInt(id)

    const body = await req.json()
    const { action, adminNotes, resolution } = body

    if (!action || !["resolve", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'resolve' or 'dismiss'" },
        { status: 400 }
      )
    }

    // Get the current report
    const [report] = await db
      .select()
      .from(userReports)
      .where(eq(userReports.id, reportId))

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    // Update the report
    const newStatus = action === "resolve" ? "resolved" : "dismissed"
    const [updatedReport] = await db
      .update(userReports)
      .set({
        status: newStatus,
        adminNotes: adminNotes || null,
        resolution: resolution || (action === "dismiss" ? "Report dismissed by admin" : null),
        reviewedBy: session.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userReports.id, reportId))
      .returning()

    // Log the admin action
    const ipAddress = getClientIpAddress(req)
    await logAdminAction({
      adminId: session.id,
      action: action === "resolve" ? AUDIT_ACTIONS.RESOLVE_REPORT : AUDIT_ACTIONS.DISMISS_REPORT,
      entityType: ENTITY_TYPES.REPORT,
      entityId: reportId,
      description: `${action === "resolve" ? "Resolved" : "Dismissed"} user report #${reportId} (${report.category})`,
      metadata: {
        reportId,
        category: report.category,
        action: newStatus,
        adminNotes,
        resolution,
      },
      severity: "info",
      ipAddress,
    })

    return NextResponse.json({
      success: true,
      message: `Report ${action}d successfully`,
      report: updatedReport,
    })
  } catch (error) {
    console.error("Error updating report:", error)
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    )
  }
}
