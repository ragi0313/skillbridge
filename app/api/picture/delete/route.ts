import { NextResponse } from "next/server"
import { deleteFromCloudinary } from "@/lib/cloudinary"


export async function POST(req: Request) {
  try {
    const { publicId } = await req.json()
    if (!publicId) {
      return NextResponse.json({ error: "Missing publicId" }, { status: 400 })
    }

    await deleteFromCloudinary(publicId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cloudinary deletion error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
