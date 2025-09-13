'use client'

import { useState, useEffect } from 'react'

export default function TestSSE() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected')
  const [messages, setMessages] = useState<string[]>([])
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  useEffect(() => {
    // Test SSE connection
    const testSSE = () => {
      setConnectionStatus('Connecting...')
      setMessages(prev => [...prev, `[${new Date().toISOString()}] Attempting to connect to SSE...`])
      
      const es = new EventSource('/api/chat/sse')
      setEventSource(es)

      es.onopen = () => {
        setConnectionStatus('Connected')
        setMessages(prev => [...prev, `[${new Date().toISOString()}] SSE connection opened successfully`])
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setMessages(prev => [...prev, `[${new Date().toISOString()}] Received: ${JSON.stringify(data)}`])
        } catch (e) {
          setMessages(prev => [...prev, `[${new Date().toISOString()}] Raw message: ${event.data}`])
        }
      }

      es.onerror = (error) => {
        const readyState = es.readyState
        const readyStateText = readyState === EventSource.CONNECTING ? 'CONNECTING' : 
                              readyState === EventSource.OPEN ? 'OPEN' : 'CLOSED'
        setConnectionStatus('Error')
        setMessages(prev => [...prev, `[${new Date().toISOString()}] Error occurred - ReadyState: ${readyStateText} (${readyState})`])
      }
    }

    testSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">SSE Connection Test</h1>
      
      <div className="mb-4">
        <div className="flex items-center gap-4">
          <span className="font-semibold">Connection Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm ${
            connectionStatus === 'Connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'Connecting...' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {connectionStatus}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Messages:</h2>
          <button 
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Messages
          </button>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet...</p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="mb-1 font-mono text-sm">
                {message}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>This page tests the SSE connection to `/api/chat/sse`.</p>
        <p>You should see a connection message and heartbeat messages every 30 seconds.</p>
      </div>
    </div>
  )
}