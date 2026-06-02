const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authenticateToken = require('../middleware/auth');
const { uploadDocument } = require('../middleware/upload');

router.use(authenticateToken);

router.post('/', uploadDocument.single('file'), documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
