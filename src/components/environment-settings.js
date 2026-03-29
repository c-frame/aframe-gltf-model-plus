/* global AFRAME, THREE */
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { gltfInflators } from "../inflators";
import { absoluteURLForAsset } from "../inflators/utils";
import { defaultEnvironmentSettings } from "../inflators/environment-settings";

const HDR_FILE_RE = /\.hdr$/;

async function loadTexture(src) {
  const url = absoluteURLForAsset(src);
  const isHDR = HDR_FILE_RE.test(url);
  const loader = isHDR ? new HDRLoader().setDataType(THREE.HalfFloatType) : new THREE.TextureLoader();
  loader.setWithCredentials(false);
  const texture = await new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
  if (texture.minFilter === THREE.NearestMipmapNearestFilter || texture.minFilter === THREE.NearestMipmapLinearFilter) {
    texture.minFilter = THREE.NearestFilter;
  } else if (
    texture.minFilter === THREE.LinearMipmapNearestFilter ||
    texture.minFilter === THREE.LinearMipmapLinearFilter
  ) {
    texture.minFilter = THREE.LinearFilter;
  }
  if (!isHDR) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  return texture;
}

// same defaults as the defaultEnvironmentSettings function
AFRAME.registerComponent("environment-settings", {
  schema: {
    toneMapping: {
      type: "string",
      default: "LUTToneMapping",
      oneOf: [
        "NoToneMapping",
        "LinearToneMapping",
        "ReinhardToneMapping",
        "CineonToneMapping",
        "ACESFilmicToneMapping",
        "CustomToneMapping",
        "AgXToneMapping",
        "NeutralToneMapping",
        "LUTToneMapping",
      ],
    },
    toneMappingExposure: {
      type: "number",
      default: 1,
    },
    backgroundTexture: {
      type: "map",
      default: "",
    },
    backgroundColor: {
      type: "color",
      default: "skyblue",
    },
    envMapTexture: {
      type: "map",
      default: "",
    },
  },
  init() {
    this._backgroundTexture = null;
    this._envMapTexture = null;
  },
  update(oldData) {
    const backgroundTextureChanged = this.data.backgroundTexture !== oldData.backgroundTexture;
    const envMapTextureChanged = this.data.envMapTexture !== oldData.envMapTexture;

    if (backgroundTextureChanged) {
      if (this._backgroundTexture) {
        this._backgroundTexture.dispose();
        this._backgroundTexture = null;
      }
    }
    if (envMapTextureChanged) {
      if (this._envMapTexture) {
        this._envMapTexture.dispose();
        this._envMapTexture = null;
      }
    }

    const backgroundTexture = this.data.backgroundTexture;
    const envMapTexture = this.data.envMapTexture;

    (async () => {
      const [newBackgroundTexture, newEnvMapTexture] = await Promise.all([
        backgroundTextureChanged && backgroundTexture ? loadTexture(backgroundTexture) : null,
        envMapTextureChanged && envMapTexture ? loadTexture(envMapTexture) : null,
      ]);
      if (!this.data) return;

      let anyStale = false;
      if (backgroundTextureChanged) {
        if (backgroundTexture !== this.data.backgroundTexture) {
          if (newBackgroundTexture) newBackgroundTexture.dispose();
          anyStale = true;
        } else {
          this._backgroundTexture = newBackgroundTexture;
        }
      }
      if (envMapTextureChanged) {
        if (envMapTexture !== this.data.envMapTexture) {
          if (newEnvMapTexture) newEnvMapTexture.dispose();
          anyStale = true;
        } else {
          this._envMapTexture = newEnvMapTexture;
        }
      }
      if (anyStale) return;

      gltfInflators.get("environment-settings")(this.el.sceneEl, {
        toneMapping: this.data.toneMapping,
        toneMappingExposure: this.data.toneMappingExposure,
        backgroundTexture: this._backgroundTexture,
        backgroundColor: this.data.backgroundColor,
        envMapTexture: this._envMapTexture,
      });
    })();
  },
  remove() {
    if (this._backgroundTexture) {
      this._backgroundTexture.dispose();
      this._backgroundTexture = null;
    }
    if (this._envMapTexture) {
      this._envMapTexture.dispose();
      this._envMapTexture = null;
    }
    gltfInflators.get("environment-settings")(this.el.sceneEl, defaultEnvironmentSettings);
  },
});
