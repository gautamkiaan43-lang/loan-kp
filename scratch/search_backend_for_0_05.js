const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/DELL/Downloads/Kiaan project/LMS/Lenni-Backend(Clone)';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.json')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('0.05') || content.includes('.05') || content.includes('* 0.0') || content.includes('/ 100') || content.includes('* 5') || content.includes('/ 20')) {
        console.log(`Found match in file: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('0.05') || line.includes('.05') || line.includes('* 0.0') || line.includes('/ 100') || line.includes('* 5') || line.includes('/ 20')) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir(baseDir);
