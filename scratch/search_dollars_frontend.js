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

console.log(`Searching in ${files.length} frontend files...`);

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  // Look for any '$' character that is NOT preceded by '{' (as in '${') or backslash '\$'
  const regex = /(?<!\{|\\)\$/g;
  let count = 0;
  while ((match = regex.exec(content)) !== null) {
    count++;
    // Get line number
    const lineNum = content.substring(0, match.index).split('\n').length;
    const line = content.split('\n')[lineNum - 1];
    console.log(`Found in: ${file.replace('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-frontend\\src\\', '')}:${lineNum} -> ${line.trim()}`);
  }
});
