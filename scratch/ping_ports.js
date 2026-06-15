async function check(url) {
  try {
    const res = await fetch(url);
    console.log(`✅ ${url} is online. Status: ${res.status}`);
  } catch (err) {
    console.log(`❌ ${url} is offline: ${err.message}`);
  }
}

async function main() {
  await check("http://localhost:5000/health");
  await check("http://localhost:5001/health");
  await check("http://127.0.0.1:5000/health");
  await check("http://127.0.0.1:5001/health");
}

main();
