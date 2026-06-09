const prisma = require('../config/db');

exports.apply = async (req, res) => {
  try {
    const { 
      personalInfo, 
      employmentInfo, 
      financialInfo, 
      loanRequest, 
      agreement 
    } = req.body;

    // Parse JSON strings if sent as strings (from FormData)
    const pInfo = typeof personalInfo === 'string' ? JSON.parse(personalInfo) : personalInfo;
    const eInfo = typeof employmentInfo === 'string' ? JSON.parse(employmentInfo) : employmentInfo;
    const fInfo = typeof financialInfo === 'string' ? JSON.parse(financialInfo) : financialInfo;
    const lReq = typeof loanRequest === 'string' ? JSON.parse(loanRequest) : loanRequest;
    const agmt = typeof agreement === 'string' ? JSON.parse(agreement) : agreement;

    // Check backend eligibility
    const existingLoans = await prisma.loan.findMany({
      where: { userId: req.user.id },
      include: { installment: true }
    });

    const inProgressStatuses = [
      'New', 'Submitted', 'HR Pending', 'HR Approved', 'Credit Pending', 
      'Under Review', 'On Hold', 'Need More Info', 'Admin Approval', 
      'Approved', 'Counter Offer', 'Processing', 'ADMIN_APPROVAL_PENDING', 'FINANCE_PENDING'
    ].map(s => s.toLowerCase());

    const hasInProgress = existingLoans.some(l => 
      inProgressStatuses.includes((l.status || '').toLowerCase()) || 
      inProgressStatuses.includes((l.stage || '').toLowerCase())
    );

    // Check backend eligibility (Bypassed for testing / client request)
    /*
    if (hasInProgress) {
      return res.status(400).json({
        message: 'You already have a loan application in progress. You are only allowed to apply for one loan at a time.'
      });
    }

    const activeStatuses = ['active', 'disbursed', 'in arrears', 'recovery'].map(s => s.toLowerCase());
    const activeLoans = existingLoans.filter(l => 
      activeStatuses.includes((l.status || '').toLowerCase()) || 
      activeStatuses.includes((l.stage || '').toLowerCase())
    );

    for (const l of activeLoans) {
      const installments = l.installment || [];
      if (installments.length === 0) {
        return res.status(400).json({
          message: 'You have an active loan, but repayment calculations are pending. You cannot apply for a new loan at this time.'
        });
      }
      
      const totalAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);
      const totalPaid = installments
        .filter(inst => ['paid', 'received', 'completed'].includes((inst.status || '').toLowerCase()))
        .reduce((sum, inst) => sum + (inst.paidAmount || inst.amount), 0);
        
      if (totalAmount === 0 || (totalPaid / totalAmount) < 0.5) {
        const percentPaid = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
        return res.status(400).json({
          message: `You currently have an active loan and have only repaid ${percentPaid}% of it. You are eligible for a new loan only after 50% of your current loan has been paid.`
        });
      }
    }
    */

    const documentUrls = {};
    if (!req.files || !req.files['latestPayslip'] || !req.files['signature'] || !req.files['idDocument'] || !req.files['bankStatement']) {
      return res.status(400).json({ 
        message: 'Missing mandatory documents. ID Copy, Latest Payslip, Bank Statement, and Employee Signature are required to apply for a loan.' 
      });
    }

    const loanAmt = parseFloat(lReq.amount);
    if (isNaN(loanAmt) || loanAmt < 400 || loanAmt > 8000 || loanAmt % 400 !== 0) {
      return res.status(400).json({
        message: 'Loan amount must be between R400 and R8000 in increments of R400.'
      });
    }

    Object.keys(req.files).forEach(key => {
      documentUrls[key] = req.files[key][0].path;
    });

    // 1. Verify employee active status
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!dbUser || dbUser.status !== 'Active') {
      return res.status(403).json({
        message: 'Your user account is not active. Loan applications are blocked.'
      });
    }

    // 2. Verify employee belongs to company
    if (dbUser.company !== eInfo.employerName) {
      return res.status(400).json({
        message: `Company mismatch: You are registered under "${dbUser.company}" but trying to apply under "${eInfo.employerName}".`
      });
    }

    // 3. Fetch company
    const company = await prisma.company.findUnique({
      where: { name: eInfo.employerName || 'Unknown' }
    });

    if (!company) {
      return res.status(400).json({
        message: `Company "${eInfo.employerName}" not found.`
      });
    }

    // 4. Verify employee number against company roster (strict check)
    let allowedNumbers = [];
    if (company.employeeNumbers) {
      try {
        allowedNumbers = typeof company.employeeNumbers === 'string'
          ? JSON.parse(company.employeeNumbers)
          : (Array.isArray(company.employeeNumbers) ? company.employeeNumbers : []);
      } catch (parseErr) {
        console.error("Failed to parse company employeeNumbers JSON:", parseErr);
      }
    }

    if (allowedNumbers.length === 0) {
      return res.status(400).json({
        message: `No active employee roster found for ${eInfo.employerName}. Loan applications are blocked until your HR uploads the employee roster.`
      });
    }

    const empNum = String(eInfo.employeeNumber || '').trim().toUpperCase();
    const isVerified = allowedNumbers.map(n => String(n).trim().toUpperCase()).includes(empNum);
    
    if (!isVerified) {
      return res.status(400).json({
        message: `Employee number "${eInfo.employeeNumber}" is not verified/found for ${eInfo.employerName}. Please check your number or contact your HR department.`
      });
    }

    const reference = lReq.reference || `LMS-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const loan = await prisma.loan.create({
      data: {
        reference,
        amount: parseFloat(lReq.amount),
        userId: req.user.id,
        company: eInfo.employerName || 'Unknown',
        employeeEmail: req.user.email,
        employeeName: `${pInfo.name} ${pInfo.surname}`.trim() || 'Unknown',
        status: 'pending',
        stage: 'SUBMITTED',
        kickbackRate: company?.kickbackRate || 0,
        discountRate: company?.discountRate || 0,
        kickbackType: company?.kickbackType || 'PERCENTAGE',
        commissionAmount: company?.commissionAmount || 0,
        discountAmount: company?.discountAmount || 0,
        updatedAt: new Date(),
        metadata: {
          personalInfo: pInfo,
          employmentInfo: eInfo,
          financialInfo: fInfo,
          loanRequest: lReq,
          agreement: agmt
        },
        documentUrls
      }
    });

    res.status(201).json({ message: 'Application submitted successfully', loanId: loan.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to submit application' });
  }
};

exports.getAllLoans = async (req, res) => {
  try {
    const query = {
      orderBy: { createdAt: 'desc' },
      include: { installment: true }
    };

    if (req.user && req.user.role === 'employee') {
      query.where = { userId: req.user.id };
    }

    const loans = await prisma.loan.findMany(query);
    res.json(loans);
  } catch (error) {
    console.error('Fetch All Loans Error:', error);
    res.status(500).json({ message: 'Failed to fetch loans' });
  }
};

exports.getLoanById = async (req, res) => {
  try {
    const loan = await prisma.loan.findFirst({
      where: { 
        id: parseInt(req.params.id),
        userId: req.user.id 
      }
    });

    if (!loan) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Retrieve company details for the signatory information
    let companyRecord = null;
    if (loan.company) {
      companyRecord = await prisma.company.findUnique({
        where: { name: loan.company }
      });
    }

    const loanWithCompany = {
      ...loan,
      companyRecord
    };

    res.json(loanWithCompany);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
