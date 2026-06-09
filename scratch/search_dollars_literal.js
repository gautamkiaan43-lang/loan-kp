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
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.html') || file.endsWith('.css')) {
      results.push(fullPath);
    }
  });
  return results;
};

const searchDir = 'c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-frontend\\src';
const files = walk(searchDir);

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check if line contains a dollar sign that is not part of a JS template literal ${}
    // E.g. check for things like: "$" or '$' or >$ or $ alone or in text.
    // We can check if it has '$' but does not have '${' or '$' followed by digits/letters without context
    if (line.includes('$')) {
      // Let's strip out JS template literal patterns ${...}
      const stripped = line.replace(/\$\{[^}]+\}/g, '');
      if (stripped.includes('$')) {
        console.log(`${file.replace('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-frontend\\src\\', '')}:${idx + 1}: ${line.trim()}`);
      }
    }
  });
});
