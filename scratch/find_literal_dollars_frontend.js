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
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.html')) {
      results.push(fullPath);
    }
  });
  return results;
};

const files = walk('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-frontend\\src');
console.log(`Scanning ${files.length} files...`);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check if the line has a dollar sign '$'
    if (line.includes('$')) {
      // Ignore lines that only have JS template literal placeholders: ${something} and no other $
      // We can do this by removing all `${...}` and checking if any $ remains.
      const stripped = line.replace(/\$\{[^}]+\}/g, '');
      if (stripped.includes('$')) {
        // Also check if it's just a regex or variable/import
        if (!line.includes('regex') && !line.includes('const $') && !line.includes('import ') && !line.includes('API_BASE_URL')) {
          console.log(`${path.basename(file)}:${idx+1}: ${line.trim()}`);
        }
      }
    }
  });
});
