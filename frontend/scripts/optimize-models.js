import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const modelsDir = path.join(frontendDir, 'public/models');

console.log(`Searching for models in: ${modelsDir}`);

const modelsDirGlob = modelsDir.replace(/\\/g, '/');
const files = globSync(`${modelsDirGlob}/**/*.{gltf,glb}`);

if (files.length === 0) {
  console.log('No models found to optimize.');
  process.exit(0);
}

console.log(`Found ${files.length} models. Optimizing via @gltf-transform/cli...`);

for (const file of files) {
  const relPath = path.relative(modelsDir, file);
  console.log(`\n=> Optimizing: ${relPath}`);
  
  // We use the --texture-compress webp and Draco compression flags.
  // We overwrite the file in place to maintain references.
  const isGltf = file.endsWith('.gltf');
  const tempFile = file + '.opt.glb';
  const finalFile = file.replace(/\.gltf$/, '.glb');
  
  try {
    // Run gltf-transform optimize
    const cmd = `npx gltf-transform optimize "${file}" "${tempFile}" --texture-compress webp`;
    execSync(cmd, { stdio: 'inherit', cwd: frontendDir });
    
    // Replace original
    if (fs.existsSync(finalFile) && finalFile !== file) {
       fs.unlinkSync(finalFile);
    }
    fs.renameSync(tempFile, finalFile);
    if (isGltf) {
      fs.unlinkSync(file); // delete the original .gltf
    }
    console.log(`   âœ“ Done: ${relPath} -> ${path.basename(finalFile)}`);
  } catch (err) {
    console.error(`   âœ˜ Failed to optimize ${relPath}.`);
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

console.log('\nAll models optimized.');
