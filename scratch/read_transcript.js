const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\a5b7ce83-b1de-4af1-970a-14cb9fbdacd4\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(transcriptPath)) {
  console.log("Transcript not found at", transcriptPath);
  process.exit(1);
}

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
console.log(`Read ${lines.length} lines from transcript.`);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    // Let's print steps containing "12,908" or "614.64" or "next7"
    const text = JSON.stringify(obj);
    if (text.includes("614.64") || text.includes("12,908") || text.includes("next7")) {
      console.log(`--- Step ${obj.step_index} (${obj.source} / ${obj.type}) ---`);
      if (obj.content) {
        console.log(obj.content.substring(0, 1000) + (obj.content.length > 1000 ? "..." : ""));
      } else {
        console.log("No text content, type:", obj.type);
      }
    }
  } catch (e) {
    console.error("Error parsing line", i, e.message);
  }
}
