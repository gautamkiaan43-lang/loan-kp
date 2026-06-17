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

    const documentUrls = {};
    if (!req.files || !req.files['latestPayslip'] || !req.files['signature'] || !req.files['idDocument'] || !req.files['bankStatement']) {
      return res.status(400).json({ 
        message: 'Missing mandatory documents. ID Copy, Latest Payslip, Bank Statement, and Employee Signature are required to apply for a loan.' 
      });
    }

    Object.keys(req.files).forEach(key => {
      documentUrls[key] = req.files[key][0].path;
    });

    // Fetch company defaults for rates
    const company = await prisma.company.findUnique({
      where: { name: eInfo.employerName || 'Unknown' }
    });

    // Verify employee number against company roster if one has been uploaded
    if (company && company.employeeNumbers) {
      let allowedNumbers = [];
      try {
        allowedNumbers = typeof company.employeeNumbers === 'string'
          ? JSON.parse(company.employeeNumbers)
          : (Array.isArray(company.employeeNumbers) ? company.employeeNumbers : []);
      } catch (parseErr) {
        console.error("Failed to parse company employeeNumbers JSON:", parseErr);
      }

      if (allowedNumbers && allowedNumbers.length > 0) {
        const empNum = String(eInfo.employeeNumber || '').trim().toUpperCase();
        const isVerified = allowedNumbers.map(n => String(n).trim().toUpperCase()).includes(empNum);
        
        if (!isVerified) {
          return res.status(400).json({
            message: `Employee number "${eInfo.employeeNumber}" is not verified for ${eInfo.employerName}. Please check your number or contact your HR department.`
          });
        }
      }
    }

    const loan = await prisma.loan.create({
      data: {
        reference: `LMS-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
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
    const loans = await prisma.loan.findMany({
      orderBy: { createdAt: 'desc' }
    });
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

    res.json(loan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// New endpoint to fetch full data for PDF generation
exports.getFullApplicationData = async (req, res) => {
  try {
    const { id } = req.params; // loan ID
    // Fetch loan with related metadata and documents
    const loan = await prisma.loan.findUnique({
      where: { id: Number(id) },
      include: {
        user: true,
        // metadata stored as JSON in the loan record
        // no explicit relation needed, will be accessed via loan.metadata
      },
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    // Extract nested data safely
    const metadata = loan.metadata || {};
    const personalInfo = metadata.personalInfo || {};
    const employmentInfo = metadata.employmentInfo || {};
    const financialInfo = metadata.financialInfo || {};
    const loanRequest = metadata.loanRequest || {};
    const agreement = metadata.agreement || {};

    // Company info (may be stored in separate table)
    const company = await prisma.company.findUnique({
      where: { name: loan.company },
    });

    const BANK_CODES = {
      'Absa': '632005',
      'Capitec Bank': '470010',
      'First National Bank (FNB)': '250655',
      'Nedbank': '198765',
      'Standard Bank': '051001',
      'Investec': '580105',
      'TymeBank': '678910',
      'Discovery Bank': '679000',
      'African Bank': '430000',
      'Bidvest Bank': '462005',
      'Old Mutual': '462005',
      'Sasfin Bank': '683000',
      'SA Post Bank': '460005',
      'Mercantile Bank': '450905',
      'Rand Merchant Bank (RMB)': '261251',
      'RMB Private Bank': '222026',
      'HSBC': '587000',
      'Standard Chartered': '730020',
      'Bank Zero': '888000',
      'Access Bank': '410105',
      'Bank of Athens': '410506',
      'Al Baraka Bank': '800000',
      'Grindrod Bank': '223626',
    };

    // Build a flat object for the front‑end PDF generator
    const payload = {
      loanId: loan.id,
      reference: loan.reference,
      status: loan.status,
      amount: loan.amount,
      // Applicant details
      applicantName: loan.employeeName || `${personalInfo.name || ''} ${personalInfo.surname || ''}`.trim(),
      applicantEmail: loan.employeeEmail,
      applicantIdNumber: personalInfo.identityNumber || personalInfo.passportNumber || '',
      applicantMobile: personalInfo.cellphoneNumber || '',
      applicantCompany: loan.company,
      postalAddress: personalInfo.postalAddress || '',
      // Employment details
      division: employmentInfo.employerDivision || '',
      empType: employmentInfo.employmentType || '',
      contractEndDate: employmentInfo.contractEndDate || '',
      dateEngaged: employmentInfo.dateEngaged || '',
      employeeNumber: employmentInfo.employeeNumber || '',
      jobTitle: employmentInfo.positionTitle || '',
      // Financial details
      salaryFrequency: financialInfo.salaryFrequency || 'Monthly',
      grossIncome: financialInfo.grossIncome || '0',
      expenses: financialInfo.expenses || '0',
      netIncome: financialInfo.netIncome || '0',
      expenseRent: financialInfo.expenseRent || '0',
      expenseFood: financialInfo.expenseFood || '0',
      expenseChildSupport: financialInfo.expenseChildSupport || '0',
      expenseLoans: financialInfo.expenseLoans || '0',
      expenseOther: financialInfo.expenseOther || '0',
      disposableIncome: financialInfo.netIncome || '0',
      bankName: financialInfo.bankName || '',
      bankAccountNumber: financialInfo.bankAccountNumber || '',
      bankAccountHolder: financialInfo.bankAccountHolder || '',
      bankAccountType: financialInfo.bankAccountType || 'Savings',
      branchCode: financialInfo.bankName && BANK_CODES[financialInfo.bankName] ? BANK_CODES[financialInfo.bankName] : '',
      // Loan request details
      loanAmount: loanRequest.amount || loan.amount,
      loanTerm: loanRequest.term || '',
      loanReason: loanRequest.loanReason || '',
      // Personal extra fields
      maritalStatus: personalInfo.maritalStatus || '',
      pdi: personalInfo.isPreviouslyDisadvantaged || false,
      gender: personalInfo.gender || '',
      disability: personalInfo.disability || '',
      language: personalInfo.languageOfChoice || 'English',
      // Signatures / document URLs
      signature: loan.documentUrls?.signature || null,
      companySignature: loan.documentUrls?.companySignature || null,
    };

    res.json({ application: loan, payload });
  } catch (err) {
    console.error('[getFullApplicationData] error:', err);
    res.status(500).json({ message: 'Failed to retrieve application data' });
  }
};
