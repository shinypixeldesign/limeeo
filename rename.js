const fs = require('fs');
const path = require('path');

const dir = process.cwd();

const EXCLUDED_DIRS = ['.git', '.next', 'node_modules', '.vscode'];
const EXCLUDED_FILES = ['package-lock.json', 'rename.js'];
const IGNORE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp'];

let replacedCount = 0;
let fileCount = 0;

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(file)) {
        processDirectory(fullPath);
      }
    } else {
      if (EXCLUDED_FILES.includes(file) || IGNORE_EXTENSIONS.includes(path.extname(file).toLowerCase())) {
        continue;
      }

      let content = fs.readFileSync(fullPath, 'utf8');
      
      const originalContent = content;

      // Replace Freelio -> Limeeo
      content = content.replace(/Freelio/g, 'Limeeo');
      // Replace freelio -> limeeo
      content = content.replace(/freelio/g, 'limeeo');
      // Replace FREELIO -> LIMEEO (just in case)
      content = content.replace(/FREELIO/g, 'LIMEEO');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
        replacedCount++;
      }
      fileCount++;
    }
  }
}

console.log('Starting rename process...');
processDirectory(dir);
console.log(`Done! Scanned ${fileCount} files, updated ${replacedCount} files.`);
