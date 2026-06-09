const nodemailer = require('nodemailer');
const prisma = require('../config/db');

exports.submitContactQuery = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email and message are required.' });
  }

  const ticketNumber = `LNS-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    // 1. Log query to auditlog table
    await prisma.auditlog.create({
      data: {
        action: 'SUPPORT_QUERY_SUBMITTED',
        user: email,
        note: `Ticket: ${ticketNumber} | Name: ${name} | Message: ${message.substring(0, 500)}`,
        entityId: ticketNumber
      }
    });

    // 2. Setup SMTP transporter using env variables if present, or fallback to mock
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
      // Create a mock/json transport for logging to console
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: 'support@lenni.co.za',
      subject: `Lenni Support Query - Ticket ${ticketNumber}`,
      text: `Support Request from Lenni Website:\n\nName: ${name}\nEmail: ${email}\nTicket: ${ticketNumber}\n\nMessage:\n${message}`,
      html: `
        <h3>Lenni Support Request</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\\n/g, '<br>').replace(/\n/g, '<br>')}</p>
      `
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Support Query ${ticketNumber} processed. Message Info:`, info.messageId || info);

    res.status(200).json({
      message: 'Support query received and routed successfully.',
      ticketNumber
    });
  } catch (error) {
    console.error('Support Query Processing Error:', error);
    res.status(500).json({ message: 'Failed to process support query. Please try again.' });
  }
};
