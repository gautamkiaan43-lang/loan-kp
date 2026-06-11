const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middleware/auth');
const { uploadSignature } = require('../middleware/upload');

router.use(authenticateToken);

router.get('/dashboard', adminController.getDashboard);
router.get('/payments/stats', adminController.getPaymentStats);
router.get('/payments', adminController.getAllPayments);
router.patch('/payments/:id/status', adminController.updatePaymentStatus);

router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

router.get('/companies', adminController.getAllCompanies);
router.post('/companies', adminController.createCompany);
router.patch('/companies/:id', adminController.updateCompany);
router.post('/companies/:id/signature', uploadSignature.single('signature'), adminController.uploadSignature);

router.get('/roles', adminController.getRoles);
router.get('/applications', adminController.getAllApplications);
router.get('/applications/:id', adminController.getApplicationById);
router.patch('/applications/:id/status', adminController.updateApplicationStatus);
router.get('/audit-logs', adminController.getAuditLogs);

// Email Configuration & Analytics endpoints
router.get('/email-settings/stats', adminController.getEmailSettingsStats);
router.get('/email-settings/logs', adminController.getEmailLogs);
router.get('/email-settings/queue', adminController.getEmailQueue);
router.post('/email-settings/verify-connection', adminController.verifySmtpConnection);
router.post('/email-settings/send-test-email', adminController.sendTestEmail);

module.exports = router;
