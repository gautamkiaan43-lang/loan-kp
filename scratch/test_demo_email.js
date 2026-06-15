async function test() {
  try {
    const res = await fetch("http://[::1]:5001/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demogmail01@gmail.com" })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.json());
  } catch (err) {
    console.error(err);
  }
}
test();
