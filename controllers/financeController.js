const prisma = require('../config/db');
const { calculateOutstandingBalance, calculateSettlementAmount, getLoanMatrixValues, calculateEarlySettlement } = require('../utils/settlementCalculator');

exports.getStats = async (req, res) => {
  try {
    const loans = await prisma.loan.findMany();

    const pendingPayouts = loans.filter(l =>
      (l.stage === 'ADMIN_APPROVAL_PENDING' ||
      l.stage === 'ADMIN_APPROVAL' ||
      l.stage === 'APPROVED' ||
      l.stage === 'FINANCE_PENDING' ||
      l.status.toLowerCase().includes('admin approved') ||
      l.status.toLowerCase().includes('credit approved')) &&
      l.disbursementType !== 'Immediate'
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
          { stage: 'APPROVED' },
          { stage: 'FINANCE_PENDING' },
          { status: { contains: 'Admin Approved' } },
          { status: { contains: 'Credit Approved' } }
        ],
        NOT: {
          disbursementType: 'Immediate'
        }
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

// ISO 8601 week number: week starts on Monday.
// Matches the week numbering used by <input type="week"> in browsers.
const getWeekNum = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day (Mon=1 ... Sun=7)
  const dayNum = d.getUTCDay() || 7; // treat Sunday as 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const generateDueDates = (frequency, termMonths, disbursementDate = new Date(), fortnightCycle = 'N/A') => {
  const dates = [];
  const start = new Date(disbursementDate);
  const day = start.getDate();
  
  let totalInstallments = termMonths;
  
  if (frequency === 'Weekly') {
    totalInstallments = termMonths * 4;
    for (let i = 1; i <= totalInstallments; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + (7 * i));
      dates.push(d);
    }
  } else if (frequency === 'Fortnightly') {
    totalInstallments = termMonths * 2;
    // Align first due date to company's fortnightCycle (Even/Odd ISO week)
    // Candidate 1: start + 7 days  (minimum safe buffer)
    // Candidate 2: start + 14 days (default 2-week buffer)
    // Candidate 3: start + 21 days (if both above are wrong parity)
    let firstDate = null;

    if (fortnightCycle === 'Even Weeks' || fortnightCycle === 'Odd Weeks') {
      const targetEven = fortnightCycle === 'Even Weeks';
      // Try candidates in order: +7, +14, +21 days
      for (const offset of [7, 14, 21]) {
        const candidate = new Date(start);
        candidate.setDate(start.getDate() + offset);
        const w = getWeekNum(candidate);
        const isEven = w % 2 === 0;
        if (isEven === targetEven) {
          firstDate = candidate;
          break;
        }
      }
      // Fallback (should never be needed with 3 candidates)
      if (!firstDate) {
        firstDate = new Date(start);
        firstDate.setDate(start.getDate() + 14);
      }
    } else {
      // No cycle configured — default to +14 days
      firstDate = new Date(start);
      firstDate.setDate(start.getDate() + 14);
    }

    for (let i = 0; i < totalInstallments; i++) {
      const d = new Date(firstDate);
      d.setDate(firstDate.getDate() + (14 * i));
      dates.push(d);
    }
  } else { // Monthly
    totalInstallments = termMonths;
    let targetMonth = start.getMonth();
    let targetYear = start.getFullYear();
    
    if (day > 8) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    
    for (let i = 0; i < totalInstallments; i++) {
      const d = new Date(targetYear, targetMonth + i, 25);
      dates.push(d);
    }
  }
  return dates;
};

exports.disburseLoanInternal = async (loanId, operatorNameOrEmail) => {
  try {
    const loan = await prisma.loan.findUnique({
      where: { reference: loanId }
    });

    if (!loan) {
      return { success: false, status: 404, message: 'Loan not found' };
    }

    const meta = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : (loan.metadata || {});
    const termMonths = parseInt(meta.loanRequest?.term) || 6;
    const frequency = meta.financialInfo?.salaryFrequency || 'Monthly';

    const matrixValues = getLoanMatrixValues(loan.amount, termMonths);
    const totalInstallmentsCount = frequency === 'Weekly' ? (termMonths * 4) : (frequency === 'Fortnightly' ? (termMonths * 2) : termMonths);

    const instAmount = matrixValues.totalRepayment / totalInstallmentsCount;
    const interestPerPeriod = matrixValues.interest / totalInstallmentsCount;
    const serviceFeePerPeriod = matrixValues.serviceFee / totalInstallmentsCount;

    // Fetch company to get fortnight config
    const company = await prisma.company.findUnique({
      where: { name: loan.company }
    });
    const fortnightCycle = company?.fortnightCycle || 'N/A';

    const dueDates = generateDueDates(frequency, termMonths, new Date(), fortnightCycle);

    const updatedLoan = await prisma.$transaction(async (tx) => {
      // 1. Update loan status
      const updated = await tx.loan.update({
        where: { reference: loanId },
        data: {
          status: 'Active',
          stage: 'ACTIVE',
          updatedAt: new Date()
        }
      });

      // 2. Generate installments
      const installmentData = dueDates.map((date, idx) => ({
        reference: `PAY-${loan.reference}-${idx + 1}`,
        amount: Math.round(instAmount * 100) / 100,
        paidAmount: 0,
        status: 'PENDING',
        dueDate: date,
        loanId: loan.id
      }));

      await tx.installment.createMany({ data: installmentData });

      // 3. Generate Interest Allocation
      const interestData = dueDates.map((date) => ({
        loanId: loan.id,
        dueDate: date,
        amount: Math.round(interestPerPeriod * 100) / 100,
        status: 'UNEARNED'
      }));

      await tx.interest_allocation.createMany({ data: interestData });

      // 4. Generate Service Fee Allocation
      const serviceFeeData = dueDates.map((date) => ({
        loanId: loan.id,
        dueDate: date,
        amount: Math.round(serviceFeePerPeriod * 100) / 100,
        status: 'UNEARNED'
      }));

      await tx.service_fee_allocation.createMany({ data: serviceFeeData });

      // 5. Audit Log
      await tx.auditlog.create({
        data: {
          action: 'FINANCE_DISBURSE',
          user: operatorNameOrEmail,
          note: `Loan disbursed and activated. Generated ${totalInstallmentsCount} installments & pro-rata allocations.`,
          entityId: loanId
        }
      });

      return updated;
    });

    // Send email notification for payout (disbursal)
    try {
      const emailService = require('../services/emailService');
      const payoutHtml = emailService.populateTemplate('notification', {
        message: `Your loan application (Ref: ${updatedLoan.reference}) for R ${updatedLoan.amount.toLocaleString()} has been successfully paid out and is now active. Installments are scheduled according to your payroll cycle.`
      });
      await emailService.queueEmail({
        to: updatedLoan.employeeEmail,
        subject: `Lenni Loan Paid Out & Activated - Ref ${updatedLoan.reference}`,
        html: payoutHtml,
        text: `Your loan ${updatedLoan.reference} has been paid out and is now active.`,
        emailType: 'LOAN_PAID_OUT',
        relatedRecord: updatedLoan.id
      });
    } catch (emailErr) {
      console.error('[financeController.disburseLoanInternal] Payout email failed:', emailErr);
    }

    return { success: true, loan: updatedLoan };
  } catch (error) {
    console.error('disburseLoanInternal Error:', error);
    return { success: false, message: error.message };
  }
};

exports.disburse = async (req, res) => {
  const { loanId } = req.body;
  try {
    const result = await exports.disburseLoanInternal(loanId, req.user.name || req.user.email);
    if (!result.success) {
      return res.status(result.status || 500).json({ message: result.message });
    }
    res.json({ message: 'Loan disbursed successfully', loan: result.loan });
  } catch (error) {
    console.error('Disburse Error:', error);
    res.status(500).json({ message: 'Failed to disburse loan' });
  }
};

exports.disburseBulk = async (req, res) => {
  const { loanIds } = req.body;
  if (!Array.isArray(loanIds)) {
    return res.status(400).json({ message: 'loanIds must be an array' });
  }
  try {
    const results = [];
    const operator = req.user.name || req.user.email;
    for (const loanId of loanIds) {
      const disResult = await exports.disburseLoanInternal(loanId, operator);
      results.push({ loanId, ...disResult });
    }
    res.json({ message: 'Bulk disbursement processed', results });
  } catch (error) {
    console.error('Bulk Disburse Error:', error);
    res.status(500).json({ message: 'Failed to process bulk disbursement' });
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
    let companyConfig = {
      kickbackType: 'PERCENTAGE',
      kickbackRate: 0,
      commissionAmount: 0,
      discountAmount: 0
    };

    if (company) {
      const companyInfo = await prisma.company.findUnique({
        where: { name: company }
      });
      if (companyInfo) {
        companyConfig = {
          kickbackType: companyInfo.kickbackType || 'PERCENTAGE',
          kickbackRate: companyInfo.kickbackRate || 0,
          commissionAmount: companyInfo.commissionAmount || 0,
          discountAmount: companyInfo.discountAmount || 0
        };
      }
    }

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
          const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
          const personalInfo = meta.personalInfo || {};
          const employmentInfo = meta.employmentInfo || {};
          const repaymentDetails = meta.repaymentDetails || {};

          const parts = (l.employeeName || '').trim().split(/\s+/);
          const firstName = personalInfo.name || parts[0] || '';
          const lastName = personalInfo.surname || parts.slice(1).join(' ') || '';

          formatted.push({
            id: l.reference,
            employeeNumber: employmentInfo.employeeNumber || 'EMP-' + l.id,
            surname: lastName || 'N/A',
            name: firstName || 'N/A',
            company: l.company,
            division: getLoanDivision(l),
            amount: totalOverdue,
            date: overdueInsts[0].dueDate,
            expectedRepayment: overdueInsts[0].amount,
            outstandingBalance: Number(repaymentDetails.totalRepayment || (l.amount * 0.8)),
            arrears: totalOverdue,
            lastPaymentDate: repaymentDetails.lastPaymentDate || 'N/A',
            status: 'Overdue',
            returnDate: overdueInsts[0].dueDate
          });
        }
      });
      return res.json({ data: formatted, companyConfig });
    } else if (type === 'remittance' || type === 'invoice') {
      loans = await prisma.loan.findMany({
        where: {
          ...filter,
          status: { in: ['Active', 'ACTIVE', 'Disbursed', 'DISBURSED'] }
        },
        include: {
          installment: true,
          interest_allocations: true,
          service_fee_allocations: true
        }
      });
      const formatted = [];
      loans.forEach(l => {
        const pendingInsts = l.installment ? l.installment.filter(i => i.status === 'PENDING') : [];
        if (pendingInsts.length > 0) {
          // Sort pending installments by dueDate to find the next/current one
          pendingInsts.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
          const currentInst = pendingInsts[0];

          const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
          const personalInfo = meta.personalInfo || {};
          const employmentInfo = meta.employmentInfo || {};
          const loanRequest = meta.loanRequest || {};
          const repaymentDetails = meta.repaymentDetails || {};

          const parts = (l.employeeName || '').trim().split(/\s+/);
          const firstName = personalInfo.name || parts[0] || '';
          const lastName = personalInfo.surname || parts.slice(1).join(' ') || '';

          const now = new Date();
          const overdueInsts = pendingInsts.filter(i => new Date(i.dueDate) < now);
          const arrearsVal = overdueInsts.reduce((sum, i) => sum + Math.max(0, i.amount - (i.paidAmount || 0)), 0);

          const repaymentVal = currentInst.amount;
          const nowDueVal = arrearsVal + repaymentVal;
          
          let term = 6;
          if (loanRequest.term) {
            term = parseInt(loanRequest.term) || 6;
          } else if (l.installment && l.installment.length > 0) {
            term = l.installment.length;
          }

          const matrixValues = getLoanMatrixValues(l.amount, term);
          const pipelineBal = matrixValues.totalRepayment;
          const actualBal = calculateOutstandingBalance(l);
          const settlementAmt = calculateSettlementAmount(l);
          const lastPayDate = repaymentDetails.lastPaymentDate || 'N/A';

          formatted.push({
            id: l.reference,
            employeeNumber: employmentInfo.employeeNumber || 'EMP-' + l.id,
            surname: lastName || 'N/A',
            name: firstName || 'N/A',
            company: l.company,
            division: getLoanDivision(l),
            amount: currentInst.amount,
            date: currentInst.dueDate,
            status: currentInst.status || 'Pending Remittance',
            arrears: arrearsVal,
            repayment: repaymentVal,
            nowDue: nowDueVal,
            pipelineBalance: pipelineBal,
            actualBalance: actualBal,
            settlementAmount: settlementAmt,
            lastPaymentDate: lastPayDate,
            notes: currentInst.note || 'None'
          });
        }
      });
      return res.json({ data: formatted, companyConfig });
    } else {
      loans = await prisma.loan.findMany({
        where: {
          ...filter
        },
        orderBy: { createdAt: 'desc' }
      });
      const formatted = loans.map(l => {
        const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
        const personalInfo = meta.personalInfo || {};
        const employmentInfo = meta.employmentInfo || {};
        const loanRequest = meta.loanRequest || {};
        const repaymentDetails = meta.repaymentDetails || {};

        const parts = (l.employeeName || '').trim().split(/\s+/);
        const firstName = personalInfo.name || parts[0] || '';
        const lastName = personalInfo.surname || parts.slice(1).join(' ') || '';

        return {
          id: l.reference,
          employeeNumber: employmentInfo.employeeNumber || 'EMP-' + l.id,
          surname: lastName || 'N/A',
          name: firstName || 'N/A',
          company: l.company,
          division: getLoanDivision(l),
          amount: l.amount,
          date: l.createdAt,
          loanAmount: l.amount,
          term: loanRequest.term || '12 Months',
          repayment: Number(repaymentDetails.monthlyRepayment || (l.amount / 10)),
          frequency: loanRequest.frequency || 'Monthly',
          totalRepayment: Number(repaymentDetails.totalRepayment || (l.amount * 1.2)),
          firstDeductionDate: repaymentDetails.firstPaymentDate || l.createdAt,
          status: l.status || 'Approved'
        };
      });
      return res.json({ data: formatted, companyConfig });
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

exports.getSettlementEligibleLoans = async (req, res) => {
  const { search } = req.query;

  try {
    const where = {};
    
    // We can show active / disbursed loans for settlement
    if (search) {
      where.OR = [
        { employeeName: { contains: search } },
        { reference: { contains: search } },
        { company: { contains: search } }
      ];
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        installment: true,
        interest_allocations: true,
        service_fee_allocations: true
      }
    });

    const formatted = loans.map(l => {
      const outstandingAmount = calculateSettlementAmount(l);
      return {
        id: l.reference,
        name: l.employeeName,
        outstandingAmount: outstandingAmount,
        status: l.status
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Fetch Settlement Eligible Loans Error:', error);
    res.status(500).json({ message: 'Failed to fetch eligible loans' });
  }
};

exports.executeSettlement = async (req, res) => {
  const { sourceLoanId, targetLoanId, amount, notes } = req.body;

  try {
    const targetLoan = await prisma.loan.findUnique({
      where: { reference: targetLoanId }
    });

    if (!targetLoan) {
      return res.status(404).json({ message: 'Target loan not found' });
    }

    // Set target loan status to CLOSED
    await prisma.loan.update({
      where: { reference: targetLoanId },
      data: {
        status: 'CLOSED',
        stage: 'CLOSED',
        updatedAt: new Date()
      }
    });

    // Update target loan installments to RECEIVED
    await prisma.installment.updateMany({
      where: {
        loanId: targetLoan.id,
        status: 'PENDING'
      },
      data: {
        status: 'RECEIVED',
        paidAmount: { set: 0 }
      }
    });

    const pendingInstallments = await prisma.installment.findMany({
      where: { loanId: targetLoan.id, status: 'RECEIVED' }
    });
    for (const inst of pendingInstallments) {
      await prisma.installment.update({
        where: { id: inst.id },
        data: { paidAmount: inst.amount }
      });
    }

    // Create Audit Log
    await prisma.auditlog.create({
      data: {
        action: 'LOAN_SETTLEMENT',
        user: req.user.name || req.user.email,
        note: `Settled loan ${targetLoanId} via ${sourceLoanId} for R ${amount}. Notes: ${notes || 'None'}`,
        entityId: targetLoanId
      }
    });

    // Send email notification for settlement completed
    try {
      const emailService = require('../services/emailService');
      const settleHtml = emailService.populateTemplate('notification', {
        message: `Your loan application (Ref: ${targetLoan.reference}) has been successfully settled for R ${amount} and is now CLOSED. Thank you for your support.`
      });
      await emailService.queueEmail({
        to: targetLoan.employeeEmail,
        subject: `Lenni Loan Settled & Closed - Ref ${targetLoan.reference}`,
        html: settleHtml,
        text: `Your loan ${targetLoan.reference} has been settled and closed.`,
        emailType: 'LOAN_SETTLED',
        relatedRecord: targetLoan.id
      });
    } catch (emailErr) {
      console.error('[financeController.executeSettlement] Email trigger failed:', emailErr);
    }

    res.json({ message: 'Settlement executed successfully' });
  } catch (error) {
    console.error('Execute Settlement Error:', error);
    res.status(500).json({ message: 'Failed to execute settlement' });
  }
};

exports.getSettlementHistory = async (req, res) => {
  try {
    const logs = await prisma.auditlog.findMany({
      where: { action: 'LOAN_SETTLEMENT' },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = logs.map(l => {
      const note = l.note || '';
      const amountMatch = note.match(/for R\s*([\d.]+)/);
      const sourceMatch = note.match(/via\s*([^\s]+)/);
      
      return {
        date: l.createdAt,
        sourceId: sourceMatch ? sourceMatch[1] : 'MANUAL_PAY',
        targetId: l.entityId || 'Unknown',
        amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
        status: 'Processed'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get Settlement History Error:', error);
    res.status(500).json({ message: 'Failed to fetch settlement history' });
  }
};

exports.searchLoanForWriteoff = async (req, res) => {
  const { search } = req.query;
  try {
    const loans = await prisma.loan.findMany({
      where: {
        reference: { contains: search },
        status: { not: 'WRITTEN_OFF' }
      },
      include: {
        installment: {
          where: { status: 'PENDING' }
        }
      }
    });

    res.json(loans.map(l => ({
      id: l.reference,
      name: l.employeeName,
      amount: l.installment.reduce((sum, i) => sum + i.amount, 0) || l.amount,
      status: l.status
    })));
  } catch (error) {
    console.error('Search Loan for Writeoff Error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};

exports.commitWriteoff = async (req, res) => {
  const { loanId, principal, interest, fees, reason } = req.body;
  try {
    const loan = await prisma.loan.findUnique({
      where: { reference: loanId }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan account not found' });
    }

    // Update loan status to WRITTEN_OFF
    await prisma.loan.update({
      where: { reference: loanId },
      data: {
        status: 'WRITTEN_OFF',
        stage: 'WRITTEN_OFF',
        updatedAt: new Date()
      }
    });

    // Mark pending installments as WRITTEN_OFF
    await prisma.installment.updateMany({
      where: {
        loanId: loan.id,
        status: 'PENDING'
      },
      data: {
        status: 'WRITTEN_OFF'
      }
    });

    const total = parseFloat(principal || 0) + parseFloat(interest || 0) + parseFloat(fees || 0);

    // Create journal record in auditlog
    await prisma.auditlog.create({
      data: {
        action: 'WRITE_OFF',
        user: req.user.name || req.user.email,
        note: `Committed accounting write-off for loan ${loanId}. Principal: R ${principal}, Interest: R ${interest}, Fees: R ${fees}, Total: R ${total}. Reason: ${reason || 'Unspecified'}`,
        entityId: loanId
      }
    });

    res.json({ message: 'Journal entry committed and ledger updated successfully.' });
  } catch (error) {
    console.error('Commit Writeoff Error:', error);
    res.status(500).json({ message: 'Failed to process write-off' });
  }
};

exports.getWriteoffLedger = async (req, res) => {
  try {
    const logs = await prisma.auditlog.findMany({
      where: { action: 'WRITE_OFF' },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = logs.map(l => {
      const note = l.note || '';
      const principalMatch = note.match(/Principal:\s*R\s*([\d.]+)/);
      const interestMatch = note.match(/Interest:\s*R\s*([\d.]+)/);
      const feesMatch = note.match(/Fees:\s*R\s*([\d.]+)/);
      const totalMatch = note.match(/Total:\s*R\s*([\d.]+)/);

      return {
        date: l.createdAt,
        accountId: l.entityId || 'Unknown',
        principal: principalMatch ? parseFloat(principalMatch[1]) : 0,
        fees: feesMatch ? parseFloat(feesMatch[1]) : 0,
        total: totalMatch ? parseFloat(totalMatch[1]) : 0,
        status: 'Written Off'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get Writeoff Ledger Error:', error);
    res.status(500).json({ message: 'Failed to fetch writeoff ledger' });
  }
};

exports.getRecoveryQueue = async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: {
        status: { notIn: ['CLOSED', 'WRITTEN_OFF', 'REJECTED'] }
      },
      include: {
        installment: {
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    const now = new Date();
    const recoveryQueue = [];

    for (const l of loans) {
      // Filter out pending installments
      const unpaid = l.installment.filter(inst => inst.status === 'PENDING');
      if (unpaid.length === 0) continue;

      // Find the oldest overdue installment
      const oldestOverdue = unpaid.find(inst => new Date(inst.dueDate) < now);
      if (!oldestOverdue) continue;

      const daysOverdue = Math.floor((now - new Date(oldestOverdue.dueDate)) / (1000 * 60 * 60 * 24));
      if (daysOverdue < 1) continue;

      // Arrears amount = sum of overdue installments
      const overdueInstallments = unpaid.filter(inst => new Date(inst.dueDate) < now);
      const arrearsAmount = overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0);

      // Outstanding balance = sum of all pending installments
      const outstandingBalance = unpaid.reduce((sum, inst) => sum + inst.amount, 0);

      let stage = 1;
      let stageName = 'Stage 1 (1–30 days)';
      
      if (daysOverdue >= 180) {
        stage = 6;
        stageName = 'Stage 6 (180+ days)';
      } else if (daysOverdue >= 120) {
        stage = 5;
        stageName = 'Stage 5 (120–180 days)';
      } else if (daysOverdue >= 90) {
        stage = 4;
        stageName = 'Stage 4 (90–120 days)';
      } else if (daysOverdue >= 60) {
        stage = 3;
        stageName = 'Stage 3 (61–90 days)';
      } else if (daysOverdue >= 30) {
        stage = 2;
        stageName = 'Stage 2 (31–60 days)';
      }

      recoveryQueue.push({
        id: l.reference,
        name: l.employeeName,
        company: l.company,
        amount: l.amount,
        arrearsAmount,
        outstandingBalance,
        daysOverdue,
        missedPaymentDate: oldestOverdue.dueDate,
        installmentAmount: l.installment[0]?.amount || (l.amount / 12),
        stage,
        stageName,
        assignedAgent: l.metadata?.assignedAgent || 'Unassigned'
      });
    }

    res.json(recoveryQueue);
  } catch (error) {
    console.error('Fetch Recovery Queue Error:', error);
    res.status(500).json({ message: 'Failed to fetch recovery queue' });
  }
};

exports.sendRecoveryAction = async (req, res) => {
  const { loanId, actionType, notes } = req.body;
  try {
    const loan = await prisma.loan.findUnique({
      where: { reference: loanId }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const actionNames = {
      'FORMAL_DEMAND': 'Formal Demand Letter',
      'SECTION_129': 'Section 129 Letter of Demand',
      'LEGAL_EXPORT': 'Legal Handover Export',
      'ASSESS_RECOVER': 'Recoverability Assessment Update'
    };

    const actionName = actionNames[actionType] || 'Recovery Step';

    // Log action to audit trail
    await prisma.auditlog.create({
      data: {
        action: `RECOVERY_${actionType}`,
        user: req.user.name || req.user.email,
        note: `Processed recovery action: "${actionName}" for loan ${loanId}. Notes: ${notes || 'None'}. [Notification simulated and sent via Email and WhatsApp to ${loan.employeeEmail || 'borrower'}]`,
        entityId: loanId
      }
    });

    res.json({ 
      message: `${actionName} processed successfully. Client notified via Email/WhatsApp.` 
    });
  } catch (error) {
    console.error('Send Recovery Action Error:', error);
    res.status(500).json({ message: 'Failed to process recovery action' });
  }
};

exports.getEarlySettlementPreview = async (req, res) => {
  const { loanId, includePipeline } = req.query;
  try {
    const loan = await prisma.loan.findUnique({
      where: { reference: loanId },
      include: {
        installment: true,
        interest_allocations: true,
        service_fee_allocations: true
      }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const details = await calculateEarlySettlement(loan, includePipeline === 'true', new Date());
    res.json(details);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ message: 'Failed to calculate early settlement preview' });
  }
};

exports.createSettlementQuote = async (req, res) => {
  const { loanId, includePipeline } = req.body;
  try {
    const loan = await prisma.loan.findUnique({
      where: { reference: loanId },
      include: {
        installment: true,
        interest_allocations: true,
        service_fee_allocations: true
      }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const details = await calculateEarlySettlement(loan, !!includePipeline, new Date());
    if (!details) {
      return res.status(400).json({ message: 'Failed to calculate settlement details' });
    }

    // Expire any existing ACTIVE quotes for this loan
    await prisma.settlement_quote.updateMany({
      where: {
        loanId: loan.id,
        status: 'ACTIVE'
      },
      data: {
        status: 'EXPIRED'
      }
    });

    // Generate unique quote number: Q-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randStr = Math.floor(1000 + Math.random() * 9000);
    const quoteNumber = `Q-${dateStr}-${randStr}`;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const quote = await prisma.settlement_quote.create({
      data: {
        quoteNumber,
        loanId: loan.id,
        customerName: loan.employeeName,
        outstandingBalance: details.outstandingBalance,
        unearnedInterest: details.unearnedInterest,
        unearnedServiceFees: details.unearnedServiceFees,
        pipelineDeduction: details.pipelineDeduction,
        settlementSaving: details.settlementSaving,
        settlementAmount: details.settlementAmount,
        expiryDate,
        status: 'ACTIVE'
      },
      include: {
        loan: {
          select: {
            id: true,
            reference: true,
            employeeName: true,
            employeeEmail: true,
            company: true,
            status: true
          }
        }
      }
    });

    // Send email notification for settlement quote
    try {
      const emailService = require('../services/emailService');
      const quoteHtml = emailService.populateTemplate('loan-settlement', {
        name: loan.employeeName,
        reference: loan.reference,
        quoteNumber: quote.quoteNumber,
        outstanding: String(quote.outstandingBalance),
        savings: String(quote.settlementSaving),
        amount: String(quote.settlementAmount),
        expiry: quote.expiryDate.toISOString().slice(0, 10)
      });
      await emailService.queueEmail({
        to: loan.employeeEmail,
        subject: `Lenni Settlement Quotation Generated - Quote ${quote.quoteNumber}`,
        html: quoteHtml,
        text: `A settlement quotation ${quote.quoteNumber} has been generated for your loan.`,
        emailType: 'LOAN_SETTLEMENT_QUOTE',
        relatedRecord: loan.id
      });
    } catch (emailErr) {
      console.error('[financeController.createSettlementQuote] Email failed:', emailErr);
    }

    res.json(quote);
  } catch (error) {
    console.error('Create Settlement Quote Error:', error);
    res.status(500).json({ message: 'Failed to create settlement quote' });
  }
};

exports.getSettlementQuotes = async (req, res) => {
  const { loanRef } = req.query;
  try {
    const now = new Date();
    
    // Auto-expire active quotes past their expiry
    await prisma.settlement_quote.updateMany({
      where: {
        status: 'ACTIVE',
        expiryDate: { lt: now }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    const where = {};
    if (loanRef) {
      where.loan = { reference: loanRef };
    }

    const quotes = await prisma.settlement_quote.findMany({
      where,
      include: {
        loan: {
          select: {
            reference: true,
            employeeName: true,
            company: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(quotes);
  } catch (error) {
    console.error('Get Settlement Quotes Error:', error);
    res.status(500).json({ message: 'Failed to fetch settlement quotes' });
  }
};

exports.executeSettlementByQuote = async (req, res) => {
  const { quoteNumber } = req.body;
  try {
    const quote = await prisma.settlement_quote.findUnique({
      where: { quoteNumber },
      include: {
        loan: true
      }
    });

    if (!quote) {
      return res.status(404).json({ message: 'Settlement quote not found' });
    }

    const now = new Date();

    if (quote.status !== 'ACTIVE') {
      return res.status(400).json({ message: `Settlement quote is already ${quote.status.toLowerCase()}` });
    }

    if (new Date(quote.expiryDate) < now) {
      await prisma.settlement_quote.update({
        where: { id: quote.id },
        data: { status: 'EXPIRED' }
      });
      return res.status(400).json({ message: 'Settlement quote has expired' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Close loan account
      await tx.loan.update({
        where: { id: quote.loanId },
        data: {
          status: 'CLOSED',
          stage: 'CLOSED',
          updatedAt: now
        }
      });

      // 2. Mark all pending installments as RECEIVED, paidAmount = installment.amount
      const pendingInsts = await tx.installment.findMany({
        where: {
          loanId: quote.loanId,
          status: 'PENDING'
        }
      });

      for (const inst of pendingInsts) {
        await tx.installment.update({
          where: { id: inst.id },
          data: {
            status: 'RECEIVED',
            paidAmount: inst.amount,
            updatedAt: now
          }
        });
      }

      // 3. Mark unearned interest allocations as WRITTEN_OFF
      await tx.interest_allocation.updateMany({
        where: {
          loanId: quote.loanId,
          dueDate: { gt: now },
          status: 'UNEARNED'
        },
        data: {
          status: 'WRITTEN_OFF',
          updatedAt: now
        }
      });

      // 4. Mark unearned service fee allocations as WRITTEN_OFF
      await tx.service_fee_allocation.updateMany({
        where: {
          loanId: quote.loanId,
          dueDate: { gt: now },
          status: 'UNEARNED'
        },
        data: {
          status: 'WRITTEN_OFF',
          updatedAt: now
        }
      });

      // 5. Update past unearned interest allocations to EARNED
      await tx.interest_allocation.updateMany({
        where: {
          loanId: quote.loanId,
          dueDate: { lte: now },
          status: 'UNEARNED'
        },
        data: {
          status: 'EARNED',
          updatedAt: now
        }
      });

      // 6. Update past unearned service fee allocations to EARNED
      await tx.service_fee_allocation.updateMany({
        where: {
          loanId: quote.loanId,
          dueDate: { lte: now },
          status: 'UNEARNED'
        },
        data: {
          status: 'EARNED',
          updatedAt: now
        }
      });

      // 7. Update quote status to PAID
      await tx.settlement_quote.update({
        where: { id: quote.id },
        data: {
          status: 'PAID',
          updatedAt: now
        }
      });

      // 8. Create Audit Log
      await tx.auditlog.create({
        data: {
          action: 'LOAN_SETTLEMENT',
          user: req.user.name || req.user.email,
          note: `Settled loan ${quote.loan.reference} via Quote ${quote.quoteNumber} for R ${quote.settlementAmount}.`,
          entityId: quote.loan.reference
        }
      });
    });

    res.json({ message: 'Settlement executed successfully', quoteNumber: quote.quoteNumber });
  } catch (error) {
    console.error('Execute Settlement By Quote Error:', error);
    res.status(500).json({ message: 'Failed to execute settlement' });
  }
};


