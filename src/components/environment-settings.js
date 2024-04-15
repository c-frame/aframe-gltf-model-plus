/* global AFRAME, THREE */
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { gltfInflators } from "../inflators";
import { absoluteURLForAsset } from "../inflators/utils";

const HDR_FILE_RE = /\.hdr$/;

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
        "LUTToneMapping",
      ],
    },
    toneMappingExposure: {
      type: "number",
      default: 1,
    },
    backgroundTexture: {
      type: "string",
      default: "",
    },
    backgroundColor: {
      type: "color",
      default: "skyblue",
    },
    envMapTexture: {
      type: "string",
      default: "",
    },
  },
  init() {
    (async () => {
      let backgroundTexture = null;
      if (this.data.backgroundTexture) {
        const backgroundTextureUrl = absoluteURLForAsset(this.data.backgroundTexture);
        const isHDR = HDR_FILE_RE.test(backgroundTextureUrl);
        let loader;
        if (isHDR) {
          loader = new RGBELoader().setDataType(THREE.HalfFloatType);
        } else {
          loader = new THREE.TextureLoader();
        }

        loader.setWithCredentials(false);
        backgroundTexture = await new Promise((resolve, reject) =>
          loader.load(backgroundTextureUrl, resolve, undefined, reject)
        );
        if (
          backgroundTexture.minFilter === THREE.NearestMipmapNearestFilter ||
          backgroundTexture.minFilter === THREE.NearestMipmapLinearFilter
        ) {
          backgroundTexture.minFilter = THREE.NearestFilter;
        } else if (
          backgroundTexture.minFilter === THREE.LinearMipmapNearestFilter ||
          backgroundTexture.minFilter === THREE.LinearMipmapLinearFilter
        ) {
          backgroundTexture.minFilter = THREE.LinearFilter;
        }

        if (!isHDR) {
          backgroundTexture.encoding = THREE.sRGBEncoding;
        }
      }

      let envMapTexture = null;
      if (this.data.envMapTexture) {
        const envMapTextureUrl = absoluteURLForAsset(this.data.envMapTexture);
        const isHDR = HDR_FILE_RE.test(envMapTextureUrl);
        let loader;
        if (isHDR) {
          loader = new RGBELoader().setDataType(THREE.HalfFloatType);
        } else {
          loader = new THREE.TextureLoader();
        }

        loader.setWithCredentials(false);
        envMapTexture = await new Promise((resolve, reject) =>
          loader.load(envMapTextureUrl, resolve, undefined, reject)
        );
        if (
          envMapTexture.minFilter === THREE.NearestMipmapNearestFilter ||
          envMapTexture.minFilter === THREE.NearestMipmapLinearFilter
        ) {
          envMapTexture.minFilter = THREE.NearestFilter;
        } else if (
          envMapTexture.minFilter === THREE.LinearMipmapNearestFilter ||
          envMapTexture.minFilter === THREE.LinearMipmapLinearFilter
        ) {
          envMapTexture.minFilter = THREE.LinearFilter;
        }

        if (!isHDR) {
          envMapTexture.encoding = THREE.sRGBEncoding;
        }
      }

      const settings = {
        toneMapping: this.data.toneMapping,
        toneMappingExposure: this.data.toneMappingExposure,
        backgroundTexture: backgroundTexture,
        backgroundColor: this.data.backgroundColor,
        envMapTexture: envMapTexture,
      };
      gltfInflators.get("environment-settings")(this.el.sceneEl, settings);
    })();
  },
});
