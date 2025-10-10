import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"

// In-memory whiteboard storage (in production, use a database)
const sessionWhiteboards: Record<string, any[]> = {}

interface DrawingPath {
  id: string
  tool: string
  points: { x: number; y: number }[]
  color: string
  strokeWidth: number
  timestamp: number
  userId: string
}

interface DrawingAction {
  type: 'draw' | 'erase' | 'clear'
  path?: DrawingPath
  timestamp: number
  userId: string
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const url = new URL(request.url)
    const since = parseInt(url.searchParams.get('since') || '0')
    
    const paths = sessionWhiteboards[id] || []
    
    // Filter paths to only return those newer than 'since' timestamp
    const filteredPaths = since > 0
      ? paths.filter((path: DrawingPath) => path.timestamp > since)
      : paths

    return NextResponse.json({ paths: filteredPaths })
  } catch (error) {
    console.error("[WHITEBOARD_API] Error fetching whiteboard data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json() as DrawingAction
    const { type, path, timestamp, userId } = body

    if (!sessionWhiteboards[id]) {
      sessionWhiteboards[id] = []
    }

    if (type === 'clear') {
      // Clear all paths
      sessionWhiteboards[id] = []
      } else if (type === 'draw' && path) {
      // Add new drawing path
      sessionWhiteboards[id].push(path)
      } else if (type === 'erase' && path) {
      // Handle eraser - in this simple implementation, we'll treat it like drawing
      sessionWhiteboards[id].push(path)
      }
    
    return NextResponse.json({ success: true, timestamp: Date.now() })
  } catch (error) {
    console.error("[WHITEBOARD_API] Error posting whiteboard action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    
    // Clear whiteboard data for this session
    if (sessionWhiteboards[id]) {
      delete sessionWhiteboards[id]
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[WHITEBOARD_API] Error deleting whiteboard data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
