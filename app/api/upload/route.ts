import { NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import { IncomingForm } from "formidable"
import path from "path"

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

export async function POST(req: Request) {
  const form = new IncomingForm({ multiples: false })

  return new Promise((resolve) => {
    form.parse(req as any, async (err, fields, files) => {
      if (err) {
        return resolve(NextResponse.json({ error: "Upload failed" }, { status: 500 }))
      }

      const file = files.file?.[0] || files.file
      if (!file || Array.isArray(file)) {
        return resolve(NextResponse.json({ error: "No file uploaded" }, { status: 400 }))
      }

      try {
        const upload = await cloudinary.uploader.upload(file.filepath, {
          folder: "skillbridge/profile_pictures",
          public_id: path.parse(file.originalFilename!).name,
        })

        return resolve(
          NextResponse.json({
            url: upload.secure_url,
            public_id: upload.public_id,
          })
        )
      } catch (uploadError) {
        return resolve(
          NextResponse.json({ error: "Cloudinary upload failed" }, { status: 500 })
        )
      }
    })
  })
}
