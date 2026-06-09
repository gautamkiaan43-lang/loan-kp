const fs = require('fs');
const path = require('path');

const controllersDir = 'c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\controllers';
const files = fs.readdirSync(controllersDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(controllersDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Look for create or update of installment
    let idx = 0;
    while ((idx = content.indexOf('installment', idx)) !== -1) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(content.length, idx + 100);
      console.log(`[${file} @ ${idx}] ... ${content.substring(start, end).replace(/\s+/g, ' ')} ...`);
      idx += 11;
    }
  }
});
