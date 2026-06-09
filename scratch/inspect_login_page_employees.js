const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'LMS-frontend', 'src', 'pages', 'auth', 'LoginPage.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let print = false;
let braceCount = 0;
lines.forEach((line, index) => {
    if (line.includes('filteredEmployees') || line.includes('showEmployeeDropdown') || line.includes('employeeName')) {
        console.log(`${index + 1}: ${line}`);
    }
});
