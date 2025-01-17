/* global THREE */
import { LUTCubeLoader } from "three/addons/loaders/LUTCubeLoader.js";
import blenderLutPath from "../assets/blender-lut.cube";

const WITH_LUTTONEMAPPING = !!THREE.LUTToneMapping;

export const defaultEnvironmentSettings = {
  toneMapping: WITH_LUTTONEMAPPING ? "LUTToneMapping" : "NoToneMapping",
  toneMappingExposure: 1,
  backgroundColor: "skyblue",
  backgroundTexture: null,
  envMapTexture: null,
};

// const toneMappingOptions = {
//   None: "NoToneMapping",
//   Linear: "LinearToneMapping",
//   Reinhard: "ReinhardToneMapping",
//   Cineon: "CineonToneMapping",
//   ACESFilmic: "ACESFilmicToneMapping",
//   CustomToneMapping: "CustomToneMapping",
//   LUTToneMapping: "LUTToneMapping",
// };

let blenderLUTPromise; // lazy loaded

const updateMaterials = (scene) => {
  scene.traverse((o) => {
    if (o.material) o.material.needsUpdate = true;
  });
};

// settings example without GLTFHubsComponentsExtension plugin:
// {
//   "toneMapping": "LUTToneMapping",
//   "toneMappingExposure": 1,
//   "backgroundColor": "#ffffff",
//   "backgroundTexture": {
//       "__mhc_link_type": "texture",
//       "index": 0
//   },
//   "envMapTexture": {
//       "__mhc_link_type": "texture",
//       "index": 1
//   }
// }
// With GLTFHubsComponentsExtension plugin, backgroundTexture and envMapTexture are Texture objects.
export function inflateEnvironmentSettings(sceneEl, settings) {
  const scene = sceneEl.object3D;
  const renderer = sceneEl.renderer;
  let materialsNeedUpdate = false;
  let newToneMapping = THREE[settings.toneMapping];
  if (typeof newToneMapping === "undefined") {
    console.warn(
      "You need an aframe build with the tonemappingLUT patch to make LUTToneMapping work. Falling back to NoToneMapping"
    );
    newToneMapping = THREE.NoToneMapping;
  }
  if (renderer.toneMapping !== newToneMapping) {
    renderer.toneMapping = newToneMapping;
    if (newToneMapping === THREE.LUTToneMapping) {
      if (!blenderLUTPromise) {
        blenderLUTPromise = new Promise(function (resolve, reject) {
          new LUTCubeLoader().load(blenderLutPath, ({ texture3D }) => resolve(texture3D), null, reject);
        });
      }

      blenderLUTPromise
        .then((t) => {
          renderer.tonemappingLUT = t;
          updateMaterials(scene);
        })
        .catch(function (e) {
          console.error("Error loading Blender LUT", e);
          blenderLUTPromise = null;
        });
    } else {
      renderer.tonemappingLUT = null;
      materialsNeedUpdate = true;
    }
  }

  renderer.toneMappingExposure = settings.toneMappingExposure;

  if (settings.backgroundTexture) {
    // Assume texture is always an equirect for now
    settings.backgroundTexture.mapping = THREE.EquirectangularReflectionMapping;
    // When backgroundTexture is loaded via the aframe component, flipY is true
    // for hdr and ldr (loaded with TextureLoader that creates an img) and all is okay.
    // When the texture is loaded from the glb, for hdr and ldr (png/jpg/webp)
    // textures loaded with ImageBitmapLoader from GLTFLoader,
    // flipY is false, and we need the threejs patch
    // https://github.com/Hubs-Foundation/three.js/commit/928eb3cf7030f55eadb44d74ffd16451eda40781
    // to flip it for ldr, but we don't want to flip it for hdr so we set it to true.
    if (settings.backgroundTexture.userData.mimeType === "image/vnd.radiance") {
      settings.backgroundTexture.flipY = true;
    }
    scene.background = settings.backgroundTexture;
  } else {
    scene.background = new THREE.Color(settings.backgroundColor);
  }
  if (settings.envMapTexture) {
    // if (this.prevEnvMapTextureUUID !== settings.envMapTexture.uuid) {
    // this.prevEnvMapTextureUUID = settings.envMapTexture.uuid;
    // TODO PMREMGenerator should be fixed to not assume this
    settings.envMapTexture.flipY = true;
    // Assume texture is always an equirect for now
    settings.envMapTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = settings.envMapTexture;
    // }
    // } else if (settings.skybox) {
    //   if (this.prevEnvMapTextureUUID !== settings.skybox.uuid) {
    //     this.prevEnvMapTextureUUID = settings.skybox.uuid;
    //     this.scene.environment = settings.skybox.sky.generateEnvironmentMap(this.renderer);
    //   }
  } else {
    scene.environment = null;
    // this.prevEnvMapTextureUUID = null;
  }

  if (materialsNeedUpdate) {
    updateMaterials(scene);
  }
}
