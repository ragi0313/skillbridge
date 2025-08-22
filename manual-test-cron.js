#!/usr/bin/env node

// Simple test to manually trigger the cron endpoint
// This will test if the no-show detection is working

const https = require('https');
const http = require('http');

async function testCronEndpoint() {
  console.log('🧪 Testing Cron Endpoint Manually');
  console.log('=' .repeat(50));
  
  // First check if we can access localhost (dev server should be running)
  const testUrls = [
    'http://localhost:3000/api/cron/session-monitor',
    // Add production URL here if needed
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`\n📡 Testing: ${url}`);
      const result = await makeRequest(url);
      console.log('✅ Response received:');
      console.log(JSON.stringify(result, null, 2));
      return;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n⚠️  Could not reach any endpoints.');
  console.log('Make sure the development server is running with: npm run dev');
  console.log('Then run this test again.');
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'manual-test-script'
      }
    };
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Run the test
testCronEndpoint()
  .then(() => {
    console.log('\n🎉 Test completed!');
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
  });