"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Home, Search, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/95 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">404 - Not Found</h1>
          <p className="text-slate-400 mb-6">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => router.back()} 
              className="w-full"
              variant="default"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/find-mentors">
                <Search className="h-4 w-4 mr-2" />
                Find Mentors
              </Link>
            </Button>
            
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}