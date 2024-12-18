# gltf-model-plus

This aframe component allows to load a glb with extensions from the [hubs blender addon](https://github.com/MozillaReality/hubs-blender-exporter).

This is an alternate implementation of how Hubs imported the scene glb with aframe components. Some key differences:

- Don't inflate the scene glb as aframe entities, keep it as is, but if needed create an entity and reparent the mesh to apply an aframe component (nav-mesh, waypoint, simple-water), keep track of those to remove them when switching scene.
- Properly dispose of geometries, materials and textures when switching scene

## Usage

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-gltf-model-plus@5a4750b/dist/aframe-master-custom-r171.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-gltf-model-plus@1.0.0/dist/gltf-model-plus.min.js"></script>
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

See the [index.html](https://github.com/c-frame/aframe-gltf-model-plus/blob/main/examples/playground/index.html) file for the full example, some additional scripts and templates are required.
This example is really just demonstrating how to load a hubs scene and has no UI.
If you need a multi-users experience with avatars, chat, audio and screen share, look at the [naf-valid-avatars](https://github.com/networked-aframe/naf-valid-avatars) example.

The `gltf-model-plus` component make some assumptions:

- You have the `simple-navmesh-constraint` component loaded.
- It will load the environment-settings extension from the glb only if you add the class "environment-settings" to the entity.

The `waypoint` component make some assumptions:

- You have your camera rig with id="rig" or id="cameraRig", and a child entity with the camera component.
- For the spawn point to work (a waypoint with canBeSpawnPoint set to true), you need to add the `move-to-spawn-point` component on the camera rig. Be sure to remove any `spawn-in-circle` component that conflicts with it.
- You have a raycaster component that targets `.clickable`, example `raycaster="far: 100; objects: .clickable;"`
- You need to call unoccupyWaypoint() for navigation-start and moved events, see the player-info component in index.html
- Optional: you have a player-info component on the camera rig with avatarPose string property (stand or sit) and seatRotation number property (y angle).

## Components and primitives

Some components can also be used on `<a-entity>`.
See the [components documentation](https://github.com/c-frame/aframe-gltf-model-plus/blob/main/docs/components.md).

## Run the examples locally

Clone the repo, install the dev dependencies and start the dev server:

```sh
git clone https://github.com/c-frame/aframe-gltf-model-plus.git
cd aframe-gltf-model-plus
npm install
npm start
```

Then go to http://localhost:8080

To test your scene, you can copy `your_scene.glb` in the `examples/playground` folder,
edit `examples/playground/index.html` and modify the line that references the scene to
`<a-asset-item id="sceneGLB" src="./your_scene.glb"></a-asset-item>`
and refresh the page.

## Deployment

You can deploy the content of the `examples/playground` folder to any server with static hosting but be sure to replace those two script tags:

```html
<script src="../../dist/aframe-master-custom-r171.min.js"></script>
<script src="../../dist/gltf-model-plus.min.js"></script>
```

by

```html
<script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-gltf-model-plus@5a4750b/dist/aframe-master-custom-r171.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-gltf-model-plus@1.0.0/dist/gltf-model-plus.min.js"></script>
```

Depending on your needs, if your experience doesn't require multi-users, you can run it on GitHub Pages for free. For this you need to push the folder content on a public GitHub repository and enable GitHub Pages in the repository settings.

If your experience only needs users without audio you can use the networked-aframe wseasyrtc or socketio adapters (see list of [naf adapters](https://github.com/networked-aframe/networked-aframe?tab=readme-ov-file#adapters)).

For 3-4 users with audio and video with the easyrtc adapter (peer to peer), you can host it for free (the server will need to wake up on first access) or using a paid subscription on [Glitch](https://glitch.com).

If you need more users with audio and video, you can subscribe to a VPS and have up to 30 users in a room with the janus adapter (SFU).

## Blender hubs components compatibility

Legend:

- [x] Done
- [?] Probably won't be implemented

### Animation

- [x] Loop Animation ({clip: 'animationName'} and {activeClipIndices: [0]} structs support only)
- [x] UV Scroll

### Avatar

- [?] Morph Audio Feedback
- [?] Personal Space Invader
- [?] Scale Audio Feedback

### Elements

- [x] Link (open-link to not conflict with aframe link component)
- [x] Media Frame
- [x] Particle Emitter
- [x] Simple Water (use simple TextureLoader instead of HubsTextureLoader so no ImageBitmap, only support high quality so MeshStandardMaterial)
- [ ] Spawner
- [x] Text (with [aframe-troika-text](https://github.com/lojjic/aframe-troika-text))
- [x] Waypoint (if you add move-to-spawn-point component on your camera rig, it takes the first waypoint with canBeSpawnPoint to change the camera rig position and rotation, and reset camera rig to first spawn point when switching scene)
- [ ] Mirror (use @fern-solutions/aframe-mirror) It's not in hubs addons, but you can write a Python module to add it.

### Lights

- [ ] Ambient Light
- [ ] Directional Light
- [ ] Hemisphere Light
- [ ] Point Light
- [ ] Spot Light

### Media

- [x] Audio: sounds with old audio component or audio+audio-params components
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
- [x] Billboard
- [?] Frustum
- [x] Visible (used with nav-mesh component generally)

### Scene

Some features require a [custom aframe build](https://github.com/c-frame/aframe-gltf-model-plus/blob/main/docs/custom_aframe_build.md).

- [x] Navigation Mesh (aframe-extras nav-mesh component is set on it for aframe-extras nav-agent, and also a class navmesh that can be used with simple-navmesh-constraint)
- [?] Scene Preview Camera
- [x] Video Texture Target (set on a material associated to a plane on an avatar or in the scene)
- [?] Skybox
- [x] Environment Settings (from Scene icon)
  - [x] toneMapping with LUTToneMapping support (require custom aframe build) & toneMappingExposure
- [ ] Fog (from Scene icon)
- [x] Support of MOZ_lightmap (Node in Shading tab)
- [x] Reflection Probe (require custom aframe build)

For comparison of this repository with Hubs code, see [mapping to aframe components in Hubs's gltf-component-mappings.js](https://github.com/mozilla/hubs/blob/f1213d3e8b8a21960f49d1e7f0504825f59ceef8/src/gltf-component-mappings.js).
