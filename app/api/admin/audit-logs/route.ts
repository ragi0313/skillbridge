import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { auditLogs, users } from "@/db/schema"
import { desc, like, and, gte, sql, eq } from "drizzle-orm"
import { logAdminAction, getClientIpAddress, AUDIT_ACTIONS, ENTITY_TYPES } from "@/lib/admin/audit-log"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = 20
    const offset = (page - 1) * limit

    const search = searchParams.get("search") || ""
    const action = searchParams.get("action") || "all"
    const severity = searchParams.get("severity") || "all"
    const days = parseInt(searchParams.get("days") || "7")
    const isExport = searchParams.get("export") === "true"

    // Build filters
    const filters = []

    if (search) {
      const searchPattern = `%${search}%`
      filters.push(
        sql`(${auditLogs.description} ILIKE ${searchPattern} OR ${auditLogs.details} ILIKE ${searchPattern} OR ${auditLogs.ipAddress} ILIKE ${searchPattern})`
      )
    }

    if (action !== "all") {
      filters.push(eq(auditLogs.action, action))
    }

    if (severity !== "all") {
      filters.push(eq(auditLogs.severity, severity))
    }

    // Date filter
    const dateFilter = gte(
      auditLogs.createdAt,
      new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    )
    filters.push(dateFilter)

    const whereClause = filters.length > 0 ? and(...filters) : undefined

    if (isExport) {
      // Export CSV
      const allLogs = await db
        .select({
          id: auditLogs.id,
          adminName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          description: auditLogs.description,
          severity: auditLogs.severity,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.adminId, users.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))

      // Convert to CSV
      const csvHeaders = ["ID", "Admin", "Action", "Entity Type", "Entity ID", "Description", "Severity", "IP Address", "Date"]
      const csvRows = allLogs.map(log => [
        log.id,
        log.adminName || "Unknown",
        log.action,
        log.entityType,
        log.entityId || "",
        `"${(log.description || '').replace(/"/g, '""')}"`, // Escape quotes
        log.severity,
        log.ipAddress || "",
        log.createdAt ? new Date(log.createdAt).toISOString() : "",
      ])

      const csvContent = [csvHeaders, ...csvRows].map(row => row.join(",")).join("\n")

      // Log the export action
      const ipAddress = getClientIpAddress(req)
      await logAdminAction({
        adminId: session.id,
        action: AUDIT_ACTIONS.EXPORT_DATA,
        entityType: ENTITY_TYPES.ADMIN,
        description: `Exported ${allLogs.length} audit log entries to CSV`,
        metadata: { count: allLogs.length, filters: { action, severity, days, search } },
        severity: "info",
        ipAddress,
      })

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Get paginated results
    const [logsResult, countResult] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          adminId: auditLogs.adminId,
          adminName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          description: auditLogs.description,
          details: auditLogs.details,
          metadata: auditLogs.metadata,
          severity: auditLogs.severity,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.adminId, users.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(whereClause)
    ])

    const totalCount = countResult[0]?.count || 0
    const totalPages = Math.ceil(totalCount / limit)

    // Note: We don't log VIEW_AUDIT_LOG to avoid recursive logging and log bloat

    // Format the response to handle null values properly
    const formattedLogs = logsResult.map(log => ({
      ...log,
      adminName: log.adminName || "Unknown Admin",
      description: log.description || log.details || "No description available",
      createdAt: log.createdAt ? log.createdAt.toISOString() : null,
    }))

    return NextResponse.json({
      logs: formattedLogs,
      currentPage: page,
      totalPages,
      totalCount,
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}