import { NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export async function POST(req: Request) {
  try {
    const { publicId } = await req.json()

    if (!publicId) {
      return NextResponse.json({ error: "Missing publicId" }, { status: 400 })
    }

    const result = await cloudinary.uploader.destroy(publicId)

    if (result.result !== "ok") {
      return NextResponse.json({ error: "Cloudinary deletion failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cloudinary deletion error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
