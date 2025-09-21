'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { MessageCircle, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  onClose?: () => void
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  isMinimized: boolean
}

/**
 * Specialized error boundary for MiniChatBar component
 * Provides a more compact error UI that fits the mini chat context
 */
export class MiniChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      isMinimized: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
    })

    // Log error for mini chat
    console.error('[MINI_CHAT_ERROR_BOUNDARY] MiniChat error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })

    // Call onError callback
    this.props.onError?.(error, errorInfo)

    // Report to monitoring in production
    if (process.env.NODE_ENV === 'production') {
      this.reportMiniChatError(error, errorInfo)
    }
  }

  private reportMiniChatError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          errorInfo: {
            componentStack: errorInfo.componentStack,
          },
          context: {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            component: 'MiniChatBar',
          },
          category: 'mini_chat_error',
        }),
      })
    } catch (reportingError) {
      console.error('[MINI_CHAT_ERROR_BOUNDARY] Failed to report error:', reportingError)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  private handleMinimize = () => {
    this.setState({ isMinimized: true })
  }

  private handleMaximize = () => {
    this.setState({ isMinimized: false })
  }

  render() {
    if (this.state.hasError) {
      // Minimized error state
      if (this.state.isMinimized) {
        return (
          <div className="fixed bottom-4 right-4 z-50">
            <Button
              onClick={this.handleMaximize}
              variant="destructive"
              size="sm"
              className="rounded-full w-12 h-12 p-0 shadow-lg animate-pulse"
              title="Chat error - click to view"
            >
              <AlertTriangle className="w-5 h-5" />
            </Button>
          </div>
        )
      }

      // Full error state for mini chat
      return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-white border border-red-200 rounded-lg shadow-lg">
          {/* Error Header */}
          <div className="flex items-center justify-between p-3 bg-red-50 border-b border-red-200 rounded-t-lg">
            <div className="flex items-center gap-2 text-red-800">
              <MessageCircle className="w-4 h-4" />
              <span className="font-medium text-sm">Chat Error</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={this.handleMinimize}
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
                title="Minimize"
              >
                <span className="text-xs">−</span>
              </Button>
              <Button
                onClick={this.props.onClose}
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
                title="Close chat"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Error Content */}
          <div className="p-4 space-y-3">
            <div className="text-sm text-gray-700">
              The chat encountered an error and cannot load properly.
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                Try Again
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                size="sm"
                className="w-full text-xs text-gray-600"
              >
                Refresh Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                  Error Details
                </summary>
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs break-all">
                  {this.state.error.message}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for MiniChat error handling
export function useMiniChatErrorRecovery() {
  const [errorCount, setErrorCount] = React.useState(0)
  const [lastErrorTime, setLastErrorTime] = React.useState<number | null>(null)

  const onError = React.useCallback((error: Error, errorInfo: ErrorInfo) => {
    const now = Date.now()

    // Reset error count if last error was more than 5 minutes ago
    if (lastErrorTime && now - lastErrorTime > 5 * 60 * 1000) {
      setErrorCount(1)
    } else {
      setErrorCount(prev => prev + 1)
    }

    setLastErrorTime(now)

    // If too many errors in short time, suggest closing chat
    if (errorCount >= 3) {
      console.warn('[MINI_CHAT] Multiple errors detected, consider closing chat')
    }
  }, [errorCount, lastErrorTime])

  const shouldAutoClose = errorCount >= 5

  return {
    onError,
    errorCount,
    shouldAutoClose,
    resetErrorCount: () => setErrorCount(0),
  }
}