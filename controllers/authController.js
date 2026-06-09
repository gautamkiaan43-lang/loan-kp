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

const nodemailer = require('nodemailer');
const otpStore = new Map();

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

      if (!loan) {
        console.log(`[sendOtp] Email "${email}" not found in loan table either. Rejecting OTP request.`);
        return res.status(400).json({ message: 'No registered user or loan application found with this email address.' });
      }

      console.log(`[sendOtp] Found loan application (Ref: ${loan.reference}) for ${email}. Automatically creating active user...`);
      
      const tempPassword = await bcrypt.hash(Math.random().toString(36), 10);
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
      console.log(`[sendOtp] Found existing user in user table: ID ${user.id}`);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    otpStore.set(email, { otp, expires });

    console.log(`==========================================`);
    console.log(`🔑 OTP generated for ${email}: ${otp}`);
    console.log(`==========================================`);

    await prisma.auditlog.create({
      data: {
        action: 'OTP_GENERATED',
        user: email,
        note: `OTP ${otp} generated for secure portal activation.`,
        entityId: 'REGISTRATION'
      }
    });

    let transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }

    const mailOptions = {
      from: '"Lenni Secure Portal" <no-reply@lenni.co.za>',
      to: email,
      subject: 'Lenni Portal Activation OTP Code',
      text: `Your verification OTP code is: ${otp}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Lenni Portal Activation</h2>
          <p>You requested an activation code to setup your secure login credentials.</p>
          <p>Your 6-digit Verification OTP code is:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; letter-spacing: 5px; color: #1e3a8a; margin: 20px 0;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #6b7280;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    if (hasSmtp) {
      res.json({ message: 'Verification OTP has been sent to your email address.' });
    } else {
      res.json({ message: `[Development Mode] OTP code generated: ${otp}. (To send real emails, configure SMTP in your .env file)` });
    }
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: 'Failed to send verification OTP.' });
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
    const record = otpStore.get(email);
    if (!record || record.otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification OTP code.' });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'Verification OTP code has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    otpStore.delete(email);

    await prisma.auditlog.create({
      data: {
        action: 'REGISTRATION_COMPLETED',
        user: email,
        note: 'User completed registration and activated secure portal credentials.',
        entityId: 'REGISTRATION'
      }
    });

    res.json({ message: 'Registration completed successfully. You can now login with your password.' });
  } catch (error) {
    console.error('Complete Registration Error:', error);
    res.status(500).json({ message: 'Failed to complete registration.' });
  }
};
