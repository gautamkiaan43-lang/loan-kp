const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Identity access suspended. Contact system administrator.' });
    }

    let companyDivisions = [];
    if (user.company) {
      const companyObj = await prisma.company.findUnique({
        where: { name: user.company }
      });
      if (companyObj && companyObj.divisions) {
        companyDivisions = typeof companyObj.divisions === 'string' 
          ? JSON.parse(companyObj.divisions) 
          : companyObj.divisions;
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, company: user.company },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        avatarUrl: user.avatarUrl,
        companyDivisions: Array.isArray(companyDivisions) ? companyDivisions : []
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let companyDivisions = [];
    if (user.company) {
      const companyObj = await prisma.company.findUnique({
        where: { name: user.company }
      });
      if (companyObj && companyObj.divisions) {
        companyDivisions = typeof companyObj.divisions === 'string' 
          ? JSON.parse(companyObj.divisions) 
          : companyObj.divisions;
      }
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        avatarUrl: user.avatarUrl,
        companyDivisions: Array.isArray(companyDivisions) ? companyDivisions : []
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCompanyConfig = async (req, res) => {
  const { name } = req.params;
  try {
    const comp = await prisma.company.findUnique({
      where: { name }
    });
    if (!comp) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json({
      discountAmount: comp.discountAmount || 0,
      discountRate:   comp.discountRate   || 0,
      address:        comp.address        || null,
      contactPeople:  comp.contactPeople  || null,
      agreement_type: comp.agreement_type || null,
      authorized_signatory_name: comp.authorized_signatory_name || null,
      authorized_signatory_designation: comp.authorized_signatory_designation || null,
      authorized_signatory_email: comp.authorized_signatory_email || null,
      authorized_signatory_phone: comp.authorized_signatory_phone || null,
      authorized_signatory_signature: comp.authorized_signatory_signature || null,
    });
  } catch (error) {
    console.error('getCompanyConfig Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const crypto = require('crypto');
const emailService = require('../services/emailService');

exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }

  try {
    console.log(`[sendOtp] Request received for email: ${email}`);
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`[sendOtp] Email "${email}" not found in user table. Searching loan table...`);
      const loan = await prisma.loan.findFirst({
        where: { employeeEmail: email }
      });

      const tempPassword = await bcrypt.hash(Math.random().toString(36), 10);

      if (loan) {
        console.log(`[sendOtp] Found loan application (Ref: ${loan.reference}) for ${email}. Automatically creating active user...`);
        user = await prisma.user.create({
          data: {
            email: email,
            name: loan.employeeName || 'Unknown Employee',
            company: loan.company || 'Unknown',
            password: tempPassword,
            role: 'employee',
            status: 'Active',
            updatedAt: new Date()
          }
        });

        // Update all loans with this email to point to this new user's ID
        await prisma.loan.updateMany({
          where: { employeeEmail: email },
          data: { userId: user.id }
        });

        console.log(`[sendOtp] Automatically created user ID ${user.id} and linked all associated loans.`);
      } else {
        console.log(`[sendOtp] Email "${email}" not found in user or loan tables. Automatically creating a new user record for portal activation...`);
        user = await prisma.user.create({
          data: {
            email: email,
            name: email.split('@')[0],
            company: 'Unknown',
            password: tempPassword,
            role: 'employee',
            status: 'Active',
            updatedAt: new Date()
          }
        });
        console.log(`[sendOtp] Automatically created guest/new user ID ${user.id} for registration.`);
      }
    } else {
      console.log(`[sendOtp] Found existing user in user table: ID ${user.id}`);
    }

    // Rate Limiting / Anti-Spam check: Cannot request new OTP within 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentOtp = await prisma.otp.findFirst({
      where: {
        email,
        purpose: 'REGISTRATION',
        createdAt: { gte: oneMinuteAgo }
      }
    });

    if (recentOtp) {
      return res.status(429).json({ message: 'Please wait at least 60 seconds before requesting another OTP code.' });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Save to DB
    await prisma.otp.create({
      data: {
        email,
        otpHash,
        purpose: 'REGISTRATION',
        expiresAt: expires
      }
    });

    console.log(`==========================================`);
    console.log(`🔑 OTP generated for ${email}: ${otp}`);
    console.log(`==========================================`);

    await prisma.auditlog.create({
      data: {
        action: 'OTP_GENERATED',
        user: email,
        note: `OTP generated for secure portal activation.`,
        entityId: 'REGISTRATION'
      }
    });

    const html = emailService.populateTemplate('otp', { otp });
    const text = `Your Lenni Secure Portal activation verification OTP code is: ${otp}. It is valid for 10 minutes.`;
    // Queue the OTP email instead of sending synchronously
    await emailService.queueEmail({
      to: email,
      subject: 'Lenni Portal Activation OTP Code',
      html,
      text,
      emailType: 'AUTH_OTP',
      relatedRecord: 'REGISTRATION'
    });

    res.json({ message: 'Verification OTP has been sent to your email address.' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: 'Failed to send verification OTP: ' + error.message });
  }
};

exports.completeRegistration = async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;

  if (!email || !otp || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Confirm password must match create password.' });
  }

  try {
    const hashedOtpInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');

    // Find the latest active registration OTP
    const otpRecord = await prisma.otp.findFirst({
      where: {
        email,
        purpose: 'REGISTRATION',
        used: false,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Verification OTP code has expired or is invalid. Please request a new one.' });
    }

    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new verification code.' });
    }

    if (otpRecord.otpHash !== hashedOtpInput) {
      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 }
      });
      return res.status(400).json({ message: 'Invalid verification OTP code.' });
    }

    // Mark OTP as used
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { used: true }
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    await prisma.auditlog.create({
      data: {
        action: 'REGISTRATION_COMPLETED',
        user: email,
        note: 'User completed registration and activated secure portal credentials.',
        entityId: 'REGISTRATION'
      }
    });

    // Queue Welcome Email
    const welcomeHtml = emailService.populateTemplate('welcome', { name: updatedUser.name || 'Valued Employee' });
    await emailService.queueEmail({
      to: email,
      subject: 'Welcome to Lenni Secure Portal',
      html: welcomeHtml,
      text: `Welcome to Lenni! Your portal access is active. Log in to track your loans.`,
      emailType: 'AUTH_WELCOME',
      relatedRecord: updatedUser.id
    });

    res.json({ message: 'Registration completed successfully. You can now login with your password.' });
  } catch (error) {
    console.error('Complete Registration Error:', error);
    res.status(500).json({ message: 'Failed to complete registration.' });
  }
};

exports.verifyEmployee = async (req, res) => {
  try {
    const company = req.query.company || req.query.companyName;
    const employeeNumber = req.query.employeeNumber || req.query.employeeNo;

    if (!company || !employeeNumber) {
      return res.status(400).json({ verified: false, message: '❌ Company name and employee number are required.' });
    }

    const companyRecord = await prisma.company.findUnique({
      where: { name: company }
    });

    if (!companyRecord) {
      return res.status(404).json({ verified: false, message: '❌ Company not found.' });
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
      return res.status(400).json({ verified: false, message: '❌ No active employee roster uploaded by HR' });
    }

    const empNum = String(employeeNumber).trim().toUpperCase();
    const isVerified = allowedNumbers.map(n => String(n).trim().toUpperCase()).includes(empNum);

    if (!isVerified) {
      return res.status(400).json({ verified: false, message: '❌ Employee Not Found' });
    }

    return res.json({
      verified: true,
      message: '✅ Employee Found'
    });
  } catch (error) {
    console.error('Verify Employee Error:', error);
    res.status(500).json({ verified: false, message: 'Server error: ' + error.message });
  }
};

