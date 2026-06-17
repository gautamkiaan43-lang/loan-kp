// verify_settlement.js
const { getRemittances } = require('../controllers/hrController');
const prisma = require('../config/db');

(async () => {
  // Mock request with HR role and company (adjust as needed)
  const req = {
    user: { role: 'hr', company: 'DemoCorp' },
    query: { period: '2026-06' }
  };
  const res = {
    json: (data) => {
      console.log('--- API Response ---');
      console.log(JSON.stringify(data, null, 2));
    },
    status: (code) => {
      return { json: (msg) => console.log('Status', code, msg) };
    }
  };
  try {
    await getRemittances(req, res);
  } catch (err) {
    console.error('Error', err);
  }
})();
