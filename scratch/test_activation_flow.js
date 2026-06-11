const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function testFlow() {
  console.log("==================================================");
  console.log("🧪 RUNNING END-TO-END PORTAL ACTIVATION FLOW TEST");
  console.log("==================================================");

  const email = "admin@lenni.co.za";
  const mockCompanyName = "Lenni Group";

  // 1. Clean up existing test records
  console.log("🧹 Cleaning up old test data...");
  await prisma.otp.deleteMany({ where: { email } });
  await prisma.email_log.deleteMany({ where: { recipient: email } });
  await prisma.email_queue.deleteMany({ where: { recipient: email } });
  
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    await prisma.loan.deleteMany({ where: { userId: existingUser.id } });
    await prisma.user.delete({ where: { id: existingUser.id } });
  }
  await prisma.loan.deleteMany({ where: { employeeEmail: email } });

  // Ensure mock company exists with employee number in roster
  console.log("🏢 Seeding company and employee roster...");
  await prisma.company.upsert({
    where: { name: mockCompanyName },
    update: {
      employeeNumbers: ["EMP-9999"],
      approxTotalEmployees: 1,
      status: "Active"
    },
    create: {
      name: mockCompanyName,
      employeeNumbers: ["EMP-9999"],
      approxTotalEmployees: 1,
      creditLimit: "R 10M",
      status: "Active"
    }
  });

  // 2. Seed mock loan application matching the screenshot reference
  console.log("📝 Seeding mock loan application...");
  const reference = "APP-20260423-9X8M";
  await prisma.loan.create({
    data: {
      reference,
      amount: 4000,
      userId: 1, // temporary link, authController will auto-relink on sendOtp
      company: mockCompanyName,
      employeeEmail: email,
      employeeName: "System Administrator",
      status: "pending",
      stage: "SUBMITTED",
      metadata: {
        personalInfo: { name: "System", surname: "Administrator" },
        employmentInfo: { employerName: mockCompanyName, employeeNumber: "EMP-9999" }
      }
    }
  });

  // 3. Request OTP (simulating Send OTP click)
  console.log("🔑 Simulating 'Send OTP' POST request...");
  const sendOtpResponse = await fetch("http://localhost:5001/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  
  const sendOtpData = await sendOtpResponse.json();
  console.log("Send OTP Response Status:", sendOtpResponse.status);
  console.log("Send OTP Response Body:", sendOtpData);

  if (!sendOtpResponse.ok) {
    throw new Error(`Send OTP failed: ${sendOtpData.message}`);
  }

  // 4. Retrieve OTP from database to check hashed storage
  console.log("🔍 Fetching OTP record from MySQL...");
  const otpRecord = await prisma.otp.findFirst({
    where: { email, used: false },
    orderBy: { createdAt: 'desc' }
  });

  if (!otpRecord) {
    throw new Error("No OTP record was created in the database!");
  }
  console.log(`✅ Found OTP record: ID #${otpRecord.id} | Expires: ${otpRecord.expiresAt}`);
  console.log(`✅ Stored OTP Hash (SHA256): ${otpRecord.otpHash}`);

  // Retrieve raw OTP value from mock sending logs if needed, but since it is in process.env logs we can query or print
  // Wait, in our authController sendOtp, we printed the OTP to the console:
  // "🔑 OTP generated for admin@lenni.co.za: XXXXXX"
  // Let's do a trick: we can generate a known OTP or just find the raw OTP from log file, or we can temporarily mock or we can read it.
  // Wait, is there a way to verify the OTP directly in test? Yes, since it is a random 6-digit number, we can just find it! But wait, we hashed it.
  // Since we hashed it, we can search for the matching 6-digit number in the test script by brute-forcing the 6-digit space (100000 to 999999) inside the script!
  // It only takes a fraction of a second to check 900,000 hashes in Node! Let's do that to retrieve the generated OTP for completing the test.
  console.log("🔓 Brute-forcing the 6-digit space to retrieve generated OTP for validation...");
  let rawOtp = "";
  for (let i = 100000; i <= 999999; i++) {
    const candidate = String(i);
    const hash = crypto.createHash('sha256').update(candidate).digest('hex');
    if (hash === otpRecord.otpHash) {
      rawOtp = candidate;
      break;
    }
  }
  console.log(`🔓 Decrypted Raw OTP: ${rawOtp}`);

  // 5. Complete Registration with matching passwords
  console.log("🔐 Simulating 'Complete Registration' POST request...");
  const completeResponse = await fetch("http://localhost:5001/api/auth/complete-registration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      otp: rawOtp,
      password: "SecurityPassword123!",
      confirmPassword: "SecurityPassword123!"
    })
  });

  const completeData = await completeResponse.json();
  console.log("Complete Registration Response Status:", completeResponse.status);
  console.log("Complete Registration Response Body:", completeData);

  if (!completeResponse.ok) {
    throw new Error(`Complete Registration failed: ${completeData.message}`);
  }

  // 6. Verify User Record and Welcome Email in Queue
  console.log("🕵️ Verifying records after successful activation...");
  const updatedUser = await prisma.user.findUnique({ where: { email } });
  console.log("User Password updated (bcrypt hash):", updatedUser.password.startsWith('$2a$') || updatedUser.password.startsWith('$2b$'));
  
  const updatedOtp = await prisma.otp.findUnique({ where: { id: otpRecord.id } });
  console.log("OTP Marked as Used:", updatedOtp.used);

  const queuedWelcome = await prisma.email_queue.findFirst({
    where: { recipient: email, emailType: "AUTH_WELCOME" }
  });
  console.log("Welcome Email in Queue:", !!queuedWelcome);
  console.log("Welcome Email Status:", queuedWelcome ? queuedWelcome.status : "N/A");

  // 7. Wait 6 seconds for the background worker loop (5s interval) to deliver the welcome email
  console.log("🕒 Waiting 6 seconds for background queue processor to deliver the welcome email via SMTP...");
  await new Promise(resolve => setTimeout(resolve, 6500));

  const logEntry = await prisma.email_log.findFirst({
    where: { recipient: email, emailType: "AUTH_WELCOME" }
  });
  
  console.log("==================================================");
  if (logEntry && logEntry.deliveryStatus === "SENT") {
    console.log("🎉 SUCCESS! Portal activation E2E flow test passed!");
    console.log(`📧 Welcome email delivery verified: status = ${logEntry.deliveryStatus} | MsgID: ${logEntry.id}`);
  } else {
    console.log("❌ FAILURE! Welcome email was not delivered by background worker.");
    console.log("Logs found:", logEntry);
    const queueItem = await prisma.email_queue.findFirst({ where: { recipient: email } });
    console.log("Queue item current status:", queueItem);
  }
  console.log("==================================================");
  
  process.exit(0);
}

testFlow().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
