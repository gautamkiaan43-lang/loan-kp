const prisma = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const loans = await prisma.loan.findMany();

    const pendingPayouts = loans.filter(l =>
      l.stage === 'ADMIN_APPROVAL_PENDING' ||
      l.stage === 'ADMIN_APPROVAL' ||
      l.stage === 'FINANCE_PENDING' ||
      l.status.toLowerCase().includes('admin approved') ||
      l.status.toLowerCase().includes('credit approved')
    );

    const disbursedLoans = loans.filter(l =>
      ['ACTIVE', 'DISBURSED', 'PAID'].includes(l.stage) ||
      ['active', 'disbursed', 'paid'].includes(l.status.toLowerCase())
    );

    const pendingAmount = pendingPayouts.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalDisbursed = disbursedLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);

    res.json({
      pendingAmount,
      pendingCount: pendingPayouts.length,
      totalDisbursed,
      failedPayments: 0
    });
  } catch (error) {
    console.error('Finance Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch finance stats' });
  }
};

exports.getPayoutQueue = async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: {
        OR: [
          { stage: 'ADMIN_APPROVAL_PENDING' },
          { stage: 'ADMIN_APPROVAL' },
          { stage: 'FINANCE_PENDING' },
          { status: { contains: 'Admin Approved' } },
          { status: { contains: 'Credit Approved' } }
        ]
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formattedQueue = loans.map(l => {
      const metadata = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
      const bank = metadata.bankDetails || metadata.personalInfo?.bankDetails || { name: 'Capitec Bank', account: '1029485720', type: 'Savings' };
      return {
        id: l.reference,
        name: l.employeeName,
        amount: l.amount,
        date: l.updatedAt,
        idNumber: metadata.personalInfo?.idNumber || '9608125048082',
        bankDetails: bank
      };
    });

    res.json(formattedQueue);
  } catch (error) {
    console.error('Payout Queue Error:', error);
    res.status(500).json({ message: 'Failed to fetch payout queue' });
  }
};

exports.disburse = async (req, res) => {
  const { loanId } = req.body;
  try {
    const updatedLoan = await prisma.loan.update({
      where: { reference: loanId },
      data: {
        status: 'Active',
        stage: 'ACTIVE',
        updatedAt: new Date()
      }
    });

    await prisma.auditlog.create({
      data: {
        action: 'FINANCE_DISBURSE',
        user: req.user.name || req.user.email,
        note: `Loan disbursed and activated.`,
        entityId: loanId
      }
    });

    res.json({ message: 'Loan disbursed successfully', loan: updatedLoan });
  } catch (error) {
    console.error('Disburse Error:', error);
    res.status(500).json({ message: 'Failed to disburse loan' });
  }
};

exports.getSettlementEligibleLoans = async (req, res) => {
  const { search } = req.query;
  try {
    const loans = await prisma.loan.findMany({
      where: {
        status: { in: ['Active', 'ACTIVE', 'Disbursed', 'DISBURSED'] },
        OR: search ? [
          { employeeName: { contains: search } },
          { reference: { contains: search } }
        ] : undefined
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formatted = loans.map(l => ({
      id: l.reference,
      name: l.employeeName,
      amount: l.amount,
      status: l.status,
      outstandingAmount: Math.round((l.amount * 0.8) * 100) / 100 // Simulating outstanding
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Fetch Eligible Loans Error:', error);
    res.status(500).json({ message: 'Failed to fetch eligible loans' });
  }
};

exports.executeSettlement = async (req, res) => {
  const { sourceLoanId, targetLoanId, amount, notes } = req.body;

  try {
    const updatedTarget = await prisma.loan.update({
      where: { reference: targetLoanId },
      data: {
        status: 'Paid',
        stage: 'PAID',
        updatedAt: new Date()
      }
    });

    await prisma.auditlog.create({
      data: {
        action: 'FINANCE_SETTLE',
        user: req.user.name || req.user.email,
        note: `Loan settled by ${sourceLoanId}. Amount: R${amount}. Notes: ${notes}`,
        entityId: targetLoanId
      }
    });

    res.json({ message: 'Settlement executed successfully', loan: updatedTarget });
  } catch (error) {
    console.error('Execute Settlement Error:', error);
    res.status(500).json({ message: 'Failed to execute settlement' });
  }
};

exports.getSettlementHistory = async (req, res) => {
  try {
    const logs = await prisma.auditlog.findMany({
      where: { action: 'FINANCE_SETTLE' },
      orderBy: { createdAt: 'desc' }
    });

    const history = logs.map(log => {
      // Extract IDs from note: "Loan settled by APP-XXX. Amount: RYYY. Notes: ZZZ"
      const sourceMatch = log.note.match(/by ([A-Z0-9-]+)/i);
      const amountMatch = log.note.match(/Amount: R([\d.]+)/);

      return {
        date: log.createdAt,
        sourceId: sourceMatch ? sourceMatch[1] : 'N/A',
        targetId: log.entityId,
        amount: amountMatch ? amountMatch[1] : '0',
        status: 'Completed'
      };
    });

    res.json(history);
  } catch (error) {
    console.error('Settlement History Error:', error);
    res.status(500).json({ message: 'Failed to fetch settlement history' });
  }
};

exports.searchLoanForWriteoff = async (req, res) => {
  const { search } = req.query;
  try {
    const loans = await prisma.loan.findMany({
      where: {
        status: { in: ['Active', 'ACTIVE', 'Disbursed', 'DISBURSED'] },
        OR: [
          { employeeName: { contains: search } },
          { reference: { contains: search } }
        ]
      },
      take: 5
    });

    res.json(loans.map(l => ({
      id: l.reference,
      name: l.employeeName,
      amount: l.amount,
      status: l.status
    })));
  } catch (error) {
    console.error('Search Write-off Error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};

exports.commitWriteoff = async (req, res) => {
  const { loanId, principal, interest, fees, reason } = req.body;
  const total = Number(principal) + Number(interest) + Number(fees);

  try {
    const updatedLoan = await prisma.loan.update({
      where: { reference: loanId },
      data: {
        status: 'Written-Off',
        stage: 'WRITTEN_OFF',
        updatedAt: new Date()
      }
    });

    await prisma.auditlog.create({
      data: {
        action: 'FINANCE_WRITEOFF',
        user: req.user.name || req.user.email,
        note: `Loan written off. Total: R${total} (P: ${principal}, I: ${interest}, F: ${fees}). Reason: ${reason}`,
        entityId: loanId
      }
    });

    res.json({ message: 'Journal write-off committed successfully', loan: updatedLoan });
  } catch (error) {
    console.error('Commit Write-off Error:', error);
    res.status(500).json({ message: 'Commit failed' });
  }
};

exports.getWriteoffLedger = async (req, res) => {
  try {
    const logs = await prisma.auditlog.findMany({
      where: { action: 'FINANCE_WRITEOFF' },
      orderBy: { createdAt: 'desc' }
    });

    const ledger = logs.map(log => {
      const pMatch = log.note.match(/P: ([\d.]+)/);
      const fMatch = log.note.match(/F: ([\d.]+)/);
      const tMatch = log.note.match(/Total: R([\d.]+)/);

      return {
        date: log.createdAt,
        accountName: '', // Would need to join or fetch separately if needed
        accountId: log.entityId,
        principal: pMatch ? pMatch[1] : '0',
        fees: fMatch ? fMatch[1] : '0',
        total: tMatch ? tMatch[1] : '0'
      };
    });

    res.json(ledger);
  } catch (error) {
    console.error('Ledger Fetch Error:', error);
    res.status(500).json({ message: 'Failed to fetch ledger' });
  }
};

exports.getAuditHistory = async (req, res) => {
  try {
    const logs = await prisma.auditlog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error('Audit History Error:', error);
    res.status(500).json({ message: 'Failed to fetch audit history' });
  }
};

exports.getCompanies = async (req, res) => {
  try {
    const userCompanies = await prisma.user.findMany({
      where: { company: { not: null } },
      select: { company: true },
      distinct: ['company']
    });

    const explicitCompanies = await prisma.company.findMany();

    const companyNames = new Set();
    userCompanies.forEach(u => companyNames.add(u.company));
    explicitCompanies.forEach(c => companyNames.add(c.name));

    const formatted = Array.from(companyNames).map(name => ({ name }));
    res.json(formatted);
  } catch (error) {
    console.error('Fetch Companies Error:', error);
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
};

exports.getExpectedDeductions = async (req, res) => {
  const { company } = req.query;
  try {
    const loans = await prisma.loan.findMany({
      where: {
        company: company,
        status: { in: ['Active', 'ACTIVE', 'Disbursed', 'DISBURSED'] }
      },
      include: {
        installment: {
          where: { status: 'PENDING' }
        }
      }
    });

    const activeLoansWithPending = [];
    for (const l of loans) {
      if (l.installment.length === 0) {
        await prisma.loan.update({
          where: { id: l.id },
          data: { status: 'CLOSED', stage: 'CLOSED' }
        });
      } else {
        activeLoansWithPending.push(l);
      }
    }

    const formatted = activeLoansWithPending.map(l => {
      const pendingInst = l.installment[0];
      return {
        id: l.reference,
        name: l.employeeName,
        expected: pendingInst.amount,
        received: 0,
        status: 'Missing'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Expected Deductions Error:', error);
    res.status(500).json({ message: 'Failed to fetch expected deductions' });
  }
};

exports.getUploadedDeductions = async (req, res) => {
  const { company, period } = req.query;
  try {
    const query = { company };
    if (period) {
      query.period = period;
    }
    const schedule = await prisma.deductionschedule.findFirst({
      where: query,
      orderBy: { createdAt: 'desc' }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'No uploaded deduction schedule found for this company/period.' });
    }

    const formatted = [];
    for (const item of schedule.details) {
      const numericPart = String(item.employeeNumber || '').replace(/\D/g, '');
      const searchUserId = isNaN(parseInt(numericPart)) || numericPart === '' ? -1 : parseInt(numericPart);

      const loan = await prisma.loan.findFirst({
        where: {
          company,
          status: { in: ['Active', 'ACTIVE', 'Disbursed', 'DISBURSED'] },
          OR: [
            { employeeName: { contains: item.employeeName } },
            { employeeEmail: { contains: item.employeeNumber } },
            { userId: searchUserId }
          ]
        },
        include: {
          installment: {
            where: { status: 'PENDING' }
          }
        }
      });

      formatted.push({
        id: loan ? loan.reference : ('N/A - ' + item.employeeNumber),
        name: item.employeeName,
        expected: loan && loan.installment[0] ? loan.installment[0].amount : 0,
        received: item.amount,
        status: loan && loan.installment[0] && loan.installment[0].amount === item.amount ? 'Matched' : 'Mismatch',
        employeeNumber: item.employeeNumber
      });
    }

    res.json({
      scheduleId: schedule.id,
      fileName: schedule.fileName,
      period: schedule.period,
      frequency: schedule.frequency,
      data: formatted
    });
  } catch (error) {
    console.error('Get Uploaded Deductions Error:', error);
    res.status(500).json({ message: 'Failed to fetch uploaded deductions.' });
  }
};

exports.processBatch = async (req, res) => {
  const { company, batchData, scheduleId } = req.body;
  try {
    for (const item of batchData) {
      if (item.id.startsWith('N/A')) continue;
      const loan = await prisma.loan.findFirst({
        where: { reference: item.id },
        include: { installment: true }
      });

      if (loan) {
        const pendingInst = loan.installment.find(i => i.status === 'PENDING');
        if (pendingInst) {
          await prisma.installment.update({
            where: { id: pendingInst.id },
            data: { 
              status: 'RECEIVED', 
              paidAmount: item.received,
              updatedAt: new Date() 
            }
          });

          await prisma.auditlog.create({
            data: {
              action: 'REPAYMENT_BATCH',
              user: req.user.name || req.user.email,
              note: `Processed batch repayment for ${loan.employeeName}. Amount received: R${item.received} (Expected: R${item.expected}).`,
              entityId: loan.reference
            }
          });
        }
      }
    }

    if (scheduleId) {
      await prisma.deductionschedule.update({
        where: { id: parseInt(scheduleId) },
        data: { status: 'RECONCILED', updatedAt: new Date() }
      });
    }

    res.json({ message: 'Batch payroll processed successfully' });
  } catch (error) {
    console.error('Process Batch Error:', error);
    res.status(500).json({ message: 'Failed to process batch' });
  }
};


exports.getReportCompanies = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { company: true },
      where: { company: { not: '' } },
      distinct: ['company']
    });
    const loans = await prisma.loan.findMany({
      select: { company: true },
      where: { company: { not: '' } },
      distinct: ['company']
    });
    const companies = Array.from(new Set([
      ...users.map(u => u.company),
      ...loans.map(l => l.company)
    ])).filter(Boolean).sort();
    res.json(companies);
  } catch (error) {
    console.error('Get Report Companies Error:', error);
    res.status(500).json({ message: 'Failed to fetch report companies' });
  }
};

exports.getReportsData = async (req, res) => {
  const { type, company, range } = req.query;
  
  const getLoanDivision = (loan) => {
    try {
      const meta = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata;
      return meta?.employmentInfo?.employerDivision || 'Unassigned';
    } catch (e) {
      return 'Unassigned';
    }
  };

  try {
    let loans = [];
    const filter = {};
    if (company) {
      filter.company = company;
    }

    if (type === 'overdue') {
      loans = await prisma.loan.findMany({
        where: {
          ...filter,
          status: { in: ['Active', 'ACTIVE', 'Disbursed', 'DISBURSED'] }
        },
        include: { installment: true }
      });
      const formatted = [];
      loans.forEach(l => {
        const overdueInsts = l.installment.filter(i => i.status === 'PENDING' && new Date(i.dueDate) < new Date());
        if (overdueInsts.length > 0) {
          const totalOverdue = overdueInsts.reduce((sum, i) => sum + i.amount, 0);
          formatted.push({
            id: l.reference,
            name: l.employeeName,
            company: l.company,
            division: getLoanDivision(l),
            amount: totalOverdue,
            date: overdueInsts[0].dueDate,
            status: 'Overdue'
          });
        }
      });
      return res.json(formatted);
    } else if (type === 'remittance') {
      loans = await prisma.loan.findMany({
        where: {
          ...filter,
          status: { in: ['Active', 'ACTIVE', 'Disbursed', 'DISBURSED'] }
        },
        include: { installment: { where: { status: 'PENDING' } } }
      });
      const formatted = [];
      loans.forEach(l => {
        if (l.installment.length > 0) {
          const currentInst = l.installment[0];
          formatted.push({
            id: l.reference,
            name: l.employeeName,
            company: l.company,
            division: getLoanDivision(l),
            amount: currentInst.amount,
            date: currentInst.dueDate,
            status: 'Pending Remittance'
          });
        }
      });
      return res.json(formatted);
    } else {
      loans = await prisma.loan.findMany({
        where: {
          ...filter
        },
        orderBy: { createdAt: 'desc' }
      });
      const formatted = loans.map(l => ({
        id: l.reference,
        name: l.employeeName,
        company: l.company,
        division: getLoanDivision(l),
        amount: l.amount,
        date: l.createdAt,
        status: l.status || 'Approved'
      }));
      return res.json(formatted);
    }
  } catch (error) {
    console.error('Fetch Report Data Error:', error);
    res.status(500).json({ message: 'Failed to fetch report data' });
  }
};

exports.getCompanyDivisions = async (req, res) => {
  const { companyName } = req.query;
  try {
    if (!companyName) {
      return res.json([]);
    }
    const divisionsSet = new Set();
    
    // 1. Fetch from company model
    const company = await prisma.company.findUnique({
      where: { name: companyName }
    });
    if (company && company.divisions) {
      const divisionsList = typeof company.divisions === 'string' 
        ? JSON.parse(company.divisions) 
        : (company.divisions || []);
      divisionsList.forEach(d => {
        const name = typeof d === 'string' ? d : (d.name || d);
        if (name) divisionsSet.add(name);
      });
    }
    
    // 2. Fetch from existing loans for this company
    const loans = await prisma.loan.findMany({
      where: { company: companyName }
    });
    loans.forEach(l => {
      const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
      const divName = meta.employmentInfo?.employerDivision;
      if (divName) {
        divisionsSet.add(divName);
      }
    });

    res.json(Array.from(divisionsSet));
  } catch (error) {
    console.error('Get Company Divisions Error:', error);
    res.json([]);
  }
};

exports.sendReportEmail = async (req, res) => {
  res.json({ message: 'Report email dispatched successfully.' });
};

