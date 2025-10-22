// lib/vercel-blob.ts
import { put, del, list } from '@vercel/blob'

/**
 * Upload a file to Vercel Blob storage
 * @param buffer - File buffer
 * @param filename - Original filename
 * @param options - Additional upload options
 * @returns Object with url, downloadUrl, and pathname
 */
export async function uploadToVercelBlob(
  buffer: Buffer,
  filename: string,
  options?: {
    addRandomSuffix?: boolean
    contentType?: string
  }
): Promise<{
  url: string
  downloadUrl: string
  pathname: string
}> {
  try {
    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      addRandomSuffix: options?.addRandomSuffix ?? true,
      contentType: options?.contentType,
    })

    return {
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
    }
  } catch (error) {
    console.error('Vercel Blob upload error:', error)
    throw new Error(`Failed to upload file to Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete a file from Vercel Blob storage
 * @param url - The blob URL to delete
 */
export async function deleteFromVercelBlob(url: string): Promise<void> {
  try {
    await del(url)
    console.log(`[VERCEL_BLOB] Successfully deleted: ${url}`)
  } catch (error) {
    console.error(`[VERCEL_BLOB] Error deleting file:`, error)
    throw new Error(`Failed to delete file from Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * List all blobs in storage (useful for cleanup/debugging)
 * @param prefix - Optional prefix to filter blobs
 */
export async function listVercelBlobs(prefix?: string) {
  try {
    const { blobs } = await list({
      prefix,
    })
    return blobs
  } catch (error) {
    console.error('[VERCEL_BLOB] Error listing blobs:', error)
    throw new Error(`Failed to list blobs: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if a URL is a Vercel Blob URL
 * @param url - URL to check
 */
export function isVercelBlobUrl(url: string): boolean {
  return url.includes('blob.vercel-storage.com') || url.includes('public.blob.vercel-storage.com')
}
