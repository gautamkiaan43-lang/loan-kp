const { getLatestLoan } = require('../controllers/employeeController');

async function testGetLatestLoan() {
  const req = {
    user: {
      id: 1,
      name: 'Employee user demo',
      email: 'employee@lenni.co.za',
      company: 'Lenni Global'
    }
  };

  const res = {
    json: (data) => {
      console.log("=== API RESPONSE FOR LATEST LOAN ===");
      console.log("ID:", data.id);
      console.log("Reference:", data.reference);
      console.log("Status:", data.status);
      console.log("documentUrls type:", typeof data.documentUrls);
      console.log("documentUrls value:", data.documentUrls);
      console.log("documentUrls entries:", data.documentUrls ? Object.entries(data.documentUrls) : null);
    },
    status: (code) => ({
      json: (data) => {
        console.log(`=== API ERROR ${code} ===`);
        console.log(data);
      }
    })
  };

  try {
    await getLatestLoan(req, res);
  } catch (err) {
    console.error("Error running controller:", err);
  }
}

testGetLatestLoan();
