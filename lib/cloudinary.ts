// lib/cloudinary.ts

// Cloudinary configuration
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!
const API_KEY = process.env.CLOUDINARY_API_KEY!
const API_SECRET = process.env.CLOUDINARY_API_SECRET!

// Generate signature for Cloudinary API requests using Web Crypto API
async function generateSignature(params: Record<string, any>, apiSecret: string): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')

  const encoder = new TextEncoder()
  const data = encoder.encode(sortedParams + apiSecret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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
  const params = {
    timestamp,
    folder: 'bridgementor/chat_files',
  }

  const signature = await generateSignature(params, API_SECRET)

  const formData = new FormData()
  formData.append('file', new Blob([buffer]), filename)
  formData.append('timestamp', timestamp.toString())
  formData.append('folder', 'bridgementor/chat_files')
  formData.append('api_key', API_KEY)
  formData.append('signature', signature)

  // Determine upload type based on mime type
  const uploadType = mimeType.startsWith('image/') ? 'image' : 'raw'
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${uploadType}/upload`

  const response = await fetch(uploadUrl, {
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

export async function deleteFromCloudinary(publicId: string) {
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

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
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
    console.error(`Error deleting from Cloudinary (publicId: ${publicId}):`, error)
    throw new Error(`Cloudinary deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}