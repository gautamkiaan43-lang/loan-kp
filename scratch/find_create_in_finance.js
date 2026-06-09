const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\controllers\\financeController.js', 'utf8');

// Look for lines containing "installment" and "create" or "prisma.installment"
let idx = 0;
while ((idx = content.indexOf('prisma.', idx)) !== -1) {
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + 100);
  console.log(`[Pos ${idx}] ... ${content.substring(start, end).replace(/\s+/g, ' ')} ...`);
  idx += 7;
}
