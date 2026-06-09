const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'LMS-frontend', 'src', 'pages', 'employee', 'LoanApplication.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('address') || line.includes('companyConfig') || line.includes('HR Company Profile')) {
        console.log(`${index + 1}: ${line}`);
    }
});
