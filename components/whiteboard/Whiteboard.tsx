"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Pen, 
  Eraser, 
  Square, 
  Circle, 
  Type, 
  Undo, 
  Redo, 
  Trash2, 
  Download,
  Palette,
  Minus,
  MousePointer
} from 'lucide-react'

interface WhiteboardProps {
  sessionId: string
  userRole: "learner" | "mentor"
  currentUser: {
    firstName: string
    lastName: string
  }
  isVisible: boolean
  onClose?: () => void
}

interface DrawingPath {
  id: string
  tool: DrawingTool
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

type DrawingTool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text' | 'select'

const COLORS = [
  '#000000', // Black
  '#FF0000', // Red  
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#FFFFFF'  // White
]

const STROKE_WIDTHS = [2, 4, 6, 8, 12]

export function Whiteboard({ sessionId, userRole, currentUser, isVisible, onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen')
  const [currentColor, setCurrentColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [showColorPalette, setShowColorPalette] = useState(false)
  const [showStrokeWidthPicker, setShowStrokeWidthPicker] = useState(false)
  
  // Drawing state
  const [paths, setPaths] = useState<DrawingPath[]>([])
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null)
  const [undoStack, setUndoStack] = useState<DrawingPath[][]>([])
  const [redoStack, setRedoStack] = useState<DrawingPath[][]>([])
  
  // Real-time sync
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncTime = useRef<number>(0)
  
  const userId = `${userRole}-${currentUser.firstName} ${currentUser.lastName}`

  // Initialize canvas
  useEffect(() => {
    if (!isVisible) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    
    context.scale(window.devicePixelRatio, window.devicePixelRatio)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    
    contextRef.current = context
    
    // Load existing drawings
    loadWhiteboardData()
    
    // Start sync interval
    syncIntervalRef.current = setInterval(syncWhiteboardData, 2000)
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [isVisible, sessionId])

  // Load whiteboard data from API
  const loadWhiteboardData = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/whiteboard`)
      if (response.ok) {
        const data = await response.json()
        const loadedPaths = data.paths || []
        setPaths(loadedPaths)
        redrawCanvas(loadedPaths)
        lastSyncTime.current = Date.now()
      }
    } catch (error) {
      console.error('[WHITEBOARD] Failed to load whiteboard data:', error)
    }
  }, [sessionId])

  // Sync whiteboard data with other users
  const syncWhiteboardData = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/whiteboard?since=${lastSyncTime.current}`)
      if (response.ok) {
        const data = await response.json()
        const newPaths = data.paths || []
        
        if (newPaths.length > 0) {
          setPaths(prevPaths => {
            const updatedPaths = [...prevPaths]
            newPaths.forEach((newPath: DrawingPath) => {
              const existingIndex = updatedPaths.findIndex(p => p.id === newPath.id)
              if (existingIndex === -1) {
                updatedPaths.push(newPath)
              }
            })
            redrawCanvas(updatedPaths)
            return updatedPaths
          })
          lastSyncTime.current = Date.now()
        }
      }
    } catch (error) {
      console.error('[WHITEBOARD] Failed to sync whiteboard data:', error)
    }
  }, [sessionId])

  // Redraw entire canvas
  const redrawCanvas = useCallback((pathsToRedraw: DrawingPath[]) => {
    const context = contextRef.current
    const canvas = canvasRef.current
    if (!context || !canvas) return

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw all paths
    pathsToRedraw.forEach(path => {
      if (path.points.length < 2) return
      
      context.beginPath()
      context.strokeStyle = path.color
      context.lineWidth = path.strokeWidth
      context.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over'
      
      context.moveTo(path.points[0].x, path.points[0].y)
      path.points.forEach(point => {
        context.lineTo(point.x, point.y)
      })
      context.stroke()
    })
    
    // Reset composite operation
    context.globalCompositeOperation = 'source-over'
  }, [])

  // Save drawing action to API
  const saveDrawingAction = useCallback(async (action: DrawingAction) => {
    try {
      await fetch(`/api/sessions/${sessionId}/whiteboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      })
    } catch (error) {
      console.error('[WHITEBOARD] Failed to save drawing action:', error)
    }
  }, [sessionId])

  // Mouse event handlers
  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!contextRef.current || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    setIsDrawing(true)
    
    const newPath: DrawingPath = {
      id: `${userId}-${Date.now()}`,
      tool: currentTool,
      points: [{ x, y }],
      color: currentColor,
      strokeWidth: strokeWidth,
      timestamp: Date.now(),
      userId: userId
    }
    
    setCurrentPath(newPath)
    
    // Start drawing
    const context = contextRef.current
    context.beginPath()
    context.strokeStyle = currentColor
    context.lineWidth = strokeWidth
    context.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over'
    context.moveTo(x, y)
  }, [currentTool, currentColor, strokeWidth, userId])

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current || !currentPath) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Add point to current path
    const updatedPath = {
      ...currentPath,
      points: [...currentPath.points, { x, y }]
    }
    setCurrentPath(updatedPath)
    
    // Draw line
    const context = contextRef.current
    context.lineTo(x, y)
    context.stroke()
  }, [isDrawing, currentPath])

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !currentPath) return
    
    setIsDrawing(false)
    
    // Add completed path to paths array
    setPaths(prevPaths => {
      const newPaths = [...prevPaths, currentPath]
      // Save to history for undo/redo
      setUndoStack(prevUndo => [...prevUndo, prevPaths])
      setRedoStack([]) // Clear redo stack
      return newPaths
    })
    
    // Save to API
    saveDrawingAction({
      type: 'draw',
      path: currentPath,
      timestamp: Date.now(),
      userId: userId
    })
    
    setCurrentPath(null)
    
    // Reset context
    if (contextRef.current) {
      contextRef.current.globalCompositeOperation = 'source-over'
    }
  }, [isDrawing, currentPath, saveDrawingAction, userId])

  // Tool handlers
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    
    const previousState = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, paths])
    setPaths(previousState)
    redrawCanvas(previousState)
  }, [undoStack, paths, redrawCanvas])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    
    const nextState = redoStack[redoStack.length - 1]
    setRedoStack(prev => prev.slice(0, -1))
    setUndoStack(prev => [...prev, paths])
    setPaths(nextState)
    redrawCanvas(nextState)
  }, [redoStack, paths, redrawCanvas])

  const handleClear = useCallback(async () => {
    setUndoStack(prev => [...prev, paths])
    setRedoStack([])
    setPaths([])
    
    if (contextRef.current && canvasRef.current) {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    
    // Save clear action to API
    await saveDrawingAction({
      type: 'clear',
      timestamp: Date.now(),
      userId: userId
    })
  }, [paths, saveDrawingAction, userId])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const link = document.createElement('a')
    link.download = `whiteboard-session-${sessionId}.png`
    link.href = canvas.toDataURL()
    link.click()
  }, [sessionId])

  if (!isVisible) return null

  return (
    <div className="absolute inset-4 bg-slate-800 border border-slate-700 rounded-lg flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-white">Collaborative Whiteboard</h3>
          <Badge variant="outline" className="text-green-400 border-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Live
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
          ×
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-750">
        <div className="flex items-center space-x-2">
          {/* Drawing Tools */}
          <Button
            variant={currentTool === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('select')}
            className="p-2"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'pen' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('pen')}
            className="p-2"
          >
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'eraser' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('eraser')}
            className="p-2"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('line')}
            className="p-2"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'rectangle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('rectangle')}
            className="p-2"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'circle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('circle')}
            className="p-2"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('text')}
            className="p-2"
          >
            <Type className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 bg-slate-600" />

          {/* Color Picker */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColorPalette(!showColorPalette)}
              className="p-2 flex items-center space-x-2"
            >
              <Palette className="h-4 w-4" />
              <div 
                className="w-4 h-4 rounded border border-slate-400"
                style={{ backgroundColor: currentColor }}
              />
            </Button>
            {showColorPalette && (
              <Card className="absolute top-10 left-0 p-3 bg-slate-800 border-slate-700 z-10">
                <div className="grid grid-cols-5 gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded border-2 ${
                        currentColor === color ? 'border-blue-400' : 'border-slate-500'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setCurrentColor(color)
                        setShowColorPalette(false)
                      }}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Stroke Width */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStrokeWidthPicker(!showStrokeWidthPicker)}
              className="p-2 flex items-center space-x-2"
            >
              <div 
                className="rounded-full bg-current"
                style={{ width: `${Math.min(strokeWidth, 12)}px`, height: `${Math.min(strokeWidth, 12)}px` }}
              />
              <span className="text-xs">{strokeWidth}px</span>
            </Button>
            {showStrokeWidthPicker && (
              <Card className="absolute top-10 left-0 p-3 bg-slate-800 border-slate-700 z-10">
                <div className="space-y-2">
                  {STROKE_WIDTHS.map(width => (
                    <button
                      key={width}
                      className={`flex items-center space-x-3 w-full p-2 rounded hover:bg-slate-700 ${
                        strokeWidth === width ? 'bg-slate-600' : ''
                      }`}
                      onClick={() => {
                        setStrokeWidth(width)
                        setShowStrokeWidthPicker(false)
                      }}
                    >
                      <div 
                        className="rounded-full bg-white"
                        style={{ width: `${width}px`, height: `${width}px` }}
                      />
                      <span className="text-sm text-white">{width}px</span>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Action buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-2"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-2"
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="p-2 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="p-2"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-white rounded border border-slate-600 cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  )
}