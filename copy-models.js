const fs = require('fs');
const path = require('path');

const srcDir = 'F:\\AI Pet Companion !\\Assets\\Ultimate Stylized Nature - May 2022-20260615T215742Z-3-001\\glTF';
const destDir = 'F:\\AI Pet Companion !\\frontend\\public\\models\\nature';

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
let count = 0;
for (const file of files) {
    if (file.endsWith('.gltf') || file.endsWith('.bin') || file.endsWith('.png') || file.endsWith('.jpg')) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        count++;
    }
}
console.log(`Copied ${count} GLB files.`);
