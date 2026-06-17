const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/DELL/Downloads/Kiaan project/LMS/LMS-frontend';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('next7') || content.includes('calcSettlementAmount') || content.includes('12,908') || content.includes('12908') || content.includes('614.64') || content.includes('12,293.36')) {
        console.log(`Found match in file: ${fullPath}`);
        // Print matching lines
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('next7') || line.includes('calcSettlementAmount') || line.includes('12,908') || line.includes('12908') || line.includes('614.64') || line.includes('12,293.36')) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir(baseDir);
