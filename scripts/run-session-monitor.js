/**
 * Session Monitor Script - For local development and testing
 * 
 * This script can be run in several ways:
 * 1. Manual execution: node scripts/run-session-monitor.js
 * 2. Continuous monitoring: node scripts/run-session-monitor.js --continuous
 * 3. As a scheduled task via cron or Windows Task Scheduler
 * 
 * Environment Variables:
 * - BASE_URL: Override the base URL (default: http://localhost:3000)
 * - MONITOR_INTERVAL: Override the interval in minutes (default: 10)
 * - CRON_SECRET: Secret for authenticated requests
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MONITOR_INTERVAL = parseInt(process.env.MONITOR_INTERVAL || '10'); // minutes
const CRON_SECRET = process.env.CRON_SECRET;
const CONTINUOUS_MODE = process.argv.includes('--continuous');

// Parse URL
const url = new URL(`${BASE_URL}/api/cron/session-monitor`);
const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? https : http;

// Request configuration
const postData = JSON.stringify({});
const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'SkillBridge-SessionMonitor/1.0'
  }
};

// Add authorization header if secret is provided
if (CRON_SECRET) {
  options.headers['Authorization'] = `Bearer ${CRON_SECRET}`;
}

function formatTimestamp() {
  return new Date().toISOString();
}

async function runSessionMonitor() {
  return new Promise((resolve, reject) => {
    console.log(`[${formatTimestamp()}] 🤖 Triggering session monitor...`);
    
    const req = httpModule.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            console.log(`[${formatTimestamp()}] ✅ Session monitor completed successfully`);
            
            if (result.results) {
              const { results } = result;
              console.log(`   📊 Sessions checked: ${results.sessionsChecked}`);
              console.log(`   🚫 No-shows processed: ${results.noShowsProcessed}`);
              console.log(`   📅 Expired bookings: ${results.expiredBookingsProcessed}`);
              console.log(`   🔄 Status updates: ${results.statusUpdates}`);
              
              if (results.errors && results.errors.length > 0) {
                console.log(`   ⚠️ Errors encountered: ${results.errors.length}`);
                results.errors.forEach(error => console.log(`      - ${error}`));
              }
              
              if (results.summary) {
                console.log(`   📋 Summary: ${results.summary}`);
              }
            }
            
            resolve(result);
          } else {
            console.error(`[${formatTimestamp()}] ❌ Session monitor failed with status ${res.statusCode}`);
            console.error(`   Response: ${responseData}`);
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        } catch (error) {
          console.error(`[${formatTimestamp()}] ❌ Failed to parse response:`, error.message);
          console.error(`   Raw response: ${responseData}`);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`[${formatTimestamp()}] ❌ Request failed:`, error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.error(`   💡 Make sure your Next.js server is running on ${BASE_URL}`);
        console.error(`   💡 Run: npm run dev`);
      }
      
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runHealthCheck() {
  return new Promise((resolve, reject) => {
    const healthOptions = {
      ...options,
      method: 'GET',
      headers: {
        'User-Agent': 'SkillBridge-SessionMonitor/1.0'
      }
    };

    if (CRON_SECRET) {
      healthOptions.headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    }

    console.log(`[${formatTimestamp()}] 🏥 Checking system health...`);
    
    const req = httpModule.request(healthOptions, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          
          if (res.statusCode === 200 && result.health) {
            const { health } = result;
            console.log(`[${formatTimestamp()}] 📊 System Health Status:`);
            console.log(`   📋 Pending sessions: ${health.pendingSessions}`);
            console.log(`   ✅ Confirmed sessions: ${health.confirmedSessions}`);
            console.log(`   ⏰ Upcoming sessions: ${health.upcomingSessions}`);
            console.log(`   🔴 Ongoing sessions: ${health.ongoingSessions}`);
            console.log(`   ⚠️ Overdue bookings: ${health.overdueBookings}`);
            
            if (health.overdueBookings > 0) {
              console.log(`   🚨 WARNING: ${health.overdueBookings} overdue bookings need attention!`);
            }
            
            resolve(result);
          } else {
            reject(new Error(`Health check failed: ${responseData}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log(`🚀 SkillBridge Session Monitor Script`);
  console.log(`   Target URL: ${BASE_URL}/api/cron/session-monitor`);
  console.log(`   Mode: ${CONTINUOUS_MODE ? `Continuous (every ${MONITOR_INTERVAL} minutes)` : 'Single run'}`);
  console.log(`   Authentication: ${CRON_SECRET ? 'Enabled' : 'Disabled'}`);
  console.log('');

  try {
    // Run initial health check
    await runHealthCheck();
    console.log('');

    // Run session monitor
    await runSessionMonitor();

    if (CONTINUOUS_MODE) {
      console.log(`\n⏰ Starting continuous monitoring (every ${MONITOR_INTERVAL} minutes)`);
      console.log('Press Ctrl+C to stop\n');
      
      const intervalMs = MONITOR_INTERVAL * 60 * 1000;
      
      setInterval(async () => {
        try {
          await runSessionMonitor();
        } catch (error) {
          console.error(`[${formatTimestamp()}] ❌ Scheduled run failed:`, error.message);
        }
      }, intervalMs);
      
      // Keep the process running
      process.on('SIGINT', () => {
        console.log(`\n[${formatTimestamp()}] 👋 Stopping continuous monitoring...`);
        process.exit(0);
      });
      
    } else {
      console.log(`\n[${formatTimestamp()}] 🎉 Single run completed successfully!`);
      process.exit(0);
    }

  } catch (error) {
    console.error(`\n[${formatTimestamp()}] 💥 Script failed:`, error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Make sure your Next.js server is running');
      console.error('   2. Run: npm run dev');
      console.error('   3. Check that the server is accessible at', BASE_URL);
    }
    
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`\n[${formatTimestamp()}] 💥 Uncaught exception:`, error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`\n[${formatTimestamp()}] 💥 Unhandled rejection:`, reason);
  process.exit(1);
});

main();