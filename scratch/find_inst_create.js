const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchDir(filePath);
      }
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('installment') && (content.includes('create') || content.includes('upsert') || content.includes('insert'))) {
        console.log(`Found in: ${filePath}`);
        // Let's print the line matching it
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('installment') && (line.includes('create') || line.includes('upsert') || line.includes('insert'))) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

searchDir('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~');
