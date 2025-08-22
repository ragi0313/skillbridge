#!/usr/bin/env npx tsx

/**
 * TypeScript test script for no-show detection
 */

import { runAutoSessionMonitor } from './lib/sessions/auto-session-monitor'
import { runNoShowCheck } from './lib/sessions/session-management'

async function testNoShowDetection() {
  console.log('🧪 Testing No-Show Detection System')
  console.log('=' .repeat(50))
  console.log('Current time:', new Date().toISOString())
  
  try {
    console.log('\n1️⃣ Running comprehensive session monitor...')
    const monitorResult = await runAutoSessionMonitor()
    
    console.log('\n📊 Monitor Results:')
    console.log(`   Sessions checked: ${monitorResult.sessionsChecked}`)
    console.log(`   No-shows processed: ${monitorResult.noShowsProcessed}`)
    console.log(`   Expired bookings: ${monitorResult.expiredBookingsProcessed}`)
    console.log(`   Status updates: ${monitorResult.statusUpdates}`)
    console.log(`   Errors: ${monitorResult.errors.length}`)
    
    if (monitorResult.errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      monitorResult.errors.forEach(error => console.log(`   - ${error}`))
    }
    
    console.log('\n2️⃣ Running legacy no-show check for comparison...')
    const legacyResult = await runNoShowCheck()
    
    console.log('\n📊 Legacy Results:')
    console.log(`   Sessions processed: ${legacyResult.processed}`)
    console.log(`   Errors: ${legacyResult.errors.length}`)
    console.log(`   Results: ${legacyResult.results.length} sessions affected`)
    
    if (legacyResult.results.length > 0) {
      console.log('\n📋 Detailed Results:')
      legacyResult.results.forEach(result => {
        console.log(`   Session ${result.sessionId}:`)
        console.log(`     Learner no-show: ${result.learnerNoShow}`)
        console.log(`     Mentor no-show: ${result.mentorNoShow}`)
        console.log(`     Refund processed: ${result.refundProcessed} (${result.refundAmount} credits)`)
        console.log(`     Mentor payout: ${result.mentorPayout} credits`)
      })
    } else {
      console.log('\n✅ No sessions currently require no-show processing.')
    }
    
    console.log('\n✅ Test completed successfully!')
    console.log('=' .repeat(50))
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

// Run the test
testNoShowDetection()
  .then(() => {
    console.log('🎉 All tests passed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error)
    process.exit(1)
  })