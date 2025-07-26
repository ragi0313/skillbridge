// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary (make sure this is done)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function deleteFromCloudinary(publicId: string) {
  if (!publicId) {
    throw new Error("Public ID is required for Cloudinary deletion")
  }

  try {
    console.log(`Deleting Cloudinary asset with public ID: ${publicId}`)
    
    const result = await cloudinary.uploader.destroy(publicId)
    
    console.log(`Cloudinary deletion result:`, result)
    if (result.result === "ok" || result.result === "not found") {
      return result
    } else {
      throw new Error(`Cloudinary deletion failed with result: ${result.result}`)
    }
  } catch (error) {
    console.error(`Error deleting from Cloudinary (publicId: ${publicId}):`, error)
    throw new Error(`Cloudinary deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}