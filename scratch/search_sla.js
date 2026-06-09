const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\scratch\\sla_text.txt', 'utf8');

const keywords = ['settle', 'outstanding', 'interest', 'fee', 'repayment', 'calculat', 'formula'];
const sentences = content.split(/[.!?]/);

console.log(`--- SLA Search Results ---`);
for (const sent of sentences) {
  const matched = keywords.filter(kw => sent.toLowerCase().includes(kw));
  if (matched.length > 0) {
    console.log(`Matched [${matched.join(', ')}]:`);
    console.log(sent.trim());
    console.log('-'.repeat(40));
  }
}
