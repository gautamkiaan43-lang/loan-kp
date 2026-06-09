const fs = require('fs');
const text = fs.readFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\scratch\\change_req_text.txt', 'utf8');

const keywords = ['settle', 'payout', 'balance', 'outstanding', 'calculation', 'formula', 'matrix', 'interest', 'fee', '400', '8000'];

keywords.forEach(kw => {
  console.log(`\n--- SEARCH FOR: ${kw} ---`);
  let idx = 0;
  while ((idx = text.toLowerCase().indexOf(kw.toLowerCase(), idx)) !== -1) {
    const start = Math.max(0, idx - 100);
    const end = Math.min(text.length, idx + 100);
    console.log(`[Pos ${idx}] ... ${text.substring(start, end).replace(/\s+/g, ' ')} ...`);
    idx += kw.length;
  }
});
