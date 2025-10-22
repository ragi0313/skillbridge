import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { isVercelBlobUrl } from "@/lib/vercel-blob"

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get file URL and filename from query params
    const { searchParams } = new URL(req.url)
    const fileUrl = searchParams.get("url")
    const filename = searchParams.get("filename")

    if (!fileUrl || !filename) {
      return NextResponse.json({ error: "Missing file URL or filename" }, { status: 400 })
    }

    // Validate that the URL is from Vercel Blob
    if (!isVercelBlobUrl(fileUrl)) {
      return NextResponse.json({ error: "Invalid file source" }, { status: 400 })
    }

    // For Vercel Blob, we can directly fetch the file
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    })

    if (!response.ok) {
      console.error("Vercel Blob fetch failed:", response.status, response.statusText)
      return NextResponse.json({
        error: "Failed to fetch file from storage",
        details: `Status: ${response.status} ${response.statusText}`
      }, { status: 500 })
    }

    // Get the file data as a blob
    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()

    // Get content type from response or use a default
    const contentType = response.headers.get("content-type") || "application/octet-stream"

    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = filename.replace(/[^\w\s.-]/g, '_')

    // Return the file with proper headers for download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${sanitizedFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("File download error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "File download failed"
    }, { status: 500 })
  }
}
