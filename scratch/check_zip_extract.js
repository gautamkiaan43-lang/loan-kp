const fs = require('fs');
const path = require('path');

const dirs = [
  'c:/Users/DELL/Downloads/Kiaan project/LMS/real_zip_extract',
  'c:/Users/DELL/Downloads/Kiaan project/LMS/temp_zip_extract'
];

dirs.forEach(d => {
  if (fs.existsSync(d)) {
    console.log(`Directory ${d} contents:`);
    const files = fs.readdirSync(d);
    files.forEach(f => {
      console.log(`  - ${f}`);
    });
  } else {
    console.log(`Directory ${d} does not exist`);
  }
});
