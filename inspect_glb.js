const fs = require('fs');

const data = fs.readFileSync('frontend/public/models/village/Tavern.glb');
// just strings inside the GLB
const str = data.toString('utf-8');
const materials = [...str.matchAll(/"name":"([^"]+)"/g)].map(m => m[1]);
console.log([...new Set(materials)]);
