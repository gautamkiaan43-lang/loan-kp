const fs = require('fs');

const path = 'c:/Users/DELL/Downloads/Kiaan project/LMS/Lenni-Backend(Clone)/scratch/change_req_extracted/word/document.xml';

if (!fs.existsSync(path)) {
  console.log("File not found:", path);
  process.exit(1);
}

const content = fs.readFileSync(path, 'utf8');
console.log(`Content length: ${content.length}`);

const searchVal = (val) => {
  let idx = 0;
  while (true) {
    idx = content.indexOf(val, idx);
    if (idx === -1) break;
    console.log(`Found "${val}" around index ${idx}:`);
    console.log(content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + 100)));
    console.log("------------------------");
    idx += val.length;
  }
};

searchVal("15");
searchVal("12");
searchVal("15366");
searchVal("12293");
searchVal("12908");
searchVal("614");
