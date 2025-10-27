import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { uploadToCloudinary } from "@/lib/cloudinary"
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
    // Check authentication (allow during registration)
    const session = await getSession()
    // Note: We allow uploads without session during registration
    // Rate limiting provides protection against abuse

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 })
    }

    const buffer = await streamToBuffer(file.stream())

    // Upload to Cloudinary using HTTP API
    const upload = await uploadToCloudinary(buffer, file.name)

    return NextResponse.json({
      url: upload.secure_url,
      secure_url: upload.secure_url,
      public_id: upload.public_id,
    })
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    return NextResponse.json({ error: "Cloudinary upload failed" }, { status: 500 })
  }
}

// Apply upload rate limiting
export const POST = withRateLimit('upload', handleUpload)