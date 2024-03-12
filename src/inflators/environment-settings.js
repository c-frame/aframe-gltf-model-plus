/* global THREE */
import { LUTCubeLoader } from "three/addons/loaders/LUTCubeLoader.js";
import blenderLutPath from "../assets/blender-lut.cube";

export const defaultEnvironmentSettings = {
  toneMapping: "LUTToneMapping",
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
  const newToneMapping = THREE[settings.toneMapping];
  if (typeof newToneMapping === "undefined") {
    console.error("You need an aframe build with the tonemappingLUT patch to make LUTToneMapping work.");
    return;
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
    settings.backgroundTexture.flipY = true;
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
