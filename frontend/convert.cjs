const { execSync } = require('child_process');
const path = require('path');

const input1 = path.resolve('../Assets/Medieval Village Pack - Dec 2020/Props/OBJ/Bonfire_Lit.obj');
const output1 = path.resolve('./public/models/village/Bonfire_Lit.glb');

const input2 = path.resolve('../Assets/Medieval Village Pack - Dec 2020/Buildings/OBJ/Mill.obj');
const output2 = path.resolve('./public/models/village/Mill.glb');

try {
  console.log('Converting Bonfire_Lit...');
  execSync(`npx obj2gltf -i "${input1}" -o "${output1}" --binary`, {stdio: 'inherit'});
  console.log('Converting Mill...');
  execSync(`npx obj2gltf -i "${input2}" -o "${output2}" --binary`, {stdio: 'inherit'});
  
  console.log('Optimizing models...');
  execSync('npm run optimize:models', {stdio: 'inherit'});
  console.log('Done!');
} catch (e) {
  console.error('Error during conversion:', e.message);
}
