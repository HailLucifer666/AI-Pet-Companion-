const { execSync } = require('child_process');
const fs = require('fs');

const keep = [
  'PineTree_1',
  'PineTree_2',
  'NormalTree_1',
  'Rock_1',
  'Rock_2',
  'Rock_4',
  'Bush_Small',
  'Grass_Large'
];

console.log('Installing gltf-pipeline globally...');
execSync('npm install -g gltf-pipeline', { stdio: 'inherit' });

keep.forEach(name => {
  const file = 'public/models/nature/' + name + '.glb';
  if (fs.existsSync(file)) {
    console.log('Compressing ' + file + '...');
    try {
      execSync(`npx gltf-pipeline -i "${file}" -o "${file.replace('.glb', '_compressed.glb')}" -d`, { stdio: 'inherit' });
      fs.renameSync(file.replace('.glb', '_compressed.glb'), file);
    } catch (e) {
      console.error('Failed to compress ' + file, e);
    }
  }
});

console.log('Cleaning up unused files...');
const allFiles = fs.readdirSync('public/models/nature/');
allFiles.forEach(f => {
  if (f === 'CREDITS.md') return;
  const nameMatch = keep.find(k => f === k + '.glb');
  if (!nameMatch) {
    console.log('Deleting ' + f);
    fs.unlinkSync('public/models/nature/' + f);
  }
});
console.log('Done!');
