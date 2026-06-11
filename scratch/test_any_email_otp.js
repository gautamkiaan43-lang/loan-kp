const crypto = require('crypto');

async function testAnyEmailOtp() {
  const randomEmail = `test-any-email-${Math.floor(Math.random() * 100000)}@lenni.co.za`;
  console.log(`🧪 Testing OTP generation for a completely random new email: ${randomEmail}`);

  try {
    const sendOtpResponse = await fetch("http://localhost:5001/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: randomEmail })
    });
    
    const sendOtpData = await sendOtpResponse.json();
    console.log("Response Status:", sendOtpResponse.status);
    console.log("Response Body:", sendOtpData);

    if (sendOtpResponse.ok) {
      console.log("✅ SUCCESS! OTP was sent successfully to the random new email!");
    } else {
      console.error("❌ FAILED:", sendOtpData.message);
    }
  } catch (error) {
    console.error("❌ REQUEST ERROR:", error);
  }
}

testAnyEmailOtp();
