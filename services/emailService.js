const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

// Create reusable transporter configuration based on env variables
async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const hostIpv4 = process.env.SMTP_HOST_IPV4;
  let finalHost = hostIpv4 || host;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USERNAME || process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const encryption = (process.env.SMTP_ENCRYPTION || '').toUpperCase();
  const ipv4Option = { family: 4 };
  const timeoutMs = parseInt(process.env.SMTP_TIMEOUT_MS || '15000'); // 15 s default

  // Optional dev mode: skip real SMTP
  if (process.env.SMTP_FAKE === 'true') {
    console.log('[EmailService] Using JSON transport (SMTP_FAKE enabled)');
    return nodemailer.createTransport({ jsonTransport: true, ...ipv4Option, connectionTimeout: timeoutMs });
  }

  if (finalHost && user && pass) {
    let resolvedHost = finalHost;
    let servername = undefined;

    // Resolve hostname to IPv4 dynamically to avoid IPv6 ENETUNREACH errors on cloud servers like Railway
    if (!/^[0-9.]+$/.test(finalHost) && !finalHost.includes(':')) {
      try {
        const dns = require('dns').promises;
        const addresses = await dns.resolve4(finalHost);
        if (addresses && addresses.length > 0) {
          resolvedHost = addresses[0];
          servername = finalHost;
          console.log(`[EmailService] Resolved SMTP host "${finalHost}" to IPv4 "${resolvedHost}"`);
        }
      } catch (dnsErr) {
        console.warn(`[EmailService] Failed to resolve hostname "${finalHost}" to IPv4:`, dnsErr.message);
      }
    }

    const transporter = nodemailer.createTransport({
      host: resolvedHost,
      port,
      secure: port === 465 || encryption === 'SSL',
      auth: { user, pass },
      ...ipv4Option,
      connectionTimeout: timeoutMs,
      tls: { 
        rejectUnauthorized: false,
        ...(servername ? { servername } : {})
      }
    });
    console.log('[EmailService] Using real SMTP transport →', {
      host: resolvedHost,
      port,
      user,
      encryption: encryption || 'TLS',
      timeoutMs,
      servername
    });
    return transporter;
  } else {
    console.log('[EmailService] Using JSON transport (dev mode) – real emails will NOT be sent');
    return nodemailer.createTransport({ jsonTransport: true, ...ipv4Option, connectionTimeout: timeoutMs });
  }
}

/**
 * Standardized function to send emails immediately.
 */
async function sendEmailImmediate({ to, subject, html, text, attachments, emailType = 'SYSTEM', relatedRecord = null }) {
  const fromAddress = process.env.MAIL_FROM_ADDRESS || 'lms@lenni.co.za';
  const fromName = process.env.MAIL_FROM_NAME || 'Lenni Loan Management System';
  const sender = `"${fromName}" <${fromAddress}>`;

  const transporter = await getTransporter();

  const mailOptions = {
    from: sender,
    to,
    subject,
    html,
    text,
    attachments: attachments || []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // Log success in email_logs
    await prisma.email_log.create({
      data: {
        recipient: to,
        subject,
        emailType,
        relatedRecord: relatedRecord ? String(relatedRecord) : null,
        deliveryStatus: 'SENT',
        sender: fromAddress,
        errorDetails: null
      }
    });
    
    console.log(`[Email Sent] To: ${to} | Subject: ${subject} | MsgID: ${info.messageId || 'MOCK'}`);
    return { success: true, messageId: info.messageId || 'MOCK' };
  } catch (error) {
    console.error(`[Email Failed] To: ${to} | Error:`, error.message);
    
    // Log failure in email_logs
    await prisma.email_log.create({
      data: {
        recipient: to,
        subject,
        emailType,
        relatedRecord: relatedRecord ? String(relatedRecord) : null,
        deliveryStatus: 'FAILED',
        sender: fromAddress,
        errorDetails: error.stack || error.message
      }
    });

    throw error;
  }
}

/**
 * Queues an email into the database.
 */
async function queueEmail({ to, subject, html, text, attachments, emailType = 'SYSTEM', relatedRecord = null }) {
  try {
    const queueItem = await prisma.email_queue.create({
      data: {
        recipient: to,
        subject,
        emailType,
        html,
        text: text || '',
        attachments: attachments ? JSON.stringify(attachments) : null,
        status: 'PENDING',
        relatedRecord: relatedRecord ? String(relatedRecord) : null
      }
    });
    console.log(`[Email Queued] Job ID: ${queueItem.id} | To: ${to} | Subject: ${subject}`);
    return queueItem;
  } catch (error) {
    console.error('[Queue Email Error]:', error);
    throw error;
  }
}

/**
 * Parses and interpolates variables into an HTML template file.
 */
function populateTemplate(templateName, variables = {}) {
  const templatesDir = path.join(__dirname, '..', 'templates', 'emails');
  const templatePath = path.join(templatesDir, `${templateName}.html`);

  let templateContent = '';

  try {
    if (fs.existsSync(templatePath)) {
      templateContent = fs.readFileSync(templatePath, 'utf8');
    } else {
      // Inline generic fallback template if file is missing
      templateContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">LENNI LMS</h2>
          </div>
          <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
            {{content}}
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
            &copy; {{year}} Lenni Loan Management System. All rights reserved.
          </div>
        </div>
      `;
      // Put simple content block inside the fallback
      if (variables.content === undefined) {
        variables.content = `<h3>Notification</h3><p>${JSON.stringify(variables)}</p>`;
      }
    }
  } catch (err) {
    console.error(`[Load Template Error] Name: ${templateName}:`, err);
    templateContent = `<p>{{content}}</p>`;
  }

  // Inject current year automatically
  variables.year = new Date().getFullYear();

  // Replace placeholders: {{variableName}}
  let interpolated = templateContent;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    interpolated = interpolated.replace(regex, variables[key]);
  });

  return interpolated;
}

/**
 * Background worker processing pending or failed emails from the queue.
 */
async function processEmailQueue() {
  try {
    // Find up to 10 pending/failed messages where attempts < 3
    const pendingJobs = await prisma.email_queue.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        attempts: { lt: 3 }
      },
      take: 10,
      orderBy: { createdAt: 'asc' }
    });

    if (pendingJobs.length === 0) return;

    console.log(`[Email Queue Worker] Processing ${pendingJobs.length} emails...`);

    for (const job of pendingJobs) {
      // 1. Claim job (PROCESSING) to prevent concurrency duplicates
      // Claim the job safely. Use updateMany to avoid error if the job was already handled.
        const claimResult = await prisma.email_queue.updateMany({
          where: { id: job.id, status: { in: ['PENDING', 'FAILED'] } },
          data: { status: 'PROCESSING' }
        });
        if (claimResult.count === 0) {
          // Job might have been claimed elsewhere; skip processing.
          console.warn(`[Email Queue Worker] Job ${job.id} could not be claimed (already processed). Skipping.`);
          continue;
        }

      let attachmentsParsed = [];
      try {
        if (job.attachments) {
          attachmentsParsed = JSON.parse(job.attachments);
        }
      } catch (err) {
        console.error(`[Queue Worker] Failed parsing attachments for job ${job.id}:`, err);
      }

      try {
        // 2. Attempt delivery
        await sendEmailImmediate({
          to: job.recipient,
          subject: job.subject,
          html: job.html,
          text: job.text,
          attachments: attachmentsParsed,
          emailType: job.emailType,
          relatedRecord: job.relatedRecord
        });

        // 3. Mark job as SENT
        await prisma.email_queue.update({
          where: { id: job.id },
          data: {
            status: 'SENT',
            attempts: job.attempts + 1
          }
        });
      } catch (sendError) {
        const nextAttempts = job.attempts + 1;
        const finalStatus = nextAttempts >= 3 ? 'FAILED' : 'PENDING';

        await prisma.email_queue.update({
          where: { id: job.id },
          data: {
            status: finalStatus,
            attempts: nextAttempts,
            lastError: sendError.message || String(sendError)
          }
        });
      }
    }
  } catch (error) {
    console.error('[Email Queue Worker Exception]:', error);
  }
}

/**
 * Tests connection settings to the SMTP server.
 */
async function verifySmtpConnection() {
  try {
    const transporter = await getTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP Connection verified successfully.' };
  } catch (error) {
    console.error('[SMTP Connection Error]:', error);
    return { success: false, error: error.message || String(error) };
  }
}

module.exports = {
  sendEmailImmediate,
  queueEmail,
  populateTemplate,
  processEmailQueue,
  verifySmtpConnection
};
