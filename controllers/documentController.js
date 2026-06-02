const prisma = require('../config/db');

// Upload a document
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { category, companyName, employeeName, loanRef } = req.body;

    const document = await prisma.document.create({
      data: {
        fileName: req.file.originalname || req.file.filename || 'document',
        fileUrl: req.file.path,
        fileType: req.file.mimetype || 'application/pdf',
        category: category || 'Other',
        uploadedBy: req.user.email,
        companyName: companyName || req.user.company || null,
        employeeName: employeeName || req.user.name || null,
        loanRef: loanRef || null,
        status: 'Active'
      }
    });

    // Record in audit log
    await prisma.auditlog.create({
      data: {
        action: 'DOCUMENT_UPLOAD',
        user: req.user.email,
        note: `Uploaded document: ${document.fileName} (Category: ${document.category})`
      }
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
};

// Fetch documents
exports.getDocuments = async (req, res) => {
  try {
    const { category, companyName, employeeName, search } = req.query;

    const where = {
      status: 'Active'
    };

    // If employee, only show their own documents
    if (req.user.role === 'employee') {
      where.uploadedBy = req.user.email;
    } else {
      // Admins/HR/Finance can filter
      if (category && category !== 'ALL') {
        where.category = category;
      }
      if (companyName && companyName !== 'ALL') {
        where.companyName = companyName;
      }
      if (employeeName) {
        where.employeeName = { contains: employeeName };
      }
      if (search) {
        where.OR = [
          { fileName: { contains: search } },
          { uploadedBy: { contains: search } },
          { loanRef: { contains: search } },
          { category: { contains: search } }
        ];
      }
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

// Delete a document
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await prisma.document.findUnique({
      where: { id: parseInt(id) }
    });

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check authorization: employee can only delete their own
    if (req.user.role === 'employee' && doc.uploadedBy !== req.user.email) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }

    await prisma.document.update({
      where: { id: parseInt(id) },
      data: { status: 'Deleted' }
    });

    // Record in audit log
    await prisma.auditlog.create({
      data: {
        action: 'DOCUMENT_DELETE',
        user: req.user.email,
        note: `Purged document: ${doc.fileName}`
      }
    });

    res.json({ message: 'Document removed successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};
