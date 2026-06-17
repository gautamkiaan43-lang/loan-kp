const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/DELL/Downloads/Kiaan project/LMS/LMS-Backend(Upadte)';
if (fs.existsSync(filePath)) {
  const stats = fs.statSync(filePath);
  console.log(`File exists. Size: ${stats.size} bytes. IsDirectory: ${stats.isDirectory()}`);
  
  // Let's read first few bytes to check if it's a zip file (PK...)
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(4);
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  console.log(`First 4 bytes: ${buffer.toString('hex')} / ${buffer.toString('ascii')}`);
} else {
  console.log("File not found:", filePath);
}
