const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\controllers\\financeController.js', 'utf8');

// Search for disburse function
const idx = content.indexOf('exports.disburse');
if (idx !== -1) {
  console.log(content.substring(idx, idx + 2000));
} else {
  console.log('exports.disburse not found, search for disburse');
  let searchIdx = 0;
  while ((searchIdx = content.indexOf('disburse', searchIdx)) !== -1) {
    console.log(`Found disburse at ${searchIdx}:`, content.substring(searchIdx - 40, searchIdx + 150));
    searchIdx += 8;
  }
}
