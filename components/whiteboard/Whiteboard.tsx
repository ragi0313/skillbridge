"use client"

import type React from "react"
import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import Logo from "@/components/ui/logo"
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
  MousePointer,
  X,
} from "lucide-react"

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
  text?: string // For text tool
}

interface DrawingAction {
  type: "draw" | "erase" | "clear"
  path?: DrawingPath
  timestamp: number
  userId: string
}

type DrawingTool = "pen" | "eraser" | "rectangle" | "circle" | "line" | "text" | "select"

const COLORS = [
  "#000000", // Black
  "#FFFFFF", // White
  "#FF0000", // Red
  "#00FF00", // Lime
  "#0000FF", // Blue
  "#FFFF00", // Yellow
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#800000", // Maroon
  "#008000", // Green
  "#000080", // Navy
  "#808000", // Olive
  "#800080", // Purple
  "#008080", // Teal
  "#C0C0C0", // Silver
  "#808080", // Gray
  "#FFA500", // Orange
  "#FFC0CB", // Pink
  "#A52A2A", // Brown
  "#DDA0DD", // Plum
]

const STROKE_WIDTHS = [2, 4, 6, 8, 12]

export function Whiteboard({ sessionId, userRole, currentUser, isVisible, onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<DrawingTool>("pen")
  const [currentColor, setCurrentColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [showColorPalette, setShowColorPalette] = useState(false)
  const [showStrokeWidthPicker, setShowStrokeWidthPicker] = useState(false)

  // Drawing state
  const [paths, setPaths] = useState<DrawingPath[]>([])
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null)
  const [undoStack, setUndoStack] = useState<DrawingPath[][]>([])
  const [redoStack, setRedoStack] = useState<DrawingPath[][]>([])

  // Shape drawing state
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [previewPath, setPreviewPath] = useState<DrawingPath | null>(null)

  // Text tool state
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null)
  const [textValue, setTextValue] = useState("")

  // Real-time sync
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncTime = useRef<number>(0)

  const userId = `${userRole}-${currentUser.firstName} ${currentUser.lastName}`

  // Initialize canvas
  useEffect(() => {
    if (!isVisible) return

    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio

    context.scale(window.devicePixelRatio, window.devicePixelRatio)
    context.lineCap = "round"
    context.lineJoin = "round"

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
      console.error("[WHITEBOARD] Failed to load whiteboard data:", error)
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
          setPaths((prevPaths) => {
            const updatedPaths = [...prevPaths]
            newPaths.forEach((newPath: DrawingPath) => {
              const existingIndex = updatedPaths.findIndex((p) => p.id === newPath.id)
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
      console.error("[WHITEBOARD] Failed to sync whiteboard data:", error)
    }
  }, [sessionId])

  // Helper to draw a single path based on tool type
  const drawPath = useCallback((context: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length === 0) return

    context.strokeStyle = path.color
    context.lineWidth = path.strokeWidth
    context.globalCompositeOperation = path.tool === "eraser" ? "destination-out" : "source-over"

    if (path.tool === "pen" || path.tool === "eraser") {
      // Freehand drawing
      if (path.points.length < 2) return
      context.beginPath()
      context.moveTo(path.points[0].x, path.points[0].y)
      for (let i = 1; i < path.points.length; i++) {
        context.lineTo(path.points[i].x, path.points[i].y)
      }
      context.stroke()
    } else if (path.tool === "rectangle") {
      // Rectangle
      if (path.points.length >= 2) {
        const start = path.points[0]
        const end = path.points[path.points.length - 1]
        const width = end.x - start.x
        const height = end.y - start.y
        context.strokeRect(start.x, start.y, width, height)
      }
    } else if (path.tool === "circle") {
      // Circle
      if (path.points.length >= 2) {
        const start = path.points[0]
        const end = path.points[path.points.length - 1]
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
        context.beginPath()
        context.arc(start.x, start.y, radius, 0, 2 * Math.PI)
        context.stroke()
      }
    } else if (path.tool === "line") {
      // Straight line
      if (path.points.length >= 2) {
        const start = path.points[0]
        const end = path.points[path.points.length - 1]
        context.beginPath()
        context.moveTo(start.x, start.y)
        context.lineTo(end.x, end.y)
        context.stroke()
      }
    } else if (path.tool === "text") {
      // Text
      if (path.points.length > 0 && path.text) {
        context.fillStyle = path.color
        context.font = `${path.strokeWidth * 4}px Arial`
        context.globalCompositeOperation = "source-over"
        context.fillText(path.text, path.points[0].x, path.points[0].y)
      }
    }
  }, [])

  // Redraw entire canvas
  const redrawCanvas = useCallback((pathsToRedraw: DrawingPath[], includePreview = false) => {
    const context = contextRef.current
    const canvas = canvasRef.current
    if (!context || !canvas) return

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all paths
    pathsToRedraw.forEach((path) => {
      drawPath(context, path)
    })

    // Draw preview if exists
    if (includePreview && previewPath) {
      drawPath(context, previewPath)
    }

    // Reset composite operation
    context.globalCompositeOperation = "source-over"
  }, [drawPath, previewPath])

  // Save drawing action to API
  const saveDrawingAction = useCallback(
    async (action: DrawingAction) => {
      try {
        await fetch(`/api/sessions/${sessionId}/whiteboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        })
      } catch (error) {
        console.error("[WHITEBOARD] Failed to save drawing action:", error)
      }
    },
    [sessionId],
  )

  // Mouse event handlers
  const startDrawing = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!contextRef.current || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      // Handle text tool - show input dialog
      if (currentTool === "text") {
        setTextPosition({ x, y })
        setTextValue("")
        setShowTextInput(true)
        return
      }

      // Handle select tool - not implemented yet
      if (currentTool === "select") {
        return
      }

      setIsDrawing(true)
      setStartPoint({ x, y })

      const newPath: DrawingPath = {
        id: `${userId}-${Date.now()}`,
        tool: currentTool,
        points: [{ x, y }],
        color: currentColor,
        strokeWidth: strokeWidth,
        timestamp: Date.now(),
        userId: userId,
      }

      setCurrentPath(newPath)

      // For pen and eraser, start drawing immediately
      if (currentTool === "pen" || currentTool === "eraser") {
        const context = contextRef.current
        context.beginPath()
        context.strokeStyle = currentColor
        context.lineWidth = strokeWidth
        context.globalCompositeOperation = currentTool === "eraser" ? "destination-out" : "source-over"
        context.moveTo(x, y)
      }
    },
    [currentTool, currentColor, strokeWidth, userId],
  )

  const draw = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !contextRef.current || !canvasRef.current || !currentPath || !startPoint) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      if (currentTool === "pen" || currentTool === "eraser") {
        // Freehand drawing - add point and draw immediately
        const updatedPath = {
          ...currentPath,
          points: [...currentPath.points, { x, y }],
        }
        setCurrentPath(updatedPath)

        const context = contextRef.current
        context.lineTo(x, y)
        context.stroke()
      } else if (currentTool === "rectangle" || currentTool === "circle" || currentTool === "line") {
        // Shape tools - update preview
        const updatedPath = {
          ...currentPath,
          points: [startPoint, { x, y }],
        }
        setPreviewPath(updatedPath)

        // Redraw canvas with preview
        redrawCanvas(paths, true)
      }
    },
    [isDrawing, currentPath, currentTool, startPoint, paths, redrawCanvas],
  )

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !currentPath) return

    setIsDrawing(false)
    setStartPoint(null)

    // For shapes, use the preview path if it exists
    const finalPath = previewPath || currentPath
    setPreviewPath(null)

    // Add completed path to paths array
    setPaths((prevPaths) => {
      const newPaths = [...prevPaths, finalPath]
      // Save to history for undo/redo
      setUndoStack((prevUndo) => [...prevUndo, prevPaths])
      setRedoStack([]) // Clear redo stack

      // Redraw without preview
      redrawCanvas(newPaths, false)
      return newPaths
    })

    // Save to API
    saveDrawingAction({
      type: "draw",
      path: finalPath,
      timestamp: Date.now(),
      userId: userId,
    })

    setCurrentPath(null)

    // Reset context
    if (contextRef.current) {
      contextRef.current.globalCompositeOperation = "source-over"
    }
  }, [isDrawing, currentPath, previewPath, saveDrawingAction, userId, redrawCanvas])

  // Tool handlers
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return

    const previousState = undoStack[undoStack.length - 1]
    setUndoStack((prev) => prev.slice(0, -1))
    setRedoStack((prev) => [...prev, paths])
    setPaths(previousState)
    redrawCanvas(previousState)
  }, [undoStack, paths, redrawCanvas])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return

    const nextState = redoStack[redoStack.length - 1]
    setRedoStack((prev) => prev.slice(0, -1))
    setUndoStack((prev) => [...prev, paths])
    setPaths(nextState)
    redrawCanvas(nextState)
  }, [redoStack, paths, redrawCanvas])

  const handleClear = useCallback(async () => {
    setUndoStack((prev) => [...prev, paths])
    setRedoStack([])
    setPaths([])

    if (contextRef.current && canvasRef.current) {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }

    // Save clear action to API
    await saveDrawingAction({
      type: "clear",
      timestamp: Date.now(),
      userId: userId,
    })
  }, [paths, saveDrawingAction, userId])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement("a")
    link.download = `whiteboard-session-${sessionId}.png`
    link.href = canvas.toDataURL()
    link.click()
  }, [sessionId])

  // Handle text input submission
  const handleTextSubmit = useCallback(() => {
    if (!textValue.trim() || !textPosition) return

    const newPath: DrawingPath = {
      id: `${userId}-${Date.now()}`,
      tool: "text",
      points: [textPosition],
      color: currentColor,
      strokeWidth: strokeWidth,
      timestamp: Date.now(),
      userId: userId,
      text: textValue,
    }

    // Add to paths
    setPaths((prevPaths) => {
      const newPaths = [...prevPaths, newPath]
      setUndoStack((prevUndo) => [...prevUndo, prevPaths])
      setRedoStack([])
      redrawCanvas(newPaths, false)
      return newPaths
    })

    // Save to API
    saveDrawingAction({
      type: "draw",
      path: newPath,
      timestamp: Date.now(),
      userId: userId,
    })

    // Close dialog
    setShowTextInput(false)
    setTextValue("")
    setTextPosition(null)
  }, [textValue, textPosition, currentColor, strokeWidth, userId, saveDrawingAction, redrawCanvas])

  if (!isVisible) return null

  return (
    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl flex flex-col z-50 shadow-2xl overflow-hidden">
      {/* Modern Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <Pen className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="pointer-events-none">
              <Logo textColor="text-white" fontSize="text-lg" imageWidth={24} imageHeight={24} />
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-sm font-medium">Live Session</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl p-2 transition-all duration-200"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Modern Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gray-800/30 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* Drawing Tools Group */}
          <div className="flex items-center bg-gray-800/50 rounded-xl p-1 border border-gray-700/30">
            <Button
              onClick={() => setCurrentTool("select")}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                currentTool === "select"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              title="Select"
            >
              <MousePointer className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setCurrentTool("pen")}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                currentTool === "pen"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              title="Pen"
            >
              <Pen className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setCurrentTool("eraser")}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                currentTool === "eraser"
                  ? "bg-red-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              title="Eraser"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>

          {/* Shapes Group */}
          <div className="flex items-center bg-gray-800/50 rounded-xl p-1 border border-gray-700/30">
            <Button
              onClick={() => setCurrentTool("line")}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                currentTool === "line"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              title="Line"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setCurrentTool("rectangle")}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                currentTool === "rectangle"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              title="Rectangle"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setCurrentTool("circle")}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                currentTool === "circle"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              title="Circle"
            >
              <Circle className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setCurrentTool("text")}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                currentTool === "text"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              title="Text"
            >
              <Type className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-600" />

          {/* Modern Color Picker */}
          <div className="relative">
            <Button
              onClick={() => setShowColorPalette(!showColorPalette)}
              className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-2.5 flex items-center space-x-3 hover:bg-gray-700/50 transition-all duration-200"
              title="Color Palette"
            >
              <Palette className="h-4 w-4 text-gray-300" />
              <div
                className="w-6 h-6 rounded-lg border-2 border-gray-600/50 shadow-sm"
                style={{ backgroundColor: currentColor }}
              />
            </Button>
            {showColorPalette && (
              <div className="absolute top-12 left-0 bg-white border border-gray-300 rounded-xl p-4 shadow-2xl z-10 min-w-[280px]">
                <h4 className="text-gray-800 font-medium mb-3 text-sm">Colors</h4>
                <div className="grid grid-cols-10 gap-1 mb-3">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-7 h-7 border transition-all duration-200 hover:scale-110 ${
                        currentColor === color
                          ? "border-2 border-blue-500 ring-2 ring-blue-200 shadow-lg"
                          : "border border-gray-400 hover:border-gray-600"
                      } ${color === "#FFFFFF" ? "border-gray-400" : ""}`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setCurrentColor(color)
                        setShowColorPalette(false)
                      }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 border border-gray-400 rounded" style={{ backgroundColor: currentColor }} />
                    <span className="text-xs text-gray-600 font-mono">{currentColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modern Stroke Width */}
          <div className="relative">
            <Button
              onClick={() => setShowStrokeWidthPicker(!showStrokeWidthPicker)}
              className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-2.5 flex items-center space-x-3 hover:bg-gray-700/50 transition-all duration-200 min-w-[80px]"
              title="Brush Size"
            >
              <div
                className="rounded-full bg-gray-300 shadow-sm"
                style={{ width: `${Math.min(strokeWidth + 2, 14)}px`, height: `${Math.min(strokeWidth + 2, 14)}px` }}
              />
              <span className="text-xs text-gray-300 font-medium">{strokeWidth}px</span>
            </Button>
            {showStrokeWidthPicker && (
              <div className="absolute top-12 left-0 bg-gray-800/95 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4 shadow-2xl z-10">
                <h4 className="text-white font-medium mb-3 text-sm">Brush Size</h4>
                <div className="space-y-3">
                  {STROKE_WIDTHS.map((width) => (
                    <button
                      key={width}
                      className={`flex items-center space-x-4 w-full px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-gray-700/50 ${
                        strokeWidth === width ? "bg-blue-600/20 border border-blue-600/30" : "hover:bg-gray-700/30"
                      }`}
                      onClick={() => {
                        setStrokeWidth(width)
                        setShowStrokeWidthPicker(false)
                      }}
                    >
                      <div
                        className={`rounded-full shadow-sm ${strokeWidth === width ? "bg-blue-400" : "bg-gray-300"}`}
                        style={{ width: `${width + 2}px`, height: `${width + 2}px` }}
                      />
                      <span
                        className={`text-sm font-medium ${strokeWidth === width ? "text-blue-300" : "text-gray-300"}`}
                      >
                        {width}px {width <= 2 ? "(Fine)" : width <= 6 ? "(Medium)" : "(Bold)"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modern Action Buttons */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-gray-800/50 rounded-xl p-1 border border-gray-700/30">
            <Button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                undoStack.length === 0
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                redoStack.length === 0
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={handleClear}
            className="bg-red-600/10 border border-red-600/30 text-red-400 hover:bg-red-600/20 hover:text-red-300 p-2.5 rounded-xl transition-all duration-200"
            title="Clear All"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleDownload}
            className="bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/50 p-2.5 rounded-xl transition-all duration-200"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modern Canvas */}
      <div className="flex-1 p-6 min-h-0">
        <div className="relative w-full h-full">
          <canvas
            ref={canvasRef}
            className="w-full h-full bg-white rounded-2xl border-2 border-gray-300 shadow-xl cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />

          {/* Canvas Overlay Info */}
          <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-sm font-medium flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                currentTool === "pen"
                  ? "bg-blue-400"
                  : currentTool === "eraser"
                    ? "bg-red-400"
                    : currentTool === "select"
                      ? "bg-gray-400"
                      : "bg-purple-400"
              }`}
            />
            <span className="capitalize">{currentTool}</span>
          </div>

          {/* Loading State */}
          {!canvasRef.current && (
            <div className="absolute inset-0 bg-gray-100 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Loading whiteboard...</p>
              </div>
            </div>
          )}

          {/* Text Input Dialog */}
          {showTextInput && textPosition && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl z-10">
              <div className="bg-white p-6 rounded-xl shadow-2xl w-96">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Add Text</h3>
                <input
                  type="text"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTextSubmit()
                    if (e.key === "Escape") {
                      setShowTextInput(false)
                      setTextValue("")
                      setTextPosition(null)
                    }
                  }}
                  placeholder="Enter text..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  autoFocus
                />
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    onClick={() => {
                      setShowTextInput(false)
                      setTextValue("")
                      setTextPosition(null)
                    }}
                    variant="ghost"
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTextSubmit}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Add Text
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
