import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatMessages, chatAttachments, bookingSessions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  // Documents
  'application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip', 'application/x-rar-compressed',
  // Code files
  'text/javascript', 'text/typescript', 'text/html', 'text/css', 'application/json',
]

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)

    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Verify user has access to this session
    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, sessionId))

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // TODO: Add proper access control based on learner/mentor relationship

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: "File type not allowed. Supported types: images, documents, archives, and code files" 
      }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat', sessionId.toString())
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${sanitizedFileName}`
    const filePath = join(uploadDir, fileName)

    // Save file
    await writeFile(filePath, buffer)

    // Generate public URL
    const fileUrl = `/uploads/chat/${sessionId}/${fileName}`

    // Create chat message for file attachment
    const [newMessage] = await db
      .insert(chatMessages)
      .values({
        sessionId,
        userId: session.id,
        message: `Shared file: ${file.name}`,
        messageType: 'file',
      })
      .returning({
        id: chatMessages.id,
        message: chatMessages.message,
        messageType: chatMessages.messageType,
        createdAt: chatMessages.createdAt,
      })

    // Create attachment record
    const [attachment] = await db
      .insert(chatAttachments)
      .values({
        messageId: newMessage.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl,
        uploadedBy: session.id,
      })
      .returning()

    return NextResponse.json({
      success: true,
      message: newMessage,
      attachment,
    })

  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}