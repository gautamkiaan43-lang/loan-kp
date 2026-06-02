const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrController');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

router.get('/new-loans', hrController.getNewLoansReport);
router.get('/overdue', hrController.getOverdueInstallments);
router.patch('/overdue/:reference/note', hrController.updateOverdueNote);
router.get('/activity-stats', hrController.getActivityStats);
router.get('/dashboard', hrController.getDashboardData);
router.get('/verifications', hrController.getVerifications);
router.get('/employees', hrController.getEmployees);
router.patch('/verifications/:id/status', hrController.updateVerificationStatus);
router.get('/company', hrController.getCompanyProfile);
router.patch('/company', hrController.updateCompanyProfile);
router.get('/remittances', hrController.getRemittances);

// Deduction schedule endpoints
router.post('/upload-deductions', upload.single('file'), hrController.uploadDeductions);
router.get('/uploaded-schedules', hrController.getUploadedSchedules);

// Employee list verification roster endpoint
router.post('/upload-employee-list', upload.single('file'), hrController.uploadEmployeeList);

module.exports = router;

