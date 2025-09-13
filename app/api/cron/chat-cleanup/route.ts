import { NextRequest, NextResponse } from 'next/server'
import { ChatCleanupService } from '@/lib/services/ChatCleanupService'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a cron job (you might want to add authentication)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting scheduled chat cleanup...')
    
    // Get stats before cleanup
    const statsBefore = await ChatCleanupService.getCleanupStats()
    console.log('Cleanup stats before:', statsBefore)
    
    // Perform the cleanup
    const results = await ChatCleanupService.performFullCleanup()
    
    // Get stats after cleanup
    const statsAfter = await ChatCleanupService.getCleanupStats()
    console.log('Cleanup stats after:', statsAfter)
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      before: statsBefore,
      after: statsAfter,
      results: results
    }
    
    console.log('Chat cleanup completed successfully:', response)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat cleanup failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also allow GET for manual testing (remove in production)
export async function GET(request: NextRequest) {
  try {
    const stats = await ChatCleanupService.getCleanupStats()
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: stats
    })
  } catch (error) {
    console.error('Error getting cleanup stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get stats',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}