const nodemailer = require('nodemailer');

async function testDirectMail() {
  const host = "smtp.gmail.com";
  const user = "lms@lenni.co.za";
  const pass = "bgoi vmsi byua vzfv";
  const to = "prashantchaurasia32727@gmail.com";

  console.log("Starting SMTP test send to:", to);
  
  const transporter = nodemailer.createTransport({
    host,
    port: 587,
    secure: false, // TLS
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    debug: true, // Enable debug output
    logger: true // Log SMTP communication to console
  });

  try {
    const info = await transporter.sendMail({
      from: `"${user}" <${user}>`,
      to,
      subject: "🧪 LMS Direct Delivery Diagnostic Test",
      text: "Hello! This is a direct test to verify if email delivery from the LMS system is working.",
      html: "<p>Hello! This is a direct test to verify if email delivery from the LMS system is working.</p>"
    });
    console.log("✅ Send Success! Message ID:", info.messageId);
    console.log("SMTP response info:", JSON.stringify(info, null, 2));
  } catch (err) {
    console.error("❌ Send Failed:", err);
  }
}

testDirectMail();
