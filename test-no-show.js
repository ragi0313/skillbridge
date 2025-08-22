// Simple test to trigger no-show detection
// This can be run manually to process any overdue sessions

const http = require('http');

const data = JSON.stringify({});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/check-no-shows',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Triggering no-show check...');

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Response status:', res.statusCode);
    try {
      const result = JSON.parse(responseData);
      console.log('\n=== NO-SHOW CHECK RESULTS ===');
      console.log('Success:', result.success);
      console.log('Message:', result.message);
      console.log('Processed:', result.processed, 'sessions');
      
      if (result.errors && result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(error => console.log('  -', error));
      }
      
      if (result.results && result.results.length > 0) {
        console.log('\nSession Results:');
        result.results.forEach(session => {
          console.log(`  Session ${session.sessionId}:`);
          console.log(`    - Learner no-show: ${session.learnerNoShow}`);
          console.log(`    - Mentor no-show: ${session.mentorNoShow}`);
          console.log(`    - Refund processed: ${session.refundProcessed} (${session.refundAmount} credits)`);
          console.log(`    - Mentor payout: ${session.mentorPayout} credits`);
        });
      } else {
        console.log('\nNo sessions required no-show processing.');
      }
    } catch (error) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
  console.log('\nMake sure your Next.js development server is running on port 3000');
  console.log('Run: npm run dev');
});

req.write(data);
req.end();