/**
 * Direct test of no-show detection with proper TypeScript imports
 */
import { execSync } from 'child_process'

async function testNoShowDetection() {
  console.log('🧪 Testing No-Show Detection System')
  console.log('=' .repeat(50))
  console.log('Current time:', new Date().toISOString())
  
  try {
    // Use tsx to run TypeScript directly
    console.log('\n🔍 Running comprehensive session monitor...')
    const result = execSync('npx tsx -e "import(\\"./lib/sessions/auto-session-monitor.ts\\").then(m => m.runAutoSessionMonitor()).then(r => console.log(JSON.stringify(r, null, 2)))"', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe'
    })
    
    console.log('Monitor result:')
    console.log(result)
    
    console.log('\n✅ Test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    if (error.stdout) console.log('STDOUT:', error.stdout)
    if (error.stderr) console.log('STDERR:', error.stderr)
  }
}

testNoShowDetection()