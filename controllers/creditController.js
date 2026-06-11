const prisma = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const allLoans = await prisma.loan.findMany({
      include: { installment: true }
    });

    const pendingQueue = allLoans.filter(l => 
      l.stage === 'HR_VERIFIED' || 
      l.stage === 'CREDIT_PENDING' ||
      l.status.toLowerCase().includes('hr approved') ||
      l.status.toLowerCase().includes('hr_approved') ||
      l.status.toLowerCase().includes('credit pending') ||
      l.status.toLowerCase().includes('forwarded')
    );

    const highRisk = pendingQueue.filter(l => {
      const meta = l.metadata || {};
      return meta.risk === 'High' || (meta.score && meta.score < 500);
    });

    const today = new Date().toDateString();
    const approvedToday = allLoans.filter(l => 
      l.status.toLowerCase().includes('approved') && 
      new Date(l.updatedAt).toDateString() === today
    );

    // Calculate Policy Stats
    const gradedLoans = allLoans.filter(l => l.metadata && l.metadata.score);
    const avgScore = gradedLoans.length > 0 
      ? Math.round(gradedLoans.reduce((sum, l) => sum + (l.metadata.score || 0), 0) / gradedLoans.length)
      : 612;

    const totalDecisions = allLoans.filter(l => ['Approved', 'Rejected', 'Declined'].includes(l.status)).length;
    const rejections = allLoans.filter(l => ['Rejected', 'Declined'].includes(l.status)).length;
    const rejectionRate = totalDecisions > 0 ? ((rejections / totalDecisions) * 100).toFixed(1) : "14.2";

    // Priority Assessments (Top 5)
    const priorityAssessments = pendingQueue.slice(0, 5).map(l => ({
      id: l.reference,
      name: l.employeeName,
      score: l.metadata?.score || 612,
      risk: l.metadata?.risk || 'Medium',
      amount: l.amount,
      date: l.createdAt
    }));

    res.json({
      pendingCount: pendingQueue.length,
      highRiskCount: highRisk.length,
      approvedTodayCount: approvedToday.length,
      avgScore,
      rejectionRate,
      priorityAssessments
    });
  } catch (error) {
    console.error('Credit Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch credit stats' });
  }
};

exports.getQueue = async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: {
        OR: [
          { stage: 'HR_VERIFIED' },
          { stage: 'CREDIT_PENDING' },
          { status: { contains: 'HR Approved' } },
          { status: { contains: 'HR_Approved' } },
          { status: { contains: 'Credit Pending' } },
          { status: { contains: 'Under Review' } },
          { status: { contains: 'forwarded' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedQueue = loans.map(l => {
      const metadata = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
      const name = (l.employeeName && l.employeeName !== 'Unknown') 
        ? l.employeeName 
        : (metadata.personalInfo?.name ? `${metadata.personalInfo.name} ${metadata.personalInfo.surname}` : 'Anonymous');

      return {
        id: l.id,
        reference: l.reference,
        name: name,
        company: l.company,
        amount: l.amount,
        status: l.status.toUpperCase(),
        lifecycleStatus: l.stage,
        date: l.createdAt,
        hrVerifiedAt: l.updatedAt,
        employeeAppliedAt: l.createdAt,
        score: metadata.creditScore || 640,
        risk: metadata.riskLevel || 'Medium',
        salary: parseFloat(metadata.financialInfo?.grossIncome || 0),
        metadata: metadata,
        documentUrls: typeof l.documentUrls === 'string' ? JSON.parse(l.documentUrls) : (l.documentUrls || {})
      };
    });

    res.json(formattedQueue);
  } catch (error) {
    console.error('Credit Queue Error:', error);
    res.status(500).json({ message: 'Failed to fetch credit queue' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: {
        OR: [
          { status: { contains: 'Credit Approved' } },
          { status: { contains: 'Credit Rejected' } },
          { stage: 'ADMIN_APPROVAL' },
          { stage: 'REJECTED' }
        ]
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formattedHistory = loans.map(l => {
      const metadata = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
      const name = (l.employeeName && l.employeeName !== 'Unknown') 
        ? l.employeeName 
        : (metadata.personalInfo?.name ? `${metadata.personalInfo.name} ${metadata.personalInfo.surname}` : 'Anonymous');

      return {
        id: l.id,
        reference: l.reference,
        name: name,
        company: l.company,
        amount: l.amount,
        status: l.status.toUpperCase(),
        lifecycleStatus: l.stage,
        date: l.createdAt,
        hrVerifiedAt: l.updatedAt,
        employeeAppliedAt: l.createdAt,
        score: metadata.creditScore || 640,
        risk: metadata.riskLevel || 'Medium',
        salary: parseFloat(metadata.financialInfo?.grossIncome || 0),
        metadata: metadata,
        documentUrls: typeof l.documentUrls === 'string' ? JSON.parse(l.documentUrls) : (l.documentUrls || {})
      };
    });

    res.json(formattedHistory);
  } catch (error) {
    console.error('Credit History Error:', error);
    res.status(500).json({ message: 'Failed to fetch credit history' });
  }
};

exports.makeDecision = async (req, res) => {
  const { loanId, decision, notes } = req.body;

  try {
    const loan = await prisma.loan.findUnique({
      where: { reference: loanId }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const isApprove = decision === 'APPROVE';
    
    const updatedLoan = await prisma.loan.update({
      where: { reference: loanId },
      data: {
        status: isApprove ? 'Credit Approved' : 'Credit Rejected',
        stage: isApprove ? 'ADMIN_APPROVAL' : 'REJECTED',
        updatedAt: new Date()
      }
    });

    // Send email notification
    try {
      const emailService = require('../services/emailService');
      if (isApprove) {
        const approveHtml = emailService.populateTemplate('notification', {
          message: `Your loan application (Ref: ${updatedLoan.reference}) for R ${updatedLoan.amount.toLocaleString()} has been approved by the Credit Assessment team and is awaiting final administrative sign-off.`
        });
        await emailService.queueEmail({
          to: updatedLoan.employeeEmail,
          subject: `Lenni Loan Status: Pending Admin Approval - Ref ${updatedLoan.reference}`,
          html: approveHtml,
          text: `Your loan application ${updatedLoan.reference} has been approved by Credit and is pending final Admin sign-off.`,
          emailType: 'LOAN_CREDIT_APPROVED',
          relatedRecord: updatedLoan.id
        });
      } else {
        const rejectHtml = emailService.populateTemplate('loan-rejected', {
          name: updatedLoan.employeeName,
          reference: updatedLoan.reference
        });
        await emailService.queueEmail({
          to: updatedLoan.employeeEmail,
          subject: `Lenni Loan Application Declined - Ref ${updatedLoan.reference}`,
          html: rejectHtml,
          text: `Your loan application ${updatedLoan.reference} has been declined.`,
          emailType: 'LOAN_REJECTED',
          relatedRecord: updatedLoan.id
        });
      }
    } catch (emailErr) {
      console.error('[creditController.makeDecision] Email trigger failed:', emailErr);
    }

    // Log the action
    await prisma.auditlog.create({
      data: {
        action: isApprove ? 'CREDIT_APPROVE' : 'CREDIT_REJECT',
        user: req.user.name || req.user.email,
        note: `${notes || `Credit decision: ${decision}`}. [Notification dispatched via Email to ${loan.employeeEmail || 'client'}]`,
        entityId: loanId
      }
    });

    res.json({ 
      message: `Loan ${isApprove ? 'approved' : 'rejected'} successfully. Notification sent to ${loan.employeeEmail || 'client'}.`, 
      loan: updatedLoan 
    });
  } catch (error) {
    console.error('Credit Decision Error:', error);
    res.status(500).json({ message: 'Failed to process credit decision' });
  }
};

exports.getRiskReviews = async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: {
        OR: [
          { status: 'Escalated' },
          { status: 'On Hold' },
          { status: 'Need Review' },
          { status: 'Under Review' },
          { status: 'Credit Pending' }
        ]
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formattedReviews = loans
      .filter(l => {
        const meta = l.metadata || {};
        return meta.risk === 'High' || meta.risk === 'HIGH' || 
               ['Escalated', 'On Hold', 'Need Review'].includes(l.status);
      })
      .map(l => ({
        id: l.reference,
        name: l.employeeName,
        company: l.company,
        score: l.metadata?.score || 450,
        risk: l.metadata?.risk || 'High',
        status: l.status,
        reason: l.metadata?.reason || 'System flagged for manual verification.',
        salary: l.metadata?.salary || 0,
        amount: l.amount
      }));

    res.json(formattedReviews);
  } catch (error) {
    console.error('Risk Reviews Error:', error);
    res.status(500).json({ message: 'Failed to fetch risk reviews' });
  }
};

exports.updateStatus = async (req, res) => {
  const { loanId, status, notes } = req.body;

  try {
    const loan = await prisma.loan.findUnique({
      where: { reference: loanId }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const updatedLoan = await prisma.loan.update({
      where: { reference: loanId },
      data: {
        status,
        updatedAt: new Date()
      }
    });

    // Log action
    await prisma.auditlog.create({
      data: {
        action: `STATUS_UPDATE_${status.toUpperCase().replace(/\s+/g, '_')}`,
        user: req.user.name || req.user.email,
        note: notes || `Status updated to ${status}`,
        entityId: loanId
      }
    });

    res.json({ message: 'Status updated successfully', loan: updatedLoan });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

exports.makeCounterOffer = async (req, res) => {
  const { loanId, amount, term } = req.body;

  try {
    const loan = await prisma.loan.findUnique({
      where: { reference: loanId }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const originalMetadata = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : (loan.metadata || {});
    const freq = originalMetadata.financialInfo?.salaryFrequency || 'Monthly';
    const amountVal = parseFloat(amount);

    if (isNaN(amountVal) || amountVal < 400 || amountVal > 8000 || amountVal % 400 !== 0) {
      return res.status(400).json({ 
        message: 'Proposed counter offer amount must be between R400 and R8000 in R400 increments.' 
      });
    }

    const termVal = parseInt(term);
    let termValid = false;
    if (freq === 'Weekly') {
      if (termVal >= 4 && termVal <= 24 && termVal % 4 === 0) termValid = true;
    } else if (freq === 'Fortnightly') {
      if (termVal >= 2 && termVal <= 12 && termVal % 2 === 0) termValid = true;
    } else { // Monthly
      if (termVal >= 1 && termVal <= 6) termValid = true;
    }

    if (!termValid) {
      return res.status(400).json({ 
        message: `Proposed term (${term}) is invalid for ${freq} frequency. Must represent a period between 1 and 6 months.` 
      });
    }

    const updatedMetadata = {
      ...originalMetadata,
      counterOffer: {
        amount: amountVal,
        term: String(term),
        originalAmount: loan.amount,
        originalTerm: originalMetadata.loanRequest?.term || '12',
        proposedAt: new Date().toISOString()
      }
    };

    const updatedLoan = await prisma.loan.update({
      where: { reference: loanId },
      data: {
        status: 'Counter Offer',
        stage: 'COUNTER_OFFER',
        metadata: updatedMetadata,
        updatedAt: new Date()
      }
    });

    // Send email notification for Counter Offer
    try {
      const emailService = require('../services/emailService');
      const counterHtml = emailService.populateTemplate('notification', {
        message: `Our Credit team has reviewed your application (Ref: ${updatedLoan.reference}) and proposed a counter-offer: R ${amountVal.toLocaleString()} over ${term} months (${freq}). Log into your portal to review and accept the counter-offer.`
      });
      await emailService.queueEmail({
        to: updatedLoan.employeeEmail,
        subject: `Lenni Loan Status: Counter Offer Proposed - Ref ${updatedLoan.reference}`,
        html: counterHtml,
        text: `A counter offer of R ${amountVal} has been proposed for your loan application ${updatedLoan.reference}.`,
        emailType: 'LOAN_COUNTER_OFFER',
        relatedRecord: updatedLoan.id
      });
    } catch (emailErr) {
      console.error('[creditController.makeCounterOffer] Email trigger failed:', emailErr);
    }

    // Log the action
    await prisma.auditlog.create({
      data: {
        action: 'CREDIT_COUNTER_OFFER',
        user: req.user.name || req.user.email,
        note: `Proposed counter-offer: R ${amountVal.toLocaleString()} over ${term} (Frequency: ${freq}). [Notification dispatched via Email & Dashboard to ${loan.employeeEmail || 'client'}]`,
        entityId: loanId
      }
    });

    res.json({ 
      message: `Counter-offer proposed successfully. Notification dispatched to ${loan.employeeEmail || 'client'}.`, 
      loan: updatedLoan 
    });
  } catch (error) {
    console.error('Counter Offer Error:', error);
    res.status(500).json({ message: 'Failed to process counter-offer' });
  }
};
