const { getGovernanceReport } = require('../controllers/managementController');

// Mock req and res objects
const req = {};
const res = {
  status: function(code) {
    console.log("Status Code:", code);
    return this;
  },
  json: function(data) {
    console.log("JSON DATA RECEIVED FROM CONTROLLER:");
    console.log(JSON.stringify(data.portfolio.metrics, null, 2));
    process.exit(0);
  }
};

getGovernanceReport(req, res);
