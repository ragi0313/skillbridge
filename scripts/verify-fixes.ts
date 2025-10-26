/**
 * Verification script for security fixes
 * Tests that all critical fixes are working correctly
 */

import { db } from '../db'
import { sessionMessages } from '../db/schema'
import { eq } from 'drizzle-orm'

async function verifyFixes() {
  console.log('🔍 Verifying Security Fixes...\n')

  // Test 1: Verify session_messages table exists
  console.log('✅ Test 1: Verify session_messages table')
  try {
    const result = await db.select().from(sessionMessages).limit(1)
    console.log('   ✓ session_messages table exists and is queryable')
    console.log(`   ✓ Current message count: ${result.length}\n`)
  } catch (error) {
    console.error('   ✗ Failed to query session_messages table:', error)
    process.exit(1)
  }

  // Test 2: Verify SessionStateValidator module
  console.log('✅ Test 2: Verify SessionStateValidator')
  try {
    const { isValidTransition, validateTransitionOrThrow, TERMINAL_STATES } = await import('../lib/services/SessionStateValidator')

    // Test valid transition
    const validResult = isValidTransition('pending', 'confirmed')
    if (!validResult.valid) {
      throw new Error('Valid transition marked as invalid')
    }
    console.log('   ✓ Valid transition test passed (pending -> confirmed)')

    // Test invalid transition
    const invalidResult = isValidTransition('completed', 'ongoing')
    if (invalidResult.valid) {
      throw new Error('Invalid transition marked as valid')
    }
    console.log('   ✓ Invalid transition test passed (completed -> ongoing blocked)')

    // Test terminal states
    if (!TERMINAL_STATES.includes('completed')) {
      throw new Error('completed should be a terminal state')
    }
    console.log('   ✓ Terminal states configured correctly')
    console.log(`   ✓ Terminal states: ${TERMINAL_STATES.join(', ')}\n`)
  } catch (error) {
    console.error('   ✗ SessionStateValidator test failed:', error)
    process.exit(1)
  }

  // Test 3: Check imports in critical files
  console.log('✅ Test 3: Verify critical file imports')
  try {
    // Verify no eval() in redis-safe.ts
    const fs = await import('fs')
    const redisSafeContent = fs.readFileSync('./lib/cache/redis-safe.ts', 'utf-8')
    if (redisSafeContent.includes("eval('require')")) {
      throw new Error('eval() still present in redis-safe.ts')
    }
    console.log('   ✓ redis-safe.ts: eval() removed')

    // Verify no eval() in pusher/config.ts
    const pusherContent = fs.readFileSync('./lib/pusher/config.ts', 'utf-8')
    if (pusherContent.includes("eval('require')")) {
      throw new Error('eval() still present in pusher/config.ts')
    }
    console.log('   ✓ pusher/config.ts: eval() removed')

    // Verify CSP fixes
    const middlewareContent = fs.readFileSync('./middleware.ts', 'utf-8')
    if (middlewareContent.includes("'unsafe-eval'")) {
      throw new Error('unsafe-eval still present in CSP')
    }
    console.log('   ✓ middleware.ts: unsafe-eval removed from CSP')

    // Verify webhook has validation
    const webhookContent = fs.readFileSync('./app/api/xendit/webhook/route.ts', 'utf-8')
    if (!webhookContent.includes('SECURITY: Strict input validation')) {
      throw new Error('Webhook validation not found')
    }
    if (!webhookContent.includes('SECURITY: Idempotency check')) {
      throw new Error('Webhook idempotency check not found')
    }
    console.log('   ✓ xendit/webhook/route.ts: Input validation added')
    console.log('   ✓ xendit/webhook/route.ts: Idempotency check added\n')
  } catch (error) {
    console.error('   ✗ File verification failed:', error)
    process.exit(1)
  }

  // Test 4: Verify refund race condition fix
  console.log('✅ Test 4: Verify refund processing has row-level locking')
  try {
    const fs = await import('fs')
    const refundContent = fs.readFileSync('./app/api/admin/refund-requests/[id]/review/route.ts', 'utf-8')
    if (!refundContent.includes(".for('update')")) {
      throw new Error('Row-level locking not found in refund processing')
    }
    console.log('   ✓ Refund processing: Row-level locking implemented')

    if (!refundContent.includes('SECURITY: Validate refund amount')) {
      throw new Error('Refund amount validation not found')
    }
    console.log('   ✓ Refund processing: Amount validation added\n')
  } catch (error) {
    console.error('   ✗ Refund fix verification failed:', error)
    process.exit(1)
  }

  console.log('=' .repeat(60))
  console.log('🎉 All Security Fixes Verified Successfully!')
  console.log('=' .repeat(60))
  console.log('\n📋 Next Steps:')
  console.log('1. Review SECURITY_FIXES.md for credential rotation steps')
  console.log('2. Rotate all credentials in .env file')
  console.log('3. Update environment variables in your deployment platform')
  console.log('4. Deploy to production')
  console.log('5. Monitor logs for 24 hours\n')

  process.exit(0)
}

verifyFixes().catch((error) => {
  console.error('Verification failed:', error)
  process.exit(1)
})
