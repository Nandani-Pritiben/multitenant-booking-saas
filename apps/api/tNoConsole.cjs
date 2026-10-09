const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkDir(fullPath);
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('console.')) {
        console.error('Found console. in: ' + fullPath);
        process.exit(1);
      }
    }
  }
}

checkDir(path.join(__dirname, 'src'));
console.log('No console. found in src/');
