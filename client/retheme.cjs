const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.jsx') || filePath.endsWith('.css')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const replacements = [
  // Hex Colors
  { from: /#7C3AED/gi, to: '#D1D5DB' },
  { from: /#6D28D9/gi, to: '#6B7280' },
  { from: /#A78BFA/gi, to: '#F3F4F6' },
  { from: /#8B5CF6/gi, to: '#D1D5DB' },
  { from: /#5B21B6/gi, to: '#374151' },
  
  // rgba colors
  { from: /rgba\(\s*139\s*,\s*92\s*,\s*246/g, to: 'rgba(255,255,255' },
  { from: /rgba\(\s*109\s*,\s*40\s*,\s*217/g, to: 'rgba(255,255,255' },
  { from: /rgba\(\s*124\s*,\s*58\s*,\s*237/g, to: 'rgba(255,255,255' },
  { from: /rgba\(\s*167\s*,\s*139\s*,\s*250/g, to: 'rgba(255,255,255' },
  
  // Update Backgrounds
  { from: /#07070F/gi, to: '#050505' },
  { from: /#0C0C1D/gi, to: '#0A0A0A' }
];

const files = getAllFiles(srcDir);
let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  for (const rep of replacements) {
    newContent = newContent.replace(rep.from, rep.to);
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedFiles++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Updated ${changedFiles} files.`);
