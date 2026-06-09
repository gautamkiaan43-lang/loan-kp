const fs = require('fs');
const path = require('path');

const xmlPath = 'c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\extracted_docx\\word\\document.xml';
if (!fs.existsSync(xmlPath)) {
  console.log('File does not exist:', xmlPath);
  process.exit(1);
}

const content = fs.readFileSync(xmlPath, 'utf8');

// A crude regex to find all <w:t>...</w:t> tags
const matches = content.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
const text = matches.map(match => {
  const m = match.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
  return m ? m[1] : '';
}).join('');

console.log(text);
// Write to a text file for easy reading
fs.writeFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\scratch\\extracted_text.txt', text);
console.log('Saved to scratch/extracted_text.txt');
