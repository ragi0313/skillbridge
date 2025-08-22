#!/usr/bin/env node

// Background script to check for no-shows
// Run this separately from your main app

// Use HTTP API call instead of direct import to avoid module issues
async function callNoShowAPI() {
  const response = await fetch('http://localhost:3000/api/admin/check-no-shows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  return await response.json()
}

async function runCheck() {
  console.log('Starting no-show check at', new Date().toISOString())
  
  try {
    const result = await callNoShowAPI()
    console.log('No-show check completed:', result)
  } catch (error) {
    console.error('Error running no-show check:', error)
  }
}

// Run immediately
runCheck()

// Then run every 2 minutes in development, 15 minutes in production
const isProduction = process.env.NODE_ENV === 'production'
const interval = isProduction ? 15 * 60 * 1000 : 2 * 60 * 1000

setInterval(runCheck, interval)

console.log(`No-show checker started. Running every ${isProduction ? '15' : '2'} minutes...`)