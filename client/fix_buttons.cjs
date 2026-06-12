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
  // Primary buttons to white with black text
  { from: /background\s*:\s*['"`]linear-gradient\(\s*135deg\s*,\s*#D1D5DB\s*0%\s*,\s*#6B7280\s*100%\s*\)['"`]/g, to: "background:'#FFFFFF'" },
  { from: /background\s*:\s*['"`]linear-gradient\(\s*135deg\s*,\s*#D1D5DB\s*,\s*#6B7280\s*\)['"`]/g, to: "background:'#FFFFFF'" },
  { from: /color\s*:\s*['"`]#fff['"`]/g, to: "color:'#000'" },
  { from: /color\s*:\s*['"`]#FFFFFF['"`]/gi, to: "color:'#000'" },
  { from: /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*\.35\s*\)/g, to: "rgba(255,255,255,.15)" }
];

const files = getAllFiles(srcDir);
let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // We only want to replace #fff -> #000 if it's right next to our gradient, 
  // but it's simpler to just do the button replacement. Wait, blindly changing #fff to #000 
  // might ruin text colors! 
  // Instead of the above, let's write a targeted regex for the button styles.
}
