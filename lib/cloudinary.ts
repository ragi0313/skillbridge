// lib/cloudinary.ts

// Cloudinary configuration
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!
const API_KEY = process.env.CLOUDINARY_API_KEY!
const API_SECRET = process.env.CLOUDINARY_API_SECRET!

// Generate signature for Cloudinary API requests using Web Crypto API (SHA-1)
async function generateSignature(params: Record<string, any>, apiSecret: string): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')

  const stringToSign = sortedParams + apiSecret
  console.log('[Cloudinary] String to sign:', stringToSign)

  const encoder = new TextEncoder()
  const data = encoder.encode(stringToSign)
  // Cloudinary uses SHA-1, not SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  console.log('[Cloudinary] Generated signature:', signature)
  return signature
}

export async function uploadToCloudinary(buffer: Buffer, filename: string): Promise<{secure_url: string, public_id: string}> {
  const timestamp = Math.round(Date.now() / 1000)
  const params = {
    timestamp,
    folder: 'bridgementor/profile_pictures',
  }

  const signature = await generateSignature(params, API_SECRET)

  const formData = new FormData()
  formData.append('file', new Blob([buffer]), filename)
  formData.append('timestamp', timestamp.toString())
  formData.append('folder', 'bridgementor/profile_pictures')
  formData.append('api_key', API_KEY)
  formData.append('signature', signature)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  }
}

export async function uploadFileToCloudinary(buffer: Buffer, filename: string, mimeType: string): Promise<{secure_url: string, public_id: string}> {
  const timestamp = Math.round(Date.now() / 1000)

  // Determine upload type based on mime type
  const uploadType = mimeType.startsWith('image/') ? 'image' : 'raw'

  // Signature params - only include folder and timestamp
  // Do NOT include resource_type as it's defined by the endpoint URL
  const params: Record<string, any> = {
    timestamp,
    folder: 'bridgementor/chat_files',
  }

  // For raw files, add access_mode to make them publicly accessible
  if (uploadType === 'raw') {
    params.access_mode = 'public'
  }

  const signature = await generateSignature(params, API_SECRET)

  const formData = new FormData()
  formData.append('file', new Blob([buffer]), filename)
  formData.append('timestamp', timestamp.toString())
  formData.append('folder', 'bridgementor/chat_files')
  formData.append('api_key', API_KEY)
  formData.append('signature', signature)

  // For raw files, set access_mode to public
  if (uploadType === 'raw') {
    formData.append('access_mode', 'public')
  }

  // Use the specific endpoint URL which includes the resource type in the path
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${uploadType}/upload`

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Cloudinary upload error:', errorText)
    throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log('Cloudinary upload result:', { secure_url: result.secure_url, public_id: result.public_id, resource_type: result.resource_type })

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  }
}

export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'raw' | 'video' = 'image') {
  if (!publicId) {
    throw new Error("Public ID is required for Cloudinary deletion")
  }

  try {
    const timestamp = Math.round(Date.now() / 1000)
    const params = {
      public_id: publicId,
      timestamp,
    }

    const signature = await generateSignature(params, API_SECRET)

    const formData = new FormData()
    formData.append('public_id', publicId)
    formData.append('timestamp', timestamp.toString())
    formData.append('api_key', API_KEY)
    formData.append('signature', signature)

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Cloudinary deletion failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    if (result.result === "ok" || result.result === "not found") {
      return result
    } else {
      throw new Error(`Cloudinary deletion failed with result: ${result.result}`)
    }
  } catch (error) {
    console.error(`Error deleting from Cloudinary (publicId: ${publicId}, resourceType: ${resourceType}):`, error)
    throw new Error(`Cloudinary deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Helper function to extract public_id from Cloudinary URL
export function extractPublicIdFromUrl(url: string): { publicId: string, resourceType: 'image' | 'raw' | 'video' } | null {
  try {
    // Example URL: https://res.cloudinary.com/djab76hjr/raw/upload/v1760352500/bridgementor/chat_files/hc0yy75n22ifin1cjait.pdf
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')

    // Find resource type (image, raw, video)
    const resourceTypeIndex = pathParts.findIndex(part => ['image', 'raw', 'video'].includes(part))
    if (resourceTypeIndex === -1) return null

    const resourceType = pathParts[resourceTypeIndex] as 'image' | 'raw' | 'video'

    // Find 'upload' or 'private' index
    const uploadIndex = pathParts.findIndex(part => part === 'upload' || part === 'private')
    if (uploadIndex === -1) return null

    // Get all parts after version (skip the version number like v1760352500)
    const versionIndex = uploadIndex + 1
    const publicIdParts = pathParts.slice(versionIndex + 1) // Skip version

    // Join to get public_id
    const publicIdWithExtension = publicIdParts.join('/')

    // For raw files, keep the extension as it's part of the public_id
    // For images/videos, remove the extension
    const publicId = resourceType === 'raw'
      ? publicIdWithExtension
      : publicIdWithExtension.replace(/\.[^.]+$/, '')

    return { publicId, resourceType }
  } catch (error) {
    console.error('Error extracting public_id from URL:', url, error)
    return null
  }
}

// Generate a signed URL for downloading raw files from Cloudinary
export async function generateSignedDownloadUrl(publicId: string): Promise<string> {
  const timestamp = Math.round(Date.now() / 1000) + 3600 // Valid for 1 hour

  // Create signature for download
  const params = {
    timestamp,
    public_id: publicId,
  }

  const signature = await generateSignature(params, API_SECRET)

  // Build the signed URL for raw files
  const signedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/s--${signature}--/fl_attachment/${publicId}`

  return signedUrl
}