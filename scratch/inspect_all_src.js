const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const srcDir = path.join(__dirname, '..', '..', 'LMS-frontend', 'src');
walkDir(srcDir, filePath => {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('employeeNumber') || content.includes('employee_number')) {
            console.log(`Found in: ${path.relative(srcDir, filePath)}`);
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (line.includes('employeeNumber') || line.includes('employee_number')) {
                    console.log(`  Line ${index + 1}: ${line.trim()}`);
                }
            });
        }
    }
});
