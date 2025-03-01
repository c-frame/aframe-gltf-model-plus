/* global AFRAME, THREE */
import errorImageSrc from "../assets/media-error.png";

function scaleToAspectRatio(el, ratio) {
  const width = Math.min(1.0, 1.0 / ratio);
  const height = Math.min(1.0, ratio);
  el.object3DMap.mesh.scale.set(width, height, 1);
  el.object3DMap.mesh.matrixNeedsUpdate = true;
}

let errorTexture;
function getErrorTexture() {
  if (errorTexture) {
    return errorTexture;
  }
  const errorImage = new Image();
  errorImage.src = errorImageSrc;
  errorTexture = new THREE.Texture(errorImage);
  errorImage.onload = () => {
    errorTexture.needsUpdate = true;
  };
  return errorTexture;
}

export const mediaImageComponent = AFRAME.registerComponent("media-image", {
  schema: {
    src: { type: "string" },
    projection: { type: "string", default: "flat", oneOf: ["flat", "360-equirectangular"] },
    alphaMode: { type: "string", default: "" },
    alphaCutoff: { type: "number" },
  },

  update(oldData) {
    const { src, projection } = this.data;
    if (!src) return;

    // A-Frame loadTexture uses ImageLoader and handles a cache of sources for us to avoid loading the same image twice.
    let loadTextureFunction = this.el.sceneEl.systems.material.loadTexture.bind(this.el.sceneEl.systems.material);
    if (src.endsWith("ktx2")) {
      loadTextureFunction = (src, textureProperties = {}, cb) => {
        const ktxLoader = this.el.sceneEl.systems["gltf-model"].getKTX2Loader();
        ktxLoader.load(
          src,
          (texture) => {
            AFRAME.utils.material.setTextureProperties(texture, textureProperties);
            cb(texture);
          },
          undefined,
          function () {
            console.error(`Error loading ${src}`);
            cb(null);
          }
        );
      };
    }

    // Note that the error texture is 1200x1200 so a ratio 1,
    // that's why we don't update the scale below in case the image is not found.
    let ratio = 1;
    this.el.emit("image-loading");

    if (this.mesh && this.mesh.material.map && src !== oldData.src) {
      this.mesh.material.map = null;
      this.mesh.material.needsUpdate = true;
    }

    loadTextureFunction(src, { npot: true }, (texture) => {
      let imageNotFound = false;
      // A-Frame doesn't provide an error callback and return a VideoTexture in case the image is not found...
      if (texture === null || texture.image.tagName === "VIDEO") {
        imageNotFound = true;
        texture = getErrorTexture();
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const material = new THREE.MeshBasicMaterial();
      material.toneMapped = false;

      let geometry;

      if (projection === "360-equirectangular") {
        geometry = new THREE.SphereGeometry(1, 64, 32);
        // invert the geometry on the x-axis so that all of the faces point inward
        geometry.scale(-1, 1, 1);
      } else {
        geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
        material.side = THREE.DoubleSide;
      }

      this.mesh = new THREE.Mesh(geometry, material);
      this.el.setObject3D("mesh", this.mesh);

      if (imageNotFound) {
        this.mesh.material.transparent = true;
      } else {
        // if transparency setting isn't explicitly defined, default to on for all gifs, and basis textures with alpha
        switch (this.data.alphaMode) {
          case "opaque":
            this.mesh.material.transparent = false;
            break;
          case "mask":
            this.mesh.material.transparent = false;
            this.mesh.material.alphaTest = this.data.alphaCutoff;
            break;
          case "blend":
          default:
            this.mesh.material.transparent = true;
            this.mesh.material.alphaTest = 0;
        }
      }

      this.mesh.material.map = texture;
      this.mesh.material.needsUpdate = true;

      if (projection === "flat" && !imageNotFound) {
        ratio = texture.image.height / texture.image.width;
        scaleToAspectRatio(this.el, ratio);
      }

      this.el.emit("image-loaded", { src: this.data.src, projection: projection });
    });
  },

  remove() {
    if (this.mesh) {
      this.mesh.material.map = null;
      this.mesh.material.dispose();
      this.mesh.geometry.dispose();
      this.el.removeObject3D("mesh");
    }
  },
});
