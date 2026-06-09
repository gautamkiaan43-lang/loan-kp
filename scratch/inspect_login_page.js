const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'LMS-frontend', 'src', 'pages', 'auth', 'LoginPage.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('employeeNumber') || line.includes('employeeName') || line.includes('showEmployeeDropdown')) {
        console.log(`${index + 1}: ${line}`);
    }
});
