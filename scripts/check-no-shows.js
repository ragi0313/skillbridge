/**
 * Manual no-show detection script
 * Run this with: node scripts/check-no-shows.js
 */

async function main() {
  try {
    console.log('Starting no-show check...')
    console.log('Current time:', new Date().toISOString())
    
    // Import the function dynamically
    const { runNoShowCheck } = await import('../lib/sessions/session-management.js')
    const results = await runNoShowCheck()
    
    console.log('\n=== NO-SHOW CHECK RESULTS ===')
    console.log(`Processed: ${results.processed} sessions`)
    console.log(`Errors: ${results.errors.length}`)
    
    if (results.errors.length > 0) {
      console.log('Errors encountered:')
      results.errors.forEach(error => console.log(`  - ${error}`))
    }
    
    if (results.results.length > 0) {
      console.log('\nSession results:')
      results.results.forEach(result => {
        console.log(`  Session ${result.sessionId}:`)
        console.log(`    - Learner no-show: ${result.learnerNoShow}`)
        console.log(`    - Mentor no-show: ${result.mentorNoShow}`)
        console.log(`    - Refund processed: ${result.refundProcessed} (${result.refundAmount} credits)`)
        console.log(`    - Mentor payout: ${result.mentorPayout} credits`)
      })
    } else {
      console.log('\nNo sessions required no-show processing.')
    }
    
    console.log('\nNo-show check completed successfully!')
    
  } catch (error) {
    console.error('Error running no-show check:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

main()