const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\controllers\\creditController.js', 'utf8');

// Look for lines containing "installment"
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('installment')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
