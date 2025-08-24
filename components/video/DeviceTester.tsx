"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, Mic, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react"
import { testMediaDevices, getTestingHelp, getDeviceDebugInfo, type DeviceTestResult } from "@/lib/video/device-manager"

interface DeviceTesterProps {
  onTestComplete?: (result: DeviceTestResult) => void
}

export default function DeviceTester({ onTestComplete }: DeviceTesterProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<DeviceTestResult | null>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const runDeviceTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const result = await testMediaDevices()
      setTestResult(result)
      onTestComplete?.(result)
    } catch (error) {
      setTestResult({
        success: false,
        hasVideo: false,
        hasAudio: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setTesting(false)
    }
  }

  const loadDebugInfo = async () => {
    if (!debugInfo) {
      const info = await getDeviceDebugInfo()
      setDebugInfo(info)
    }
    setShowDebugInfo(!showDebugInfo)
  }

  const testingHelp = getTestingHelp()

  return (
    <div className="space-y-4">
      {/* Test Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Device Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runDeviceTest} 
            disabled={testing}
            className="w-full"
          >
            {testing ? "Testing Devices..." : "Test Camera & Microphone"}
          </Button>

          {/* Test Results */}
          {testResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {testResult.success ? "Device test passed" : "Device issues detected"}
                </span>
              </div>

              <div className="flex gap-2">
                <Badge variant={testResult.hasVideo ? "default" : "secondary"}>
                  <Camera className="h-3 w-3 mr-1" />
                  Video: {testResult.hasVideo ? "Available" : "Not available"}
                </Badge>
                <Badge variant={testResult.hasAudio ? "default" : "secondary"}>
                  <Mic className="h-3 w-3 mr-1" />
                  Audio: {testResult.hasAudio ? "Available" : "Not available"}
                </Badge>
              </div>

              {testResult.error && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{testResult.error}</AlertDescription>
                </Alert>
              )}

              {!testResult.success && (
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">{testingHelp.title}</p>
                      <ul className="text-sm space-y-1">
                        {testingHelp.solutions.map((solution, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            {solution}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Debug Information
            <Button variant="outline" size="sm" onClick={loadDebugInfo}>
              {showDebugInfo ? "Hide" : "Show"} Debug Info
            </Button>
          </CardTitle>
        </CardHeader>
        {showDebugInfo && (
          <CardContent>
            {debugInfo ? (
              <div className="space-y-3 text-sm">
                <div>
                  <strong>Browser:</strong> {debugInfo.userAgent.split(' ')[0]}
                </div>
                <div>
                  <strong>Devices Found:</strong> {debugInfo.devices.length}
                  <ul className="ml-4 mt-1">
                    {debugInfo.devices.map((device: any, index: number) => (
                      <li key={index} className="text-xs text-muted-foreground">
                        {device.kind}: {device.label || 'Unnamed device'}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Permissions:</strong>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(debugInfo.permissions, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Loading debug information...</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}