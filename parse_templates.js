const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseTemplates() {
  const excelPath = "c:\\Users\\kiaan\\Desktop\\Kiaan\\Loan Software\\Loan_LMS_Report_Templates.xlsx";
  const extractDir = "c:\\Users\\kiaan\\Desktop\\Kiaan\\Loan Software\\backend\\extracted_templates";
  const outPath = "c:\\Users\\kiaan\\Desktop\\Kiaan\\Loan Software\\parsed_templates.json";

  if (!fs.existsSync(excelPath)) {
    console.error("Excel template file not found at " + excelPath);
    return;
  }

  // 1. Clean up and create extraction directory
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractDir, { recursive: true });

  // 2. Extract using tar.exe
  console.log("Extracting template ZIP using tar...");
  execSync(`tar -xf "${excelPath}" -C "${extractDir}"`);

  // 3. Parse Shared Strings if exists
  const ssPath = path.join(extractDir, 'xl', 'sharedStrings.xml');
  let strings = [];
  if (fs.existsSync(ssPath)) {
    const ssContent = fs.readFileSync(ssPath, 'utf8');
    const siBlocks = ssContent.match(/<si>([\s\S]*?)<\/si>/g) || [];
    strings = siBlocks.map(block => {
      const tMatches = block.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
      const text = tMatches.map(tTag => {
        const m = tTag.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        return m ? m[1] : '';
      }).join('');
      return decodeEntities(text);
    });
  }
  console.log(`Parsed ${strings.length} shared strings.`);

  // 4. Parse workbook.xml to get sheet names
  const wbPath = path.join(extractDir, 'xl', 'workbook.xml');
  const sheetNames = {};
  if (fs.existsSync(wbPath)) {
    const wbContent = fs.readFileSync(wbPath, 'utf8');
    const sheetMatches = wbContent.match(/<sheet[^>]*>/g) || [];
    sheetMatches.forEach(sheetTag => {
      const nameMatch = sheetTag.match(/name="([^"]+)"/);
      const idMatch = sheetTag.match(/sheetId="([^"]+)"/);
      const rIdMatch = sheetTag.match(/r:id="([^"]+)"/);
      if (nameMatch && idMatch) {
        sheetNames[idMatch[1]] = nameMatch[1];
      }
    });
  }

  // 5. Find and parse worksheets
  const wsDir = path.join(extractDir, 'xl', 'worksheets');
  const results = {};

  if (fs.existsSync(wsDir)) {
    const files = fs.readdirSync(wsDir);
    files.forEach(file => {
      if (file.startsWith('sheet') && file.endsWith('.xml')) {
        const sheetId = file.replace('sheet', '').replace('.xml', '');
        const sheetName = sheetNames[sheetId] || `Sheet ${sheetId}`;
        const filePath = path.join(wsDir, file);
        const wsContent = fs.readFileSync(filePath, 'utf8');

        console.log(`Parsing template sheet: ${sheetName}...`);
        const rows = {};
        
        // Find rows
        const rowBlocks = wsContent.match(/<row r="\d+"[\s\S]*?<\/row>/g) || [];
        rowBlocks.forEach(rowBlock => {
          const rMatch = rowBlock.match(/<row r="(\d+)"/);
          if (!rMatch) return;
          const rowIdx = parseInt(rMatch[1]);
          const rowCells = [];

          // Find cells
          const cellBlocks = rowBlock.match(/<c r="[A-Z]+\d+"[\s\S]*?<\/c>/g) || 
                             rowBlock.match(/<c r="[A-Z]+\d+"[^>]*\/>/g) || [];

          cellBlocks.forEach(cellBlock => {
            const rMatch = cellBlock.match(/r="([A-Z]+\d+)"/);
            if (!rMatch) return;
            const cellRef = rMatch[1];
            const colRef = cellRef.replace(/\d+/, '');

            const tMatch = cellBlock.match(/t="([^"]+)"/);
            const cellType = tMatch ? tMatch[1] : '';

            const vMatch = cellBlock.match(/<v[^>]*>([\s\S]*?)<\/v>/);
            let val = vMatch ? vMatch[1] : '';

            if (cellType === 's' && val !== '') {
              const idx = parseInt(val);
              if (idx >= 0 && idx < strings.length) {
                val = strings[idx];
              }
            } else if (val !== '') {
              const num = Number(val);
              if (!isNaN(num)) {
                val = num;
              }
            }

            rowCells.push({ col: colRef, val: val, ref: cellRef });
          });

          rowCells.sort((a, b) => {
            if (a.col.length !== b.col.length) return a.col.length - b.col.length;
            return a.col.localeCompare(b.col);
          });

          rows[rowIdx] = rowCells;
        });

        results[sheetName] = rows;
      }
    });
  }

  // Write results to JSON file
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`SUCCESS: Written parsed templates to ${outPath}`);
  return "SUCCESS";
}

try {
  parseTemplates();
} catch (err) {
  console.error("parseTemplates Error:", err);
  fs.writeFileSync("c:\\Users\\kiaan\\Desktop\\Kiaan\\Loan Software\\template_parse_error.txt", err.stack);
}
