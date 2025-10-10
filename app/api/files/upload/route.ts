import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { uploadFileToCloudinary } from "@/lib/cloudinary"
import { getSession } from "@/lib/auth/getSession"

// Helper to convert ReadableStream to Node Readable
async function streamToBuffer(readableStream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = readableStream.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }

  return Buffer.concat(chunks)
}

async function handleUpload(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized - Please login to upload files" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file size (5MB limit for chat files - reduced from 10MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 })
    }

    // Validate file type - allow common file types
    const allowedTypes = [
      'image/', 'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/zip', 'application/x-zip-compressed'
    ]

    const isAllowed = allowedTypes.some(type => file.type.startsWith(type))
    if (!isAllowed) {
      return NextResponse.json({
        error: "File type not supported. Allowed: images, PDF, DOC, DOCX, TXT, ZIP"
      }, { status: 400 })
    }

    const buffer = await streamToBuffer(file.stream())

    // Upload to Cloudinary
    const upload = await uploadFileToCloudinary(buffer, file.name, file.type)

    return NextResponse.json({
      url: upload.secure_url,
      secure_url: upload.secure_url,
      public_id: upload.public_id,
      filename: file.name,
    })
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "File upload failed"
    }, { status: 500 })
  }
}

// Apply upload rate limiting
export const POST = withRateLimit('upload', handleUpload)
