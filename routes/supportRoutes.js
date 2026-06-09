const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');

// Public route to submit contact support queries
router.post('/contact', supportController.submitContactQuery);

module.exports = router;
