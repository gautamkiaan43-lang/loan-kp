const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.get('/companies/config/:name', authController.getCompanyConfig);

module.exports = router;
