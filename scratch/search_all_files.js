const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/DELL/Downloads/Kiaan project/LMS';

function searchDir(dir) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    return;
  }
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === '.gemini' || file === 'project-memory') continue;
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (err) {
      continue;
    }
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.sql') || file.endsWith('.txt') || file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.xml') || file.endsWith('.html'))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('12908') || content.includes('12,908') || content.includes('614.64') || content.includes('12293') || content.includes('12,293') || content.includes('15366') || content.includes('15,366')) {
          console.log(`Found match in file: ${fullPath}`);
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('12908') || line.includes('12,908') || line.includes('614.64') || line.includes('12293') || line.includes('12,293') || line.includes('15366') || line.includes('15,366')) {
              console.log(`  Line ${idx + 1}: ${line.trim()}`);
            }
          });
        }
      } catch (err) {
        // ignore read error
      }
    }
  }
}

searchDir(baseDir);
