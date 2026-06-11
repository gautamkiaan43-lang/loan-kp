const nodemailer = require('nodemailer');

async function testSmtp() {
  const host = "smtp.gmail.com";
  const user = "lms@lenni.co.za";
  const pass = "bgoi vmsi byua vzfv";
  const to = "lms@lenni.co.za";

  console.log("Testing SMTP Send Mail on Port 587 (secure: false)...");
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
    const info = await transporter.sendMail({
      from: `"${user}" <${user}>`,
      to,
      subject: "Test Port 587",
      text: "Testing Port 587 sending functionality."
    });
    console.log("✅ Port 587 Send Success! Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ Port 587 Send Failed:", err);
  }

  console.log("\nTesting SMTP Send Mail on Port 465 (secure: true)...");
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
    const info = await transporter.sendMail({
      from: `"${user}" <${user}>`,
      to,
      subject: "Test Port 465",
      text: "Testing Port 465 sending functionality."
    });
    console.log("✅ Port 465 Send Success! Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ Port 465 Send Failed:", err);
  }
}

testSmtp();
