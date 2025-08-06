import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import fs from "fs"
import path from "path"

// Disable the built-in body parser
export const config = {
  api: {
    bodyParser: false,
  },
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const buffer = await streamToBuffer(file.stream())

    const tempPath = path.join("C:", "tmp", file.name)
    await fs.promises.writeFile(tempPath, buffer)

    // Remove the public_id to let Cloudinary generate a unique one
    const upload = await cloudinary.uploader.upload(tempPath, {
      folder: "skillbridge/profile_pictures",
      // No public_id specified - Cloudinary will generate a unique one
    })

    // Clean up the temporary file
    await fs.promises.unlink(tempPath)

    return NextResponse.json({
      secure_url: upload.secure_url,
      public_id: upload.public_id,
    })
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    return NextResponse.json({ error: "Cloudinary upload failed" }, { status: 500 })
  }
}