const { verifySmtpConnection } = require('../services/emailService');

async function test() {
  console.log("Testing verifySmtpConnection()...");
  const result = await verifySmtpConnection();
  console.log("Result:", result);
}

test();
