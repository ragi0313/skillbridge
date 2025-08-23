#!/usr/bin/env node

/**
 * Background Session Monitor Service
 * 
 * This service runs continuously in the background to monitor session statuses
 * and automatically handle transitions, no-shows, and other session management tasks.
 * 
 * Features:
 * - Continuous monitoring every 2 minutes
 * - Automatic status transitions (confirmed -> upcoming -> ongoing -> completed/no-show)
 * - Real-time no-show detection with instant processing
 * - Smooth status transitions with proper notifications
 * - Health monitoring and error recovery
 * - Graceful shutdown handling
 * 
 * Usage:
 * - Development: node scripts/background-session-monitor.js
 * - Production: npm run session:background-monitor
 * 
 * Environment Variables:
 * - MONITOR_INTERVAL_MINUTES: Check interval (default: 2 minutes)
 * - BASE_URL: API base URL (default: http://localhost:3000)
 * - CRON_SECRET: Authentication secret for API calls
 */

const http = require('http');
const https = require('https');

// Configuration
const MONITOR_INTERVAL_MINUTES = parseInt(process.env.MONITOR_INTERVAL_MINUTES || '2');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

// Runtime state
let isRunning = false;
let intervalId = null;
let consecutiveErrors = 0;
let lastSuccessfulRun = null;
let totalRunsCompleted = 0;

// Parse URL
const url = new URL(`${BASE_URL}/api/cron/session-monitor`);
const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? https : http;

// Request configuration
const getRequestOptions = () => ({
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'SkillBridge-BackgroundMonitor/1.0',
    ...(CRON_SECRET && { 'Authorization': `Bearer ${CRON_SECRET}` })
  }
});

function formatTimestamp() {
  return new Date().toISOString();
}

function logInfo(message) {
  console.log(`[${formatTimestamp()}] ℹ️  ${message}`);
}

function logSuccess(message) {
  console.log(`[${formatTimestamp()}] ✅ ${message}`);
}

function logWarning(message) {
  console.log(`[${formatTimestamp()}] ⚠️  ${message}`);
}

function logError(message, error) {
  console.error(`[${formatTimestamp()}] ❌ ${message}`);
  if (error) {
    console.error(`[${formatTimestamp()}]    ${error.message || error}`);
  }
}

async function makeMonitoringRequest(retryCount = 0) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({});
    const options = {
      ...getRequestOptions(),
      headers: {
        ...getRequestOptions().headers,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = httpModule.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}. Raw: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        logWarning(`Request failed (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}), retrying in ${RETRY_DELAY_MS / 1000}s...`);
        setTimeout(() => {
          makeMonitoringRequest(retryCount + 1).then(resolve).catch(reject);
        }, RETRY_DELAY_MS);
      } else {
        reject(error);
      }
    });

    req.setTimeout(30000, () => {
      req.destroy();
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        logWarning(`Request timeout (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}), retrying...`);
        setTimeout(() => {
          makeMonitoringRequest(retryCount + 1).then(resolve).catch(reject);
        }, RETRY_DELAY_MS);
      } else {
        reject(new Error('Request timeout'));
      }
    });

    req.write(postData);
    req.end();
  });
}

async function runMonitoringCycle() {
  if (!isRunning) {
    return;
  }

  try {
    logInfo('Running background monitoring cycle...');
    
    const result = await makeMonitoringRequest();
    
    if (result.results) {
      const { results } = result;
      const hasActivity = results.noShowsProcessed > 0 || results.expiredBookingsProcessed > 0 || results.statusUpdates > 0;
      
      if (hasActivity) {
        logSuccess('Monitoring cycle completed with activity:');
        console.log(`    📊 Sessions checked: ${results.sessionsChecked}`);
        console.log(`    🚫 No-shows processed: ${results.noShowsProcessed}`);
        console.log(`    📅 Expired bookings: ${results.expiredBookingsProcessed}`);
        console.log(`    🔄 Status updates: ${results.statusUpdates}`);
        
        if (results.summary) {
          console.log(`    📋 Summary: ${results.summary}`);
        }
      } else {
        logInfo('Monitoring cycle completed (no activity)');
      }
      
      if (results.errors && results.errors.length > 0) {
        logWarning(`${results.errors.length} errors encountered:`);
        results.errors.forEach(error => console.log(`      - ${error}`));
      }
    }
    
    // Reset error counter on success
    consecutiveErrors = 0;
    lastSuccessfulRun = new Date();
    totalRunsCompleted++;
    
  } catch (error) {
    consecutiveErrors++;
    logError(`Background monitoring cycle failed (${consecutiveErrors} consecutive errors)`, error);
    
    if (error.code === 'ECONNREFUSED') {
      logWarning('Server connection refused. Make sure your Next.js server is running.');
      logWarning(`Expected server URL: ${BASE_URL}`);
    }
    
    // If too many consecutive errors, log a warning but continue running
    if (consecutiveErrors >= 5) {
      logWarning(`High error rate detected (${consecutiveErrors} consecutive failures). Service will continue but may need attention.`);
      
      // If we've never had a successful run and errors persist, suggest troubleshooting
      if (!lastSuccessfulRun && consecutiveErrors >= 10) {
        logError('Unable to connect to server after multiple attempts. Please check:');
        console.error('  1. Next.js server is running');
        console.error(`  2. Server is accessible at ${BASE_URL}`);
        console.error('  3. Network connectivity is working');
        console.error('  4. CRON_SECRET is correct if authentication is enabled');
      }
    }
  }
}

function startBackgroundMonitoring() {
  if (isRunning) {
    logWarning('Background monitoring is already running');
    return;
  }

  logInfo('🚀 Starting background session monitoring service');
  logInfo(`   Target URL: ${BASE_URL}/api/cron/session-monitor`);
  logInfo(`   Check interval: ${MONITOR_INTERVAL_MINUTES} minutes`);
  logInfo(`   Authentication: ${CRON_SECRET ? 'Enabled' : 'Disabled'}`);
  logInfo(`   Max retry attempts: ${MAX_RETRY_ATTEMPTS}`);
  console.log('');

  isRunning = true;
  
  // Run immediately first
  runMonitoringCycle();

  // Then schedule regular runs
  const intervalMs = MONITOR_INTERVAL_MINUTES * 60 * 1000;
  intervalId = setInterval(runMonitoringCycle, intervalMs);

  logSuccess(`Background monitoring started (PID: ${process.pid})`);
  logInfo('Press Ctrl+C to stop gracefully');
  console.log('');
}

function stopBackgroundMonitoring() {
  if (!isRunning) {
    logInfo('Background monitoring is not running');
    return;
  }

  logInfo('🛑 Stopping background session monitoring...');
  isRunning = false;

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  logSuccess('Background monitoring stopped gracefully');
  logInfo(`Service statistics:`);
  console.log(`  - Total runs completed: ${totalRunsCompleted}`);
  console.log(`  - Last successful run: ${lastSuccessfulRun ? lastSuccessfulRun.toISOString() : 'Never'}`);
  console.log(`  - Consecutive errors: ${consecutiveErrors}`);
}

function printHealthStatus() {
  const now = new Date();
  const uptime = lastSuccessfulRun ? Math.round((now - lastSuccessfulRun) / 1000) : null;
  
  console.log('\n📊 Service Health Status:');
  console.log(`  - Status: ${isRunning ? '🟢 Running' : '🔴 Stopped'}`);
  console.log(`  - PID: ${process.pid}`);
  console.log(`  - Total runs: ${totalRunsCompleted}`);
  console.log(`  - Last successful run: ${lastSuccessfulRun ? lastSuccessfulRun.toISOString() : 'Never'}`);
  console.log(`  - Time since last success: ${uptime ? `${uptime}s ago` : 'N/A'}`);
  console.log(`  - Consecutive errors: ${consecutiveErrors}`);
  console.log(`  - Check interval: ${MONITOR_INTERVAL_MINUTES} minutes`);
  console.log('');
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logInfo('Received SIGTERM, shutting down gracefully...');
  stopBackgroundMonitoring();
  process.exit(0);
});

process.on('SIGINT', () => {
  logInfo('Received SIGINT, shutting down gracefully...');
  stopBackgroundMonitoring();
  process.exit(0);
});

// Health status on SIGUSR1
process.on('SIGUSR1', () => {
  printHealthStatus();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('Uncaught exception:', error);
  stopBackgroundMonitoring();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled rejection:', reason);
  stopBackgroundMonitoring();
  process.exit(1);
});

// Start the service
if (require.main === module) {
  startBackgroundMonitoring();
}

module.exports = {
  startBackgroundMonitoring,
  stopBackgroundMonitoring,
  printHealthStatus
};