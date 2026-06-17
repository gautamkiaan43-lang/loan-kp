const http = require('http');

const urlFGDF = 'http://localhost:5001/api/auth/verify-employee?company=Lenni+Global&employeeNumber=FGDF';
const urlInvalid = 'http://localhost:5001/api/auth/verify-employee?company=Lenni+Global&employeeNumber=INVALID';

function checkUrl(url, testName) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`[${testName}] Status Code:`, res.statusCode);
          console.log(`[${testName}] Response:`, json);
          resolve(json);
        } catch (e) {
          console.log(`[${testName}] Non-JSON Response:`, data.substring(0, 100));
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.log(`[${testName}] Error:`, err.message);
      resolve(null);
    });
  });
}

async function run() {
  console.log('--- TESTING PUBLIC VERIFICATION API ---');
  await checkUrl(urlFGDF, 'TEST VALID FGDF');
  await checkUrl(urlInvalid, 'TEST INVALID NUMBER');
  console.log('--- TEST FINISHED ---');
}

run();
