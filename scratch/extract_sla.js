const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxPath = 'c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\kylekok538-attachments\\kylekok538-attachments\\SERVICE LEVEL AGREEMENT Lenni.docx';
const extractDir = 'c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\scratch\\sla_extracted';

if (!fs.existsSync(extractDir)) {
  fs.mkdirSync(extractDir, { recursive: true });
}

console.log('Extracting SLA docx...');
try {
  execSync(`tar -xf "${docxPath}" -C "${extractDir}"`);
  console.log('Extraction done.');
  
  const xmlPath = path.join(extractDir, 'word', 'document.xml');
  if (fs.existsSync(xmlPath)) {
    const content = fs.readFileSync(xmlPath, 'utf8');
    const matches = content.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    const text = matches.map(match => {
      const m = match.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
      return m ? m[1] : '';
    }).join(' ');
    
    fs.writeFileSync('c:\\Users\\DELL\\Downloads\\Kiaan project\\LMS\\LMS-Backend(Upadte)~\\scratch\\sla_text.txt', text);
    console.log('Saved to scratch/sla_text.txt. Length:', text.length);
  } else {
    console.log('document.xml not found in extracted SLA.');
  }
} catch (err) {
  console.error('Error during extraction/parsing SLA:', err);
}
