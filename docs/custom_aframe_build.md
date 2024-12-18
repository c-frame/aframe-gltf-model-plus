# Create an aframe build with LUTToneMapping and reflection probes support

I implemented support for "LUTToneMapping" (Blender 'Filmic') tone mapping so the scene is bright like in hubs instead of using by default "ACESFilmicToneMapping" (ThreeJS 'ACES Filmic'). Related code in hubs:

- https://github.com/mozilla/hubs/blob/9cda2d8b638b039843d6311c8bee2ffa2ac61550/src/systems/environment-system.js#L135-L155
- https://github.com/mozilla/hubs/commit/049fd417126e0fda723ee7bf63634e138f44225b
- https://github.com/mrdoob/three.js/commit/7f29038a9c4b69dec0bc3109edecf6f3668d6ffc

see the code in inflators/environment-settings.js

For this to work, you need a custom build of aframe.
Here is how to create an aframe master (pre 1.7.0 release) / three 171 build with the required patch in threejs:

```
git clone git@github.com:supermedium/three.js.git super-three
git clone git@github.com:aframevr/aframe.git

cd aframe
git pull
git checkout 24c2bad3cf838c6440f425023f52e9600acfa47a # master pre 1.7.0 2024-11-29 r171
rm -rf package-lock.json node_modules
npm install

cd ../super-three
git remote add hubs git@github.com:MozillaReality/three.js.git
git remote add vincentfretin git@github.com:vincentfretin/three.js.git
git fetch origin
git fetch hubs
git checkout super-171 # look at the super-three version in aframe/package.json and adapt the branch accordingly
git checkout -b super-171-lut

# https://github.com/mrdoob/three.js/compare/dev...MozillaReality:three.js:hubs-patches-147
# Note: cherry-pick the commit from the previous branch to avoid conflicts
# PannerNode optimization https://github.com/MozillaReality/three.js/commit/d11c1b5674a614bc1b95fef746e8a81e65c8263a
git cherry-pick d11c1b5674a614bc1b95fef746e8a81e65c8263a
# Don't apply IBL irradiance to lightmapped objects https://github.com/MozillaReality/three.js/commit/42dec78a61db57bc7ae0cde025248c39d4a4a9cf
git cherry-pick 42dec78a61db57bc7ae0cde025248c39d4a4a9cf
# LUT tone mapping https://github.com/MozillaReality/three.js/commit/89c223982b5a95dd27d557bf8386c894fa80188d
git cherry-pick 89c223982b5a95dd27d557bf8386c894fa80188d
# Reflection probes https://github.com/MozillaReality/three.js/commit/2d3039919f26dc74f0444f8970ac122ec146ddf6
git cherry-pick 2d3039919f26dc74f0444f8970ac122ec146ddf6
git push --set-upstream vincentfretin super-171-lut
rm -rf node_modules/ package-lock.json
npm install
npm run build
git commit -am"Build dist"
git push
cp build/three.* ../aframe/node_modules/three/build/

cd ../aframe
npm run dist

cp dist/aframe-master.min.js* ../gltf-model-plus/dist/
```
