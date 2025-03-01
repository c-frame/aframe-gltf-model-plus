import { getErrorTexture, scaleToAspectRatio } from "./media-image";

/* global AFRAME, THREE */
export const mediaImageComponent = AFRAME.registerComponent("media-video", {
  schema: {
    src: { type: "string" },
    projection: { type: "string", default: "flat", oneOf: ["flat", "360-equirectangular"] },
    autoPlay: { type: "boolean", default: true },
    controls: { type: "boolean", default: false },
    loop: { type: "boolean", default: true },
  },

  events: {
    click() {
      const videoEl = this.mesh.material.map.source.data;
      if (videoEl.paused) {
        videoEl.play();
      } else {
        videoEl.pause();
      }
    },
  },

  update(oldData) {
    if (this.data.controls) {
      this.el.classList.add("clickable");
    } else {
      this.el.classList.remove("clickable");
    }
    const { src, projection } = this.data;
    if (!src) return;

    // Note that the error texture is 1200x1200 so a ratio 1,
    // that's why we don't update the scale below in case the image is not found.
    let ratio = 1;
    this.el.emit("video-loading");

    if (this.mesh && this.mesh.material.map && src !== oldData.src) {
      this.mesh.material.map.dispose();
      this.mesh.material.map.source.data = null;
      this.mesh.material.map = null;
      this.mesh.material.needsUpdate = true;
    }

    this.el.sceneEl.systems.material.loadTexture(src, { npot: true }, (texture) => {
      const videoEl = texture.source.data;
      videoEl.autoplay = this.data.autoPlay;
      videoEl.loop = this.data.loop;
      videoEl.muted = this.data.autoPlay;
      let playPromise;
      if (this.data.autoPlay) {
        playPromise = videoEl.play();
      }
      let videoNotFound = false;
      // A-Frame doesn't provide an error callback in case the video is not found, currently this check does nothing
      if (texture === null) {
        videoNotFound = true;
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

      if (videoNotFound) {
        this.mesh.material.transparent = true;
      }

      this.mesh.material.map = texture;
      this.mesh.material.needsUpdate = true;

      if (projection === "flat" && !videoNotFound) {
        videoEl.addEventListener(
          "loadedmetadata",
          () => {
            ratio = videoEl.videoHeight / videoEl.videoWidth;
            scaleToAspectRatio(this.el, ratio);
          },
          { once: true }
        );
        if (playPromise !== undefined) {
          playPromise
            .then(() => {})
            .catch(() => {
              // Auto-play was prevented, it shouldn't happen with muted true, probably the video was not found
              texture = getErrorTexture();
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.needsUpdate = true;
              this.mesh.material.transparent = true;
              this.mesh.material.map = texture;
              this.mesh.material.needsUpdate = true;
            });
        }
      }

      this.el.emit("video-loaded", { src: this.data.src, projection: projection });
    });
  },

  remove() {
    if (this.mesh) {
      this.mesh.material.map.dispose();
      this.mesh.material.map.source.data = null;
      this.mesh.material.dispose();
      this.mesh.geometry.dispose();
      this.el.removeObject3D("mesh");
      this.mesh.el = null;
      this.mesh = null;
    }
  },
});
