const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.gemini'];
const FILE_EXTS = ['.js', '.jsx', '.json', '.html', '.css', '.prisma'];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        scanDir(fullPath);
      }
    } else {
      if (FILE_EXTS.includes(path.extname(file))) {
        checkFile(fullPath);
      }
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Find literal $ not followed by {
    let index = -1;
    while ((index = line.indexOf('$', index + 1)) !== -1) {
      if (line[index + 1] !== '{') {
        console.log(`${filePath}:${i + 1}: ${line.trim()}`);
      }
    }
  }
}

const rootDir = 'C:\\Users\\DELL\\Downloads\\Kiaan project\\LMS';
console.log('Scanning ' + rootDir);
scanDir(rootDir);
