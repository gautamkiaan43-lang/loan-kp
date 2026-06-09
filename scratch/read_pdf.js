const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\_SLA_2026-06-02.pdf');
console.log(content.toString('utf8').substring(0, 1000));
console.log('Total length:', content.length);
