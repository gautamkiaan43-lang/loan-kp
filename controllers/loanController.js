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
