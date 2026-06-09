const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'Project-Memory') return;
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.html') || file.endsWith('.css')) {
      results.push(fullPath);
    }
  });
  return results;
};

const files = walk('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~');
console.log(`Scanning ${files.length} files in backend...`);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('$')) {
      // replace template literal ${...}
      let cleaned = line;
      while (cleaned.includes('${')) {
        const start = cleaned.indexOf('${');
        let depth = 1;
        let end = -1;
        for (let i = start + 2; i < cleaned.length; i++) {
          if (cleaned[i] === '{') depth++;
          else if (cleaned[i] === '}') {
            depth--;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }
        if (end !== -1) {
          cleaned = cleaned.substring(0, start) + cleaned.substring(end + 1);
        } else {
          break;
        }
      }
      if (cleaned.includes('$')) {
        if (!line.includes('regex') && !line.includes('const $') && !line.includes('import ') && !line.includes('package-lock.json')) {
          console.log(`${path.relative('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~', file)}:${idx+1}: ${line.trim()}`);
        }
      }
    }
  });
});
