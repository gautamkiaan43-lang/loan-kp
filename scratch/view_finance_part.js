const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\controllers\\financeController.js', 'utf8');

console.log(content.substring(24200, 25600));
