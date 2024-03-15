/* global AFRAME, NAF, THREE */
AFRAME.registerComponent("video-texture-target", {
  schema: {
    src: { default: "" }, // naf://clients/${NAF.clientId}/${streamName}
    // with streamName equals to "video" for janus adapter, "video" or "screen" for easyrtc adapter
    fakeAlphaEnabled: { default: false },
  },

  dependencies: ["material"],

  init() {
    this.videoTexture = null;
    this.video = null;
    this.stream = null;

    this._setMediaStream = this._setMediaStream.bind(this);
    this.startVideoSharing = this.startVideoSharing.bind(this);
    this.stopVideoSharing = this.stopVideoSharing.bind(this);
    this.maybeStopVideoSharing = this.maybeStopVideoSharing.bind(this);
  },

  _setMediaStream(newStream) {
    if (!this.mesh) {
      const fakeAlphaEnabled = this.data.fakeAlphaEnabled;
      const material = new THREE.ShaderMaterial({
        uniforms: { map: { type: "t", value: null } },
        defines: {
          FAKE_ALPHA_ENABLED: fakeAlphaEnabled ? 1 : 0,
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
        fragmentShader: /* glsl */ `
            varying vec2 vUv;
            uniform sampler2D map;
            void main() {
              vec4 diffuseColor = texture2D(map, vUv);
              gl_FragColor = vec4(diffuseColor.rgb, 1.0);
              #if FAKE_ALPHA_ENABLED == 1
              if (diffuseColor.g - diffuseColor.r > 0.15) {
                gl_FragColor.a = 0.0;
              }
              #endif
            }
          `,
      });
      if (fakeAlphaEnabled) {
        material.transparent = true;
      }

      let width = 1;
      let height = 1;
      const planeGeometry = this.el.getObject3D("mesh")?.geometry;
      if (planeGeometry) {
        width = planeGeometry.parameters.width;
        height = planeGeometry.parameters.height;
      } else {
        const mediaFrame = this.el.getAttribute("media-frame");
        if (mediaFrame) {
          width = mediaFrame.bounds.x;
          height = mediaFrame.bounds.y;
        }
      }

      const size = Math.max(width, height);
      const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
      material.side = THREE.DoubleSide;
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.visible = false;
      this.el.setObject3D("screen", this.mesh);
    }

    if (!this.video) {
      this.setupVideo();
    }

    if (newStream !== this.stream) {
      if (this.stream) {
        this._clearMediaStream();
      }

      if (newStream) {
        this.video.srcObject = newStream;

        const playResult = this.video.play();
        if (playResult instanceof Promise) {
          playResult.catch((e) => NAF.log.error(`Error play video stream`, e));
        }

        this.videoTexture = new THREE.VideoTexture(this.video);

        const previousMesh = this.el.getObject3D("mesh");
        if (previousMesh) {
          previousMesh.visible = false;
        }
        // this.mesh.visible = true; // set in scaleToAspectRatio
        this.mesh.material.uniforms.map.value = this.videoTexture;
        this.mesh.material.needsUpdate = true;
      }

      this.stream = newStream;
    }
  },

  _clearMediaStream() {
    this.stream = null;

    if (this.videoTexture) {
      if (this.videoTexture.image instanceof HTMLVideoElement) {
        // Note: this.videoTexture.image === this.video
        const video = this.videoTexture.image;
        video.pause();
        video.srcObject = null;
        video.load();
        this.el.sceneEl.emit("video-removed", { video: this.video, el: this.el });
      }

      this.videoTexture.dispose();
      this.videoTexture = null;
      const previousMesh = this.el.getObject3D("mesh");
      if (previousMesh) {
        previousMesh.visible = true;
      }
      if (this.mesh) {
        this.mesh.visible = false;
        this.mesh.material.map = null;
        this.mesh.material.needsUpdate = true;
        this.mesh.scale.set(1, 1, 1);
        this.mesh.matrixNeedsUpdate = true;
      }
    }
  },

  async update(oldData) {
    const src = this.data.src;
    if (src.startsWith("naf://")) {
      if (src !== oldData.src) {
        if (this.isVideoSharing) {
          const streamClientId = src.substring(6).split("/")[1];
          // If I was screensharing and I reconnect, this.isVideoSharing is true,
          // oldData.src=="" because the other participants reset it and src is
          // my current screenshare. Don't end the screen share in this case,
          // and we will recreate the video texture in maybeStopVideoSharing because of the clientDisconnected event sent emitted for ourself
          if (streamClientId !== NAF.clientId) {
            // Somebody used the same element than us, stop our screen share.
            this._clearMediaStream();
            this.el.sceneEl.emit("action_end_video_sharing");
          }
        } else {
          this._clearMediaStream();
        }
      }

      // /clients/<clientId>/<streamName>
      const parts = src.substring(6).split("/");
      const streamClientId = parts[1];
      const streamName = parts[2];

      const stream = await NAF.connection.adapter.getMediaStream(streamClientId, streamName);

      const mediaStream = stream;
      this._setMediaStream(mediaStream);

      // scale plane geometry to aspect ratio when video is ready
      const isReady = () => {
        const texture = this.videoTexture;
        if (!texture) return false;
        return (texture.image.videoHeight || texture.image.height) && (texture.image.videoWidth || texture.image.width);
      };
      const setupInterval = setInterval(() => {
        // Stop retrying if the src changed.
        const isNoLongerSrc = this.data.src !== src;
        if (isReady() || isNoLongerSrc) {
          clearInterval(setupInterval);
          if (!isNoLongerSrc) {
            const texture = this.videoTexture;
            const ratio =
              (texture.image.videoHeight || texture.image.height) / (texture.image.videoWidth || texture.image.width);
            this.scaleToAspectRatio(ratio);
            this.el.sceneEl.emit("video-added", { video: this.video, el: this.el, clientId: streamClientId });
          }
        }
      }, 500);
    } else {
      // src was reset to "", someone stopped their screen share
      if (!src && oldData.src) this._clearMediaStream();
    }
  },

  remove() {
    this._clearMediaStream();
    if (this.mesh) {
      this.mesh.material.dispose();
      this.mesh.geometry.dispose();
      this.mesh = null;
      this.el.removeObject3D("screen");
    }
    if (this.video) {
      this.video.remove();
      this.video = null;
    }
  },

  scaleToAspectRatio(ratio) {
    const width = Math.min(1.0, 1.0 / ratio);
    const height = Math.min(1.0, ratio);
    if (this.mesh) {
      this.mesh.scale.set(width, height, 1);
      this.mesh.matrixNeedsUpdate = true;
      this.mesh.visible = true;
    }
  },

  setupVideo() {
    if (!this.video) {
      const video = document.createElement("video");
      video.setAttribute("autoplay", true);
      video.setAttribute("playsinline", true);
      video.setAttribute("muted", true);
      this.video = video;
    }
  },

  startVideoSharing(evt) {
    this.isVideoSharing = true;
    this.mediaSourceUsed = evt.detail.source;

    NAF.utils
      .getNetworkedEntity(this.el)
      .then((networkedEl) => {
        // take ownership so the change propagates to other users
        if (!NAF.utils.isMine(networkedEl)) {
          NAF.utils.takeOwnership(networkedEl);
        }
      })
      .catch(() => {
        console.error("networkedEl not found");
        // Non-networked
      });
  },

  stopVideoSharing() {
    if (this.isVideoSharing) {
      this.isVideoSharing = false;

      NAF.utils
        .getNetworkedEntity(this.el)
        .then((networkedEl) => {
          if (NAF.utils.isMine(networkedEl)) {
            // if it's not mine, it means I had a network issue, ending the screen share is handled in update in this case
            this.el.setAttribute("video-texture-target", { src: "" });
          }
        })
        .catch(() => {
          console.error("networkedEl not found");
          // Non-networked
        });
    }
  },

  maybeStopVideoSharing(evt) {
    // On clientDisconnected,
    // close the screenshare if the user who is screensharing left the room.
    // This also fix the screenshare freezing (not using the new video media)
    // if the user reconnected automatically from a network failure. When the
    // user reconnect it will set again data.src and get the new video media.
    const currentSrc = this.data.src;
    if (currentSrc.startsWith("naf://")) {
      const streamClientId = currentSrc.substring(7).split("/")[1]; // /clients/<client id>/video for screensharing
      if (!this.el.sceneEl.is("naf:reconnecting") && streamClientId === evt.detail.clientId) {
        this.el.setAttribute("video-texture-target", { src: "" });
      }
      if (this.el.sceneEl.is("naf:reconnecting") && streamClientId === NAF.clientId) {
        setTimeout(() => {
          // All the other participants had reset the screen because they got clientDisconnected(me)
          // Wait 5s to be sure their exchanges are done so I can take back the ownership
          // after reconnect and reset src with my screenshare if still enabled.
          if (this.isVideoSharing) {
            // to trigger again the update, reset first, then put back
            this.el.setAttribute("video-texture-target", { src: "" });
            setTimeout(() => {
              this.el.setAttribute("video-texture-target", { src: currentSrc });
            });
          }
        }, 5000);
      }
    }
  },

  play() {
    this.el.sceneEl.addEventListener("share_video_enabled", this.startVideoSharing);
    this.el.sceneEl.addEventListener("share_video_disabled", this.stopVideoSharing);
    document.body.addEventListener("clientDisconnected", this.maybeStopVideoSharing);
  },

  pause() {
    this.el.sceneEl.removeEventListener("share_video_enabled", this.startVideoSharing);
    this.el.sceneEl.removeEventListener("share_video_disabled", this.stopVideoSharing);
    document.body.removeEventListener("clientDisconnected", this.maybeStopVideoSharing);
  },
});
