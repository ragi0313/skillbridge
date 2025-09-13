import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { nanoid } from "nanoid"

interface BlobResult {
  url: string
  pathname: string
}

export async function putLocalFallback(filename: string, file: File): Promise<BlobResult> {
  if (process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_READ_WRITE_TOKEN.includes('XXXXXXXXXX')) {
    // Use actual Vercel Blob if token is set
    const { put } = await import('@vercel/blob')
    return await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    })
  }
  
  // Fallback to local storage for development
  console.log('⚠️ Using local fallback - set BLOB_READ_WRITE_TOKEN for actual blob storage')
  
  const uploadsDir = join(process.cwd(), 'public', 'temp-uploads', 'chat')
  await mkdir(uploadsDir, { recursive: true })
  
  const buffer = Buffer.from(await file.arrayBuffer())
  const localPath = join(uploadsDir, filename.replace(/\//g, '_'))
  await writeFile(localPath, buffer)
  
  const publicUrl = `/temp-uploads/chat/${filename.replace(/\//g, '_')}`
  
  return {
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${publicUrl}`,
    pathname: filename
  }
}

export async function delLocalFallback(pathname: string): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_READ_WRITE_TOKEN.includes('XXXXXXXXXX')) {
    const { del } = await import('@vercel/blob')
    return await del(pathname)
  }
  
  // Fallback - remove local file
  console.log(`⚠️ Local fallback: Would delete ${pathname}`)
}