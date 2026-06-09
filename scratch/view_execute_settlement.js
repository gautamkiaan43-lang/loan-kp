const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\controllers\\financeController.js', 'utf8');

const idx = content.indexOf('exports.executeSettlement');
if (idx !== -1) {
  console.log(content.substring(idx, idx + 2000));
} else {
  console.log('exports.executeSettlement not found');
}
