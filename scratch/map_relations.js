const fs = require('fs');

const relsPath = 'c:/Users/DELL/Downloads/Kiaan project/LMS/Lenni-Backend(Clone)/scratch/change_req_extracted/word/_rels/document.xml.rels';
if (!fs.existsSync(relsPath)) {
  console.log("rels not found");
  process.exit(1);
}

const content = fs.readFileSync(relsPath, 'utf8');

const regex = /Id="([^"]+)"[\s\S]*?Target="media\/([^"]+)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(`Relation ID: ${match[1]} -> ${match[2]}`);
}
