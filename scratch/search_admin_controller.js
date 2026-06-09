const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\controllers\\adminController.js', 'utf8');

// Look for lines containing "status" or "stage" updates
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('update') && (line.includes('status') || line.includes('stage') || line.includes('loan'))) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
