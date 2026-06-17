const fs = require('fs');

const xmlPath = 'c:/Users/DELL/Downloads/Kiaan project/LMS/Lenni-Backend(Clone)/scratch/change_req_extracted/word/document.xml';
if (!fs.existsSync(xmlPath)) {
  console.log("xml not found");
  process.exit(1);
}

const content = fs.readFileSync(xmlPath, 'utf8');

// Let's find all w:drawing elements or blip elements and look at the text before and after them
const regex = /<w:drawing>[\s\S]*?<a:blip[^>]*?r:embed="([^"]+)"[\s\S]*?<\/w:drawing>/g;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  count++;
  const embedId = match[1];
  const index = match.index;
  console.log(`\nImage #${count} - Embed ID: ${embedId} at index ${index}`);
  
  // print surrounding text (e.g. 300 chars before and 300 chars after w:drawing)
  const surrounding = content.substring(Math.max(0, index - 400), Math.min(content.length, index + match[0].length + 400));
  // clean up xml tags to see the plain text
  const plainText = surrounding.replace(/<[^>]+>/g, ' ');
  console.log(`Surrounding text: ${plainText.substring(0, 800)}`);
}
