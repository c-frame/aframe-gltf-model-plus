# gltf-model-plus

This aframe component allows to load a glb with extensions from the [hubs blender addon](https://github.com/MozillaReality/hubs-blender-exporter).

This is an alternate implementation of how Hubs imported the scene glb with aframe components. Some key differences:

- Don't inflate the scene glb as aframe entities, keep it as is, but if needed create an entity and reparent the mesh to apply an aframe component (nav-mesh, waypoint, simple-water), keep track of those to remove them when switching scene.
- Properly dispose of geometries, materials and textures when switching scene

## Usage

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-gltf-model-plus@main/dist/aframe-1.4.2-custom.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-gltf-model-plus@main/dist/gltf-model-plus.min.js"></script>
  ...
</head>
<body>
  <a-scene>
    <a-assets timeout="30000">
      <a-asset-item
        id="sceneGLB"
        src="https://cdn.jsdelivr.net/gh/c-frame/outdoor-festival@e9311cf/Outdoor_Festival.glb"
      ></a-asset-item>
    </a-assets>
    <a-entity class="environment-settings" gltf-model-plus="#sceneGLB"></a-entity>
    ...
  </a-scene>
</body>
```

See the [index.html](https://github.com/c-frame/aframe-gltf-model-plus/blob/main/index.html) file for the full example, some additional scripts and templates are required.
This example is really simple, demonstrating how to load a hubs scene. If you need a multi-users experience with avatars, chat, audio and screen share, look at the [naf-valid-avatars](https://github.com/networked-aframe/naf-valid-avatars) example.

The `gltf-model-plus` component make some assumptions:

- You have the `simple-navmesh-constraint` component loaded.
- It will load the environment-settings extension from the glb only if you add the class "environment-settings" to the entity.

The `waypoint` component make some assumptions:

- You have your camera rig with id="rig" or id="cameraRig", and a child entity with the camera component.
- For the spawn point to work (a waypoint with canBeSpawnPoint set to true), you need to add the `move-to-spawn-point` component on the camera rig. Be sure to remove any `spawn-in-circle` component that conflicts with it.
- You have a raycaster component that targets `.clickable`, example `raycaster="far: 100; objects: .clickable;"`
- You need to call unoccupyWaypoint() for navigation-start and moved events, see the player-info component in index.html
- Optional: you have a player-info component on the camera rig with avatarPose string property (stand or sit) and seatRotation number property (y angle).
- Optional: to have the transition animation when clicking on a waypoint, you need to have the `cursor-teleport` component on the camera rig.

## Blender hubs components compatibility

Legend:

- [x] Done
- [.] Some of it done, see subtasks
- [?] Probably won't be implemented

### Animation

- [.] Loop Animation ({clip: 'animationName'} and {activeClipIndices: [0]} structs support only)
  - [ ] use networked id to sync animation between participants
- [x] UV Scroll

### Avatar

- [?] Morph Audio Feedback
- [?] Personal Space Invader
- [?] Scale Audio Feedback

### Elements

- [ ] Link (h-link to not conflict with aframe core link component)
- [.] Media Frame
- [ ] Particle Emitter
- [.] Simple Water (use simple TextureLoader instead of HubsTextureLoader, so no ImageBitmap, only support high quality so MeshStandardMaterial)
  - [x] simple-water aframe component
  - [ ] handle simple-water component from glb, reparent to an entity to set the simple-water component
- [ ] Spawner
- [ ] Text (with troika)
- [x] Waypoint (if you add move-to-spawn-point component on your camera rig, it takes the first waypoint with canBeSpawnPoint to change the camera rig position and rotation, and reset camera rig to first spawn point when switching scene)
- [ ] Mirror (use @fern-solutions/aframe-mirror) It's not in hubs addons, but you can write a Python module to add it.

### Lights

- [?] Ambient Light
- [?] Directional Light
- [?] Hemisphere Light
- [?] Point Light
- [?] blender Point light when exporting glb with "Punctual Lights" checked
- [?] Spot Light

### Media

- [ ] Audio
- [ ] Audio Params: sound effects with old audio component or audio+audio-params components
  - [ ] synced audio with networked id
- [?] Audio Source
- [?] Audio Target
- [?] Audio Zone
- [ ] Image
- [ ] Model
- [ ] PDF
- [ ] Video

### Object

- [ ] Ammo Shape
- [ ] Shadow (to set receive and cast)
- [ ] Billboard
- [?] Frustum
- [x] Visible (used with nav-mesh component generally)

### Scene

- [x] Navigation Mesh (aframe-extras nav-mesh component is set on it for aframe-extras nav-agent, and also a class navmesh that can be used with simple-navmesh-constraint)
- [?] Scene Preview Camera
- [x] Video Texture Target (set on a material associated to a plane on an avatar or in the scene)
- [?] Skybox
- [x] Environment Settings (from Scene icon)
  - [x] toneMapping with LUTToneMapping support (see how to patch aframe build below) & toneMappingExposure
- [ ] Fog (from Scene icon)
- [x] Support of MOZ_lightmap (Node in Shading tab)
- [x] Reflection Probe

mapping to aframe components:
https://github.com/mozilla/hubs/blob/f1213d3e8b8a21960f49d1e7f0504825f59ceef8/src/gltf-component-mappings.js

## Create an aframe build with LUTToneMapping and reflection probes support

I implemented support for "LUTToneMapping" (Blender 'Filmic') tone mapping so the scene is bright like in hubs instead of using by default "ACESFilmicToneMapping" (ThreeJS 'ACES Filmic'). Related code in hubs:

- https://github.com/mozilla/hubs/blob/9cda2d8b638b039843d6311c8bee2ffa2ac61550/src/systems/environment-system.js#L135-L155
- https://github.com/mozilla/hubs/commit/049fd417126e0fda723ee7bf63634e138f44225b
- https://github.com/mrdoob/three.js/commit/7f29038a9c4b69dec0bc3109edecf6f3668d6ffc

see the code in inflators/environment-settings.js

For this to work, you need a custom build of aframe.
Here is how to create an aframe 1.4.2 / three 147 build with the required patch in threejs:

```
git clone git@github.com:supermedium/three.js.git super-three
git clone git@github.com:aframevr/aframe.git

cd aframe
git pull
git checkout aa42fe342bd1d02145054113a2737f738897825b # 1.4.2 version
rm -rf package-lock.json node_modules
npm install

cd ../super-three
git checkout super-r147 # look at the super-three version in aframe/package.json and adapt the branch accordingly
git checkout -b super-r147-lut
git remote add hubs git@github.com:MozillaReality/three.js.git
git remote add vincentfretin git@github.com:vincentfretin/three.js.git
git fetch origin
git fetch hubs

# https://github.com/mrdoob/three.js/compare/dev...MozillaReality:three.js:hubs-patches-147

# PannerNode optimization https://github.com/MozillaReality/three.js/commit/d11c1b5674a614bc1b95fef746e8a81e65c8263a
git cherry-pick d11c1b5674a614bc1b95fef746e8a81e65c8263a
# Don't apply IBL irradiance to lightmapped objects https://github.com/MozillaReality/three.js/commit/42dec78a61db57bc7ae0cde025248c39d4a4a9cf
git cherry-pick 42dec78a61db57bc7ae0cde025248c39d4a4a9cf
# LUT tone mapping https://github.com/MozillaReality/three.js/commit/89c223982b5a95dd27d557bf8386c894fa80188d
git cherry-pick 89c223982b5a95dd27d557bf8386c894fa80188d
# Reflection probes https://github.com/MozillaReality/three.js/commit/2d3039919f26dc74f0444f8970ac122ec146ddf6
git cherry-pick 2d3039919f26dc74f0444f8970ac122ec146ddf6
# [HUBS] [r148] GLTFLoader: Clean up Skeleton binding https://github.com/MozillaReality/three.js/commit/f2b8b441c32efec6ca0d0c362c6447ac9a2d7875
git cherry-pick f2b8b441c32efec6ca0d0c362c6447ac9a2d7875
# [HUBS] [r148] GLTFLoader: Clean up node hierarchy build https://github.com/MozillaReality/three.js/commit/1f90c60c4402242f17ab5791fb1e25695ad82256
git cherry-pick 1f90c60c4402242f17ab5791fb1e25695ad82256
# [HUBS] [Upcoming] GLTFLoader: Add loadNode hook https://github.com/mrdoob/MozillaReality/commit/f282aec724e6fdb753424ee057215cbb238c6da2
git cherry-pick f282aec724e6fdb753424ee057215cbb238c6da2
# [HUBS] [Upcoming] FileLoader: HTTP Range requests support https://github.com/MozillaReality/three.js/commit/98e13ffbca2817dc557e0b6ff51031c646f207d1
git cherry-pick 98e13ffbca2817dc557e0b6ff51031c646f207d1
git push --set-upstream vincentfretin super-r147-lut
rm -rf node_modules/ package-lock.json
npm install
npm run build
git commit -am"Build dist"
git push
cp build/three.\* ../aframe/node_modules/super-three/build/
cp examples/jsm/loaders/DRACOLoader.js ../aframe/node_modules/super-three/examples/jsm/loaders/DRACOLoader.js

cd ../aframe
npm run dist

cp dist/aframe-master.min.js\* ../gltf-model-plus/dist/
```
