const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/dashboard', employeeController.getDashboard);
router.get('/statements', employeeController.getStatements);
router.get('/loans/latest', employeeController.getLatestLoan);
router.post('/loans/counter-offer/decision', employeeController.decideCounterOffer);
router.get('/verify-employee-number', employeeController.verifyEmployeeNumber);

module.exports = router;
