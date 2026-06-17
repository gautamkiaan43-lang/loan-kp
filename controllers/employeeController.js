const prisma = require('../config/db');
const { LOAN_MATRIX } = require('../utils/repaymentMatrix');
const { calculateOutstandingBalance, calculateSettlementAmount, getClosestMatrixAmount, getLoanMatrixValues, calculateEarlySettlement } = require('../utils/settlementCalculator');

const mapStageToFriendlyText = (stage, status) => {
  const s = (stage || status || '').toUpperCase();
  if (s.includes('ADMIN_APPROVAL')) return 'Credit Approved';
  if (s.includes('HR_VERIFIED') || s.includes('CREDIT_PENDING')) return 'Credit Assessment Pending';
  if (s.includes('HR_PENDING')) return 'HR Verification Pending';
  if (s.includes('DISBURSED') || s.includes('ACTIVE')) return 'Active';
  if (s.includes('REJECTED') || s.includes('DECLINED')) return 'Declined';
  if (s.includes('COUNTER_OFFER') || s.includes('COUNTER OFFER')) return 'Counter Offer';
  return stage || status || 'Pending';
};


exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all loans for this user
    const loans = await prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get active loan for summary
    const activeLoan = await prisma.loan.findFirst({
      where: {
        userId,
        OR: [
          { status: { in: ['active', 'disbursed', 'ACTIVE', 'DISBURSED'] } },
          { stage: { in: ['active', 'ACTIVE'] } }
        ]
      },
      include: {
        installment: true,
        interest_allocations: true,
        service_fee_allocations: true
      }
    });

    // Calculate balance
    let balance = 0;
    let nextDeduction = 'N/A';

    if (activeLoan) {
      balance = calculateOutstandingBalance(activeLoan);
      const pendingInstallments = activeLoan.installment.filter(i => i.status === 'PENDING');

      if (pendingInstallments.length > 0) {
        const earliest = pendingInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
        nextDeduction = new Date(earliest.dueDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    }

    const activityData = loans.map(l => ({
      id: l.id,
      reference: l.reference || `LMS-${l.id.toString().padStart(4, '0')}`,
      date: l.createdAt.toLocaleDateString('en-GB'),
      amount: `R ${l.amount.toLocaleString()}`,
      status: mapStageToFriendlyText(l.stage, l.status)
    }));

    // 1. Dynamic Net Income & Affordability calculations
    let grossIncome = 5000;
    let expenses = 3000;
    // Debug logs for financial inputs
    console.log('Gross Income:', grossIncome, 'Expenses:', expenses);

    // Check if the applicant has submitted financial information previously
    if (loans.length > 0 && loans[0].metadata) {
      const meta = typeof loans[0].metadata === 'string' ? JSON.parse(loans[0].metadata) : loans[0].metadata;
      if (meta.financialInfo) {
        grossIncome = parseFloat(meta.financialInfo.grossIncome) || 5000;
        expenses = parseFloat(meta.financialInfo.expenses) || 3000;
      }
    }

    const netIncome = Math.max(0, grossIncome - expenses);
    const maxAffordableRepayment = netIncome * 0.3; // 30% Affordability
    console.log('Net Income:', netIncome, 'Max Affordable Repayment:', maxAffordableRepayment);

    // 2. Identify highest eligible loan product from Loan Matrix (monthly repayment <= affordable amount)
    let eligibleLoanAmount = 0;
    let loanTerm = 'N/A';
    let monthlyRepayment = 0;

    const sortedPrincipals = Object.keys(LOAN_MATRIX).map(Number).sort((a, b) => b - a);

    for (const amt of sortedPrincipals) {
        let found = false;
        const terms = Object.keys(LOAN_MATRIX[amt]).map(Number).sort((a, b) => b - a);
        for (const t of terms) {
          const monthly = LOAN_MATRIX[amt][t].monthly;
          if (monthly <= maxAffordableRepayment) {
            eligibleLoanAmount = amt;
            loanTerm = `${t} Month${t > 1 ? 's' : ''}`;
            monthlyRepayment = monthly;
            found = true;
            console.log('Eligible loan found:', { amount: amt, term: loanTerm, monthlyRepayment });
            break;
          }
        }
        if (found) {
          break;
        }
      }

    // 3. Current Settlement and Valid Until Dates (Current Date + 7 Days)
    let settlementDetails = null;
    if (activeLoan) {
      settlementDetails = await calculateEarlySettlement(activeLoan, false, new Date());
    }
    const currentSettlementAmount = settlementDetails ? settlementDetails.settlementAmount : 0;
    const currentSettlementSaving = settlementDetails ? settlementDetails.settlementSaving : 0;
    const settlementValidUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // 4. Final Payout = Eligible Loan Amount - Current Settlement Amount
    const finalPayout = eligibleLoanAmount - currentSettlementAmount;
    console.log('Eligible Loan Amount:', eligibleLoanAmount, 'Current Settlement Amount:', currentSettlementAmount, 'Final Payout:', finalPayout);

    let companyConfig = null;
    if (req.user.company) {
      const comp = await prisma.company.findUnique({
        where: { name: req.user.company }
      });
      if (comp) {
        companyConfig = {
          discountAmount: comp.discountAmount || 0,
          discountRate: comp.discountRate || 0,
          authorized_signatory_name: comp.authorized_signatory_name || '',
          authorized_signatory_designation: comp.authorized_signatory_designation || '',
          authorized_signatory_email: comp.authorized_signatory_email || '',
          authorized_signatory_phone: comp.authorized_signatory_phone || '',
          authorized_signatory_signature: comp.authorized_signatory_signature || null
        };
      }
    }

    res.json({
      stats: {
        loanStatus: activeLoan ? 'Active' : (loans.length > 0 ? mapStageToFriendlyText(loans[0].stage, loans[0].status) : 'No Active Loans'),
        currentBalance: `R ${balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        settlementAmount: `R ${currentSettlementAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        settlementValidUntil,
        grossIncome: `R ${grossIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        expenses: `R ${expenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        netIncome: `R ${netIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        maxAffordableRepayment: `R ${maxAffordableRepayment.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        eligibleLoanAmount: `R ${eligibleLoanAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        loanTerm,
        monthlyRepayment: `R ${monthlyRepayment.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        currentSettlementAmount: `R ${currentSettlementAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        finalPayout: finalPayout <= 0 ? 'Not Eligible for Refinancing' : `R ${finalPayout.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        rawGrossIncome: grossIncome,
        rawExpenses: expenses,
        rawNetIncome: netIncome,
        rawMaxAffordableRepayment: maxAffordableRepayment,
        rawEligibleLoanAmount: eligibleLoanAmount,
        rawMonthlyRepayment: monthlyRepayment,
        rawCurrentSettlementAmount: currentSettlementAmount,
        rawFinalPayout: finalPayout
      },
      recentActivity: activityData,
      companyConfig
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getStatements = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all loans and their installments
    const loans = await prisma.loan.findMany({
      where: { userId },
      include: { installment: { orderBy: { dueDate: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    });

    const loanStatements = loans.map(loan => {
      const statusUpper = (loan.status || '').toUpperCase();
      const stageUpper = (loan.stage || '').toUpperCase();

      const isDisbursed = ['ACTIVE', 'DISBURSED', 'PAID']
    .some(x => statusUpper.includes(x)) ||
    ['ACTIVE', 'DISBURSED', 'PAID']
    .some(x => stageUpper.includes(x));

      const loanTransactions = [];

      // Add disbursement entry
      if (isDisbursed) {
        loanTransactions.push({
          id: `DISB-${loan.id}`,
          type: 'DISBURSEMENT',
          label: 'Loan Disbursement',
          date: loan.createdAt,
          amount: loan.amount,
          status: 'COMPLETED',
          reference: loan.reference
        });
      }

      // Add each installment
      loan.installment.forEach(inst => {
        const instStatus = (inst.status || '').toUpperCase();
        loanTransactions.push({
          id: `INST-${inst.id}`,
          type: 'REPAYMENT',
          label: 'Salary Deduction Repayment',
          date: inst.dueDate,
          amount: inst.amount,
          status: instStatus,
          reference: loan.reference
        });
      });

      // Sort transactions: newest first
      loanTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Per-loan summary
      const totalDisbursed = isDisbursed ? loan.amount : 0;
      const totalRepaid = loan.installment
        .filter(i => ['PAID', 'RECEIVED', 'COMPLETED'].includes((i.status || '').toUpperCase()))
        .reduce((sum, i) => sum + i.amount, 0);
      const balance = Math.max(0, totalDisbursed - totalRepaid);

      const pendingInstallments = loan.installment.filter(i => (i.status || '').toUpperCase() === 'PENDING');
      const nextInst = pendingInstallments.length > 0 ? pendingInstallments[0] : null;

      // Friendly status label
      const friendlyStatus = (() => {
        const s = stageUpper || statusUpper;
        if (s.includes('ACTIVE') || s.includes('DISBURSED')) return 'Active';
        if (s.includes('PAID') || s.includes('CLOSED')) return 'Closed';
        if (s.includes('REJECTED') || s.includes('DECLINED')) return 'Declined';
        if (s.includes('ADMIN_APPROVAL')) return 'Credit Approved';
        if (s.includes('HR')) return 'HR Verification';
        return loan.status || 'Pending';
      })();

      return {
        loanId: loan.id,
        reference: loan.reference || `LMS-${String(loan.id).padStart(4, '0')}`,
        amount: loan.amount,
        disbursedAt: loan.createdAt,
        status: friendlyStatus,
        summary: {
          totalDisbursed: isDisbursed ? `R ${totalDisbursed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : 'R 0.00',
          totalRepaid: `R ${totalRepaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          balance: `R ${balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          nextPayment: nextInst ? `R ${nextInst.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : 'N/A',
          nextPaymentDate: nextInst
            ? new Date(nextInst.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'N/A'
        },
        transactions: loanTransactions
      };
    });

    // Overall summary across all loans
    const grandTotalDisbursed = loanStatements.reduce((sum, l) => {
      const raw = parseFloat((l.summary.totalDisbursed || '').replace(/[^0-9.]/g, '')) || 0;
      return sum + raw;
    }, 0);
    const grandTotalRepaid = loanStatements.reduce((sum, l) => {
      const raw = parseFloat((l.summary.totalRepaid || '').replace(/[^0-9.]/g, '')) || 0;
      return sum + raw;
    }, 0);

    res.json({
      loans: loanStatements,
      overall: {
        totalLoans: loans.length,
        totalDisbursed: `R ${grandTotalDisbursed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        totalRepaid: `R ${grandTotalRepaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        outstandingBalance: `R ${Math.max(0, grandTotalDisbursed - grandTotalRepaid).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
      }
    });
  } catch (error) {
    console.error('Statements Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLatestLoan = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Try to find the most recent ACTIVE or DISBURSED loan with installments
    let loan = await prisma.loan.findFirst({
      where: {
        userId,
        OR: [
          { status: { in: ['ACTIVE', 'active', 'DISBURSED', 'disbursed'] } },
          { stage:  { in: ['ACTIVE', 'active', 'DISBURSED', 'disbursed'] } }
        ]
      },
      include: {
        installment: { orderBy: { dueDate: 'asc' } },
        interest_allocations: true,
        service_fee_allocations: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fallback: any loan for this user, newest first
    if (!loan) {
      loan = await prisma.loan.findFirst({
        where: { userId },
        include: {
          installment: { orderBy: { dueDate: 'asc' } },
          interest_allocations: true,
          service_fee_allocations: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!loan) {
      return res.status(404).json({ message: 'No applications found' });
    }

    const metadata = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : (loan.metadata || {});

    // Build outstanding amount from installments
    const pendingInstallments = loan.installment.filter(i =>
      !['PAID', 'RECEIVED', 'COMPLETED'].includes((i.status || '').toUpperCase())
    );
    const outstandingAmount = pendingInstallments.reduce((s, i) => s + Math.max(0, i.amount - (i.paidAmount || 0)), 0);

    const paidAmount = loan.installment
      .filter(i => ['PAID', 'RECEIVED', 'COMPLETED'].includes((i.status || '').toUpperCase()))
      .reduce((s, i) => s + (i.paidAmount || i.amount), 0);

    const nextDue = pendingInstallments[0] || null;
    const settlementDetails = await calculateEarlySettlement(loan, false, new Date());

    // Resolve documentUrls fallback if empty or null
    let documentUrls = loan.documentUrls;
    const isDocUrlsEmpty = (urls) => {
      if (!urls) return true;
      try {
        const parsed = typeof urls === 'string' ? JSON.parse(urls) : urls;
        return Object.keys(parsed || {}).length === 0;
      } catch (e) {
        return true;
      }
    };

    if (isDocUrlsEmpty(documentUrls)) {
      const prevLoans = await prisma.loan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      const prevLoanWithDocs = prevLoans.find(l => !isDocUrlsEmpty(l.documentUrls));
      if (prevLoanWithDocs) {
        documentUrls = prevLoanWithDocs.documentUrls;
      } else {
        documentUrls = {
          idDocument: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          latestPayslip: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          bankStatement: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          signature: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        };
      }
    }

    res.json({
      id: loan.id,
      reference: loan.reference,
      amount: loan.amount,
      status: loan.status,
      stage: loan.stage,
      date: loan.createdAt,
      metadata,
      documentUrls,
      counterOfferAmount: metadata.counterOffer?.amount || null,
      counterOfferTerm: metadata.counterOffer?.term || null,
      // Letter-generation fields
      outstandingAmount,
      paidAmount,
      installment: loan.installment,
      nextDueDate: nextDue?.dueDate || null,
      name: req.user.name || loan.employeeName,
      email: req.user.email || loan.employeeEmail,
      company: req.user.company || loan.company,
      // Financial info from metadata
      salary: metadata.financialInfo?.grossIncome || null,
      grossIncome: metadata.financialInfo?.grossIncome || null,
      expenses: metadata.financialInfo?.expenses || null,
      // Early Settlement fields
      settlementAmount: settlementDetails?.settlementAmount || 0,
      settlementSaving: settlementDetails?.settlementSaving || 0,
      unearnedInterest: settlementDetails?.unearnedInterest || 0,
      unearnedServiceFees: settlementDetails?.unearnedServiceFees || 0,
      quoteDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('GetLatestLoan Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.decideCounterOffer = async (req, res) => {
  const { loanId, decision } = req.body;

  try {
    const loan = await prisma.loan.findFirst({
      where: {
        id: Number(loanId),
        userId: req.user.id
      }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const metadata = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : (loan.metadata || {});
    if (!metadata.counterOffer) {
      return res.status(400).json({ message: 'No counter-offer found for this application' });
    }

    const isAccept = decision === 'ACCEPT' || decision === 'APPROVE';
    const newAmount = isAccept ? metadata.counterOffer.amount : loan.amount;

    if (isAccept) {
      if (!metadata.loanRequest) {
        metadata.loanRequest = {};
      }
      metadata.loanRequest.term = String(metadata.counterOffer.term);
      metadata.counterOfferAccepted = true;
    }

    // Update loan status
    const updatedLoan = await prisma.loan.update({
      where: { id: loan.id },
      data: {
        amount: newAmount,
        status: isAccept ? 'Credit Approved' : 'Credit Rejected',
        stage: isAccept ? 'ADMIN_APPROVAL' : 'REJECTED',
        metadata: metadata,
        updatedAt: new Date()
      }
    });

    // Log the action
    await prisma.auditlog.create({
      data: {
        action: isAccept ? 'EMPLOYEE_ACCEPT_COUNTER' : 'EMPLOYEE_DECLINE_COUNTER',
        user: req.user.name || req.user.email,
        note: isAccept
          ? `Accepted counter-offer: R ${newAmount.toLocaleString()}`
          : `Declined counter-offer`,
        entityId: String(loanId)
      }
    });

    res.json({ message: `Counter-offer ${isAccept ? 'accepted' : 'declined'} successfully`, loan: updatedLoan });
  } catch (error) {
    console.error('Decide Counter Offer Error:', error);
    res.status(500).json({ message: 'Failed to process decision' });
  }
};

exports.verifyEmployeeNumber = async (req, res) => {
  try {
    const { employeeNumber, company } = req.query;
    const userCompany = req.user.company || company;

    if (!employeeNumber || !userCompany) {
      return res.status(400).json({ message: 'Employee number and company are required.' });
    }

    const companyRecord = await prisma.company.findUnique({
      where: { name: userCompany }
    });

    if (!companyRecord) {
      return res.json({ verified: false, message: '❌ Company not found' });
    }

    let allowedNumbers = [];
    if (companyRecord.employeeNumbers) {
      try {
        allowedNumbers = typeof companyRecord.employeeNumbers === 'string'
          ? JSON.parse(companyRecord.employeeNumbers)
          : (Array.isArray(companyRecord.employeeNumbers) ? companyRecord.employeeNumbers : []);
      } catch (parseErr) {
        console.error("Failed to parse company employeeNumbers JSON:", parseErr);
      }
    }

    if (allowedNumbers.length === 0) {
      return res.json({ verified: false, message: '❌ No active employee roster uploaded by HR' });
    }

    const empNum = String(employeeNumber).trim().toUpperCase();
    const isVerified = allowedNumbers.map(n => String(n).trim().toUpperCase()).includes(empNum);

    if (!isVerified) {
      return res.json({ verified: false, message: '❌ Employee Not Found' });
    }

    // Auto Employee Lookup: Fetch name, department, position from their latest loan application
    // if it exists in the database
    let lookupData = null;
    const loans = await prisma.loan.findMany({
      where: { company: userCompany },
      orderBy: { createdAt: 'desc' }
    });

    for (const l of loans) {
      if (l.metadata) {
        const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata;
        if (meta.employmentInfo && String(meta.employmentInfo.employeeNumber).trim().toUpperCase() === empNum) {
          lookupData = {
            employeeName: l.employeeName || (meta.personalInfo ? `${meta.personalInfo.name} ${meta.personalInfo.surname}`.trim() : ''),
            department: meta.employmentInfo.employerDivision || '',
            company: l.company,
            position: meta.employmentInfo.positionTitle || ''
          };
          break;
        }
      }
    }

    return res.json({
      verified: true,
      message: '✅ Employee Found',
      lookupData
    });
  } catch (error) {
    console.error('Verify Employee Number Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
