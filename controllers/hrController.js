const prisma = require('../config/db');
const xlsx = require('xlsx');
const { calculateEarlySettlement } = require('../utils/settlementCalculator');

const getWeekNum = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // treat Sunday as 7, Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // set to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

exports.getNewLoansReport = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { startDate, endDate } = req.query;

  try {
    const loans = await prisma.loan.findMany({
      where: {
        company: req.user.role === 'hr' ? req.user.company : undefined,
        status: { in: ['DISBURSED', 'ACTIVE'] },
        updatedAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? (new Date(endDate + 'T23:59:59')) : undefined
        }
      },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } }
      }
    });
    res.json(loans.map(l => ({
      id: l.reference,
      name: l.employeeName || l.user?.name || 'Unknown',
      company: l.company,
      amount: l.amount,
      salary: l.amount,
      date: l.updatedAt,
      status: l.status,
      idNumber: 'EMP-' + l.userId,
      metadata: l.metadata
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOverdueInstallments = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const overdueInstallments = await prisma.installment.findMany({
      where: {
        loan: {
          company: req.user.role === 'hr' ? req.user.company : undefined
        },
        OR: [
          { status: 'OVERDUE' },
          {
            status: 'PENDING',
            dueDate: { lt: new Date() }
          }
        ]
      },
      include: {
        loan: {
          include: { user: { select: { name: true, email: true, avatarUrl: true } } }
        }
      }
    });
    res.json(overdueInstallments.map(i => ({
      id: i.reference,
      loanReference: i.loan.reference,
      name: i.loan.employeeName || i.loan.user?.name || 'Unknown',
      email: i.loan.user?.email || 'Unknown',
      company: i.loan.company,
      amount: i.amount,
      outstandingAmount: i.amount,
      dueDate: i.dueDate,
      status: i.status,
      recoveryStatus: i.status === 'OVERDUE' ? 'IN_ARREARS' : 'PENDING',
      metadata: i.loan.metadata,
      note: i.note
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateOverdueNote = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { reference } = req.params;
  const { note } = req.body;

  try {
    const updated = await prisma.installment.update({
      where: { reference },
      data: {
        note,
        updatedAt: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getActivityStats = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const company = req.user.role === 'hr' ? req.user.company : undefined;

  try {
    const loans = await prisma.loan.findMany({
      where: { company },
      select: {
        id: true,
        reference: true,
        status: true,
        createdAt: true,
        employeeName: true
      }
    });

    const totalRequests = loans.length;
    const approvedCount = loans.filter(l => l.status.toLowerCase().includes('approved') || l.status.toLowerCase() === 'paid').length;
    const rejectedCount = loans.filter(l => l.status.toLowerCase().includes('rejected') || l.status.toLowerCase() === 'declined').length;

    // Monthly aggregation
    const monthlyActivity = Array.from({ length: 12 }, (_, i) => ({
      month: `M${i + 1}`,
      requests: 0,
      approved: 0
    }));

    loans.forEach(l => {
      const month = new Date(l.createdAt).getMonth();
      monthlyActivity[month].requests++;
      if (l.status.toLowerCase().includes('approved') || l.status.toLowerCase() === 'paid') {
        monthlyActivity[month].approved++;
      }
    });

    const recentLogs = loans
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map(l => ({
        status: l.status,
        name: l.employeeName,
        reference: l.reference,
        date: l.createdAt
      }));

    let penetrationRate = 0;
    let registeredCount = 0;
    let approxTotal = 0;

    if (company) {
      const companyRecord = await prisma.company.findUnique({
        where: { name: company }
      });
      if (companyRecord) {
        registeredCount = companyRecord.employees || 0;
        approxTotal = companyRecord.approxTotalEmployees || 0;
        if (approxTotal > 0) {
          penetrationRate = parseFloat(((registeredCount / approxTotal) * 100).toFixed(1));
        }
      }
    }

    res.json({
      totalRequests,
      approvedCount,
      rejectedCount,
      approvalRate: totalRequests > 0 ? ((approvedCount / totalRequests) * 100).toFixed(1) : 0,
      monthlyActivity,
      recentLogs,
      penetrationRate,
      registeredCount,
      approxTotal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDashboardData = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    const [pendingCount, approvedThisWeek, rejectedCount, priorityQueue] = await Promise.all([
      prisma.loan.count({ where: { stage: 'SUBMITTED' } }),
      prisma.loan.count({
        where: {
          stage: { notIn: ['SUBMITTED', 'REJECTED'] },
          updatedAt: { gte: startOfWeek }
        }
      }),
      prisma.loan.count({ where: { status: 'rejected' } }),
      prisma.loan.findMany({
        where: { stage: 'SUBMITTED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: { name: true, avatarUrl: true }
          }
        }
      })
    ]);

    res.json({
      stats: {
        pending: pendingCount,
        approvedThisWeek,
        rejected: rejectedCount
      },
      priorityQueue: priorityQueue.map(l => ({
        id: l.id,
        name: l.employeeName || l.user?.name || 'Unknown',
        avatarUrl: l.user?.avatarUrl,
        reference: l.reference,
        status: l.status.toUpperCase(),
        date: l.createdAt
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVerifications = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const loans = await prisma.loan.findMany({
      where: {
        stage: { in: ['SUBMITTED', 'HR_VERIFICATION'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, avatarUrl: true } }
      }
    });

    res.json(loans.map(l => ({
      id: l.id,
      reference: l.reference,
      name: (l.employeeName && l.employeeName !== 'Unknown')
        ? l.employeeName
        : (l.metadata?.personalInfo?.name ? `${l.metadata.personalInfo.name} ${l.metadata.personalInfo.surname}` : (l.user?.name || 'Anonymous')),
      avatarUrl: l.user?.avatarUrl,
      company: l.company,
      amount: l.amount,
      status: l.status.toUpperCase(),
      stage: l.stage,
      date: l.createdAt
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getEmployees = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const employees = await prisma.user.findMany({
      where: {
        role: 'employee'
      },
      include: {
        loan: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const activeAppsCount = await prisma.loan.count({
      where: {
        stage: { in: ['SUBMITTED', 'HR_VERIFICATION'] }
      }
    });

    res.json({
      employees: employees.map(u => ({
        id: `EMP-${u.id}`,
        realId: u.id,
        name: u.name || 'Unknown',
        avatarUrl: u.avatarUrl,
        company: u.company,
        dept: 'Operations', // Placeholder as schema doesn't have dept
        role: 'Employee',
        status: u.status,
        email: u.email,
        activeLoan: u.loan[0] || null
      })),
      stats: {
        totalStaff: employees.length,
        activeApplications: activeAppsCount,
        deptCoverage: 5,
        complianceRate: 100
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateVerificationStatus = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.params;
  const { action, notes } = req.body;

  try {
    let updateData = {};
    let auditAction = '';

    if (action === 'APPROVE') {
      updateData = {
        status: 'HR_Approved',
        stage: 'CREDIT_PENDING',
        updatedAt: new Date()
      };
      auditAction = 'HR_VERIFY_APPROVED';
    } else if (action === 'REJECT') {
      updateData = {
        status: 'Rejected',
        stage: 'REJECTED',
        updatedAt: new Date()
      };
      auditAction = 'HR_VERIFY_REJECTED';
    } else if (action === 'FORWARD') {
      updateData = {
        status: 'Forwarded to Credit',
        stage: 'CREDIT_PENDING',
        updatedAt: new Date()
      };
      auditAction = 'HR_FORWARDED_TO_CREDIT';
    }

    const updatedLoan = await prisma.loan.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Send email notifications
    try {
      const emailService = require('../services/emailService');
      if (action === 'REJECT') {
        const html = emailService.populateTemplate('loan-rejected', {
          name: updatedLoan.employeeName,
          reference: updatedLoan.reference
        });
        await emailService.queueEmail({
          to: updatedLoan.employeeEmail,
          subject: `Lenni Loan Application Declined - Ref ${updatedLoan.reference}`,
          html,
          text: `Your loan application ${updatedLoan.reference} has been declined.`,
          emailType: 'LOAN_REJECTED',
          relatedRecord: updatedLoan.id
        });
      } else if (action === 'APPROVE') {
        const html = emailService.populateTemplate('notification', {
          message: `Your loan application (Ref: ${updatedLoan.reference}) has been successfully verified by HR and is now under review by our Credit Assessment team.`
        });
        await emailService.queueEmail({
          to: updatedLoan.employeeEmail,
          subject: `Lenni Loan Status: Under Review - Ref ${updatedLoan.reference}`,
          html,
          text: `Your loan application ${updatedLoan.reference} has been verified and is under review.`,
          emailType: 'LOAN_UNDER_REVIEW',
          relatedRecord: updatedLoan.id
        });
      }
    } catch (emailErr) {
      console.error('[hrController.updateVerificationStatus] Email notification failed:', emailErr);
    }

    // Log action
    await prisma.auditlog.create({
      data: {
        action: auditAction,
        user: req.user.email,
        entityId: updatedLoan.reference,
        note: notes || `Action ${action} performed by HR.`
      }
    });

    res.json(updatedLoan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update verification status' });
  }
};

exports.getRemittances = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { period } = req.query; // format: YYYY-MM, YYYY-WXX, or YYYY-MM-DD
  const now = new Date();
  
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  let weekNumber = null;

  if (period) {
    if (period.includes('-W')) {
      // Weekly format e.g., 2026-W12
      const [y, w] = period.split('-W').map(Number);
      weekNumber = w;
      // Rough approximation of week start/end for filtering
      const simple = new Date(y, 0, 1 + (w - 1) * 7);
      startDate = new Date(simple.setDate(simple.getDate() - simple.getDay()));
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else if (period.split('-').length === 3) {
      // Daily format e.g., 2026-05-15
      const [y, m, d] = period.split('-').map(Number);
      startDate = new Date(y, m - 1, d);
      endDate = new Date(y, m - 1, d + 1);
      // Determine week number for this date using standard ISO week
      weekNumber = getWeekNum(startDate);
    } else {
      // Monthly format e.g., 2026-05
      const [y, m] = period.split('-').map(Number);
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 1);
    }
  }

  try {
    const userCompany = req.user.role === 'hr' ? req.user.company : undefined;
    
    // Fetch company to get fortnight config
    let companyRecord = null;
    if (userCompany) {
      companyRecord = await prisma.company.findUnique({ where: { name: userCompany } });
    }

    const installments = await prisma.installment.findMany({
      where: {
        loan: {
          company: userCompany
        },
        dueDate: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        loan: {
          include: { user: { select: { name: true, email: true, avatarUrl: true } } }
        }
      }
    });

    // Fortnight Cycle Filtering
    const fortnightCycle = companyRecord?.fortnightCycle || 'N/A';
    const isEvenWeek = weekNumber !== null ? (weekNumber % 2 === 0) : null;
    
    const filteredInstallments = installments.filter(i => {
      const freq = i.loan.metadata?.financialInfo?.salaryFrequency;
      if (freq === 'Fortnightly' && weekNumber !== null && fortnightCycle !== 'N/A') {
        if (fortnightCycle === 'Even Weeks' && !isEvenWeek) return false;
        if (fortnightCycle === 'Odd Weeks' && isEvenWeek) return false;
      }
      return true;
    });

// Compute settlement values for each loan (once per loan to avoid duplicate work)
    const settlementCache = {};
    const now = new Date();
    const settlementPromises = filteredInstallments.map(async (i) => {
      const loanId = i.loan.id;
      if (!settlementCache[loanId]) {
        settlementCache[loanId] = await calculateEarlySettlement(i.loan, false, now);
      }
      const settlement = settlementCache[loanId];
      return {
        id: i.reference,
        loanReference: i.loan.reference,
        name: (i.loan.employeeName && i.loan.employeeName !== 'Unknown')
          ? i.loan.employeeName
          : (i.loan.metadata?.personalInfo?.name ? `${i.loan.metadata.personalInfo.name} ${i.loan.metadata.personalInfo.surname}` : (i.loan.user?.name || 'Anonymous')),
        email: i.loan.employeeEmail || i.loan.user?.email || 'Unknown',
        avatarUrl: i.loan.user?.avatarUrl,
        company: i.loan.company,
        amount: i.amount,
        date: i.dueDate,
        status: i.status,
        metadata: i.loan.metadata,
        note: i.note,
        actualBalance: settlement.outstandingBalance,
        pipelineBalance: settlement.pipelineDeduction,
        settlementAmount: settlement.settlementAmount
      };
    });
    const responseData = await Promise.all(settlementPromises);
    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCompanyProfile = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const companyName = req.user.role === 'hr' ? req.user.company : req.query.name;

  if (!companyName) {
    return res.status(400).json({ message: 'Company name required. Your user account may not have a company assigned.' });
  }

  try {
    const employeeCount = await prisma.user.count({
      where: {
        company: companyName,
        loan: {
          some: {
            status: {
              in: ['Active', 'ACTIVE', 'Disbursed', 'DISBURSED']
            }
          }
        }
      }
    });

    let company = await prisma.company.findUnique({
      where: { name: companyName }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: companyName,
          employees: employeeCount,
          status: 'Active',
          creditLimit: 'R 0'
        }
      });
    } else {
      company = await prisma.company.update({
        where: { id: company.id },
        data: { employees: employeeCount }
      });
    }

    res.json(company);
  } catch (error) {
    console.error('getCompanyProfile error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

exports.updateCompanyProfile = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const companyName = req.user.role === 'hr' ? req.user.company : req.body.companyName;
  const {
    address,
    contactPeople,
    divisions,
    specimenSignatureUrl,
    authorizedSignatories,
    fortnightCycle,
    agreement_type,
    authorized_signatory_name,
    authorized_signatory_designation,
    authorized_signatory_email,
    authorized_signatory_phone,
    authorized_signatory_signature,
    latitude,
    longitude
  } = req.body;

  try {
    const updated = await prisma.company.update({
      where: { name: companyName },
      data: {
        address,
        contactPeople,
        divisions,
        specimenSignatureUrl,
        authorizedSignatories,
        fortnightCycle,
        agreement_type,
        authorized_signatory_name,
        authorized_signatory_designation,
        authorized_signatory_email,
        authorized_signatory_phone,
        authorized_signatory_signature,
        latitude: (latitude !== undefined && latitude !== null) ? parseFloat(latitude) : null,
        longitude: (longitude !== undefined && longitude !== null) ? parseFloat(longitude) : null,
        updatedAt: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.uploadDeductions = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { company, period, frequency } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a CSV or Excel file.' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return res.status(400).json({ message: 'The uploaded file is empty.' });
    }

    const parsedRows = rawData.map(row => {
      const empNoKey = Object.keys(row).find(k => k.toLowerCase().includes('employee') || k.toLowerCase().includes('emp') || k.toLowerCase().includes('id'));
      const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('name'));
      const amountKey = Object.keys(row).find(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('deduct') || k.toLowerCase().includes('repay'));

      const employeeNumber = empNoKey ? String(row[empNoKey]).trim() : 'Unknown';
      const employeeName = nameKey ? String(row[nameKey]).trim() : 'Unknown';
      const amount = amountKey ? parseFloat(row[amountKey]) || 0 : 0;

      return {
        employeeNumber,
        employeeName,
        amount
      };
    });

    const schedule = await prisma.deductionschedule.create({
      data: {
        company: company || req.user.company,
        period,
        frequency,
        fileName: req.file.originalname,
        uploadedBy: req.user.email,
        details: parsedRows
      }
    });

    res.json({ message: 'Deduction schedule uploaded and parsed successfully', schedule });
  } catch (error) {
    console.error('Upload Deductions Error:', error);
    res.status(500).json({ message: 'Failed to process file upload.' });
  }
};

exports.getUploadedSchedules = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const company = req.user.role === 'hr' ? req.user.company : req.query.company;

  try {
    const schedules = await prisma.deductionschedule.findMany({
      where: { company },
      orderBy: { createdAt: 'desc' }
    });

    res.json(schedules);
  } catch (error) {
    console.error('Get Uploaded Schedules Error:', error);
    res.status(500).json({ message: 'Failed to fetch uploaded schedules.' });
  }
};

exports.uploadEmployeeList = async (req, res) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const companyName = req.user.role === 'hr' ? req.user.company : req.body.company;

  if (!companyName) {
    return res.status(400).json({ message: 'Company name is required.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a CSV or Excel file.' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (rows.length === 0) {
      return res.status(400).json({ message: 'The uploaded file is empty.' });
    }

    let colIndex = 0;
    let startRow = 0;
    const firstRow = rows[0] || [];
    const headerKeywords = ['employee', 'emp', 'id', 'number', 'code'];

    // Find if any cell in the first row looks like a header keyword and does not contain digits
    const foundHeaderIdx = firstRow.findIndex(cell => {
      if (cell === undefined || cell === null) return false;
      const str = String(cell).toLowerCase().trim();
      const hasDigits = /\d/.test(str);
      return !hasDigits && headerKeywords.some(kw => str.includes(kw));
    });

    if (foundHeaderIdx !== -1) {
      colIndex = foundHeaderIdx;
      startRow = 1; // Skip header row
    } else {
      // Check if the first row's cell 0 matches a known header name exactly or partially (and does not contain digits)
      const firstVal = String(firstRow[0] || '').toLowerCase().trim();
      const hasDigits = /\d/.test(firstVal);
      const commonHeaders = [
        'employee', 'emp', 'id', 'number', 'code', 'staff', 'roster', 
        'employees', 'list', 'name', 'numbers', 'codes', 'emp_id', 
        'employee_id', 'staff_id', 'staff id'
      ];
      const looksLikeHeader = !hasDigits && commonHeaders.some(h => firstVal === h || firstVal.includes(h));
      if (looksLikeHeader) {
        startRow = 1; // Skip header row
      } else {
        startRow = 0; // First row is data
      }
      colIndex = 0;
    }

    const employeeNumbersSet = new Set();
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const val = row[colIndex];
      if (val !== undefined && val !== null) {
        const cleanVal = String(val).trim();
        if (cleanVal) {
          employeeNumbersSet.add(cleanVal.toUpperCase());
        }
      }
    }

    const parsedEmployeeNumbers = Array.from(employeeNumbersSet);

    if (parsedEmployeeNumbers.length === 0) {
      return res.status(400).json({ message: 'No valid employee numbers could be parsed from the file. Ensure the Excel has a column for employee numbers.' });
    }

    const updatedCompany = await prisma.company.update({
      where: { name: companyName },
      data: {
        approxTotalEmployees: parsedEmployeeNumbers.length,
        employeeNumbers: parsedEmployeeNumbers,
        lastEmployeeUploadDate: new Date(),
        fortnightCycle: req.body.fortnightCycle !== undefined ? req.body.fortnightCycle : undefined
      }
    });

    res.json({
      message: 'Staff roster uploaded and verified successfully!',
      approxTotalEmployees: updatedCompany.approxTotalEmployees,
      lastEmployeeUploadDate: updatedCompany.lastEmployeeUploadDate,
      employeeNumbers: updatedCompany.employeeNumbers,
      fortnightCycle: updatedCompany.fortnightCycle
    });
  } catch (error) {
    console.error('Upload Employee List Error:', error);
    res.status(500).json({ message: 'Failed to parse and save employee roster.' });
  }
};

