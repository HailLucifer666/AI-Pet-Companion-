@echo off
npx obj2gltf -i "f:\AI Pet Companion !\Assets\Medieval Village Pack - Dec 2020\Buildings\OBJ\Blacksmith.obj" -o "public\models\village\Blacksmith.glb" --binary
npx obj2gltf -i "f:\AI Pet Companion !\Assets\Medieval Village Pack - Dec 2020\Props\OBJ\Bonfire_Lit.obj" -o "public\models\village\Bonfire_Lit.glb" --binary
npx obj2gltf -i "f:\AI Pet Companion !\Assets\Medieval Village Pack - Dec 2020\Buildings\OBJ\Mill.obj" -o "public\models\village\Mill.glb" --binary
npx obj2gltf -i "f:\AI Pet Companion !\Assets\Medieval Village Pack - Dec 2020\Props\OBJ\Well.obj" -o "public\models\village\Well.glb" --binary
call npm run optimize:models
