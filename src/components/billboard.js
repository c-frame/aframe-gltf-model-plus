/* global AFRAME */
AFRAME.registerComponent("billboard", {
  schema: {
    onlyY: { type: "boolean", default: true },
  },
  init() {
    this.targetPos = new THREE.Vector3();
    this.worldPos = new THREE.Vector3();
  },
  tick() {
    const object3D = this.el.object3D;
    if (!object3D.visible) {
      return;
    }

    const camera = this.el.sceneEl.systems.camera.activeCameraEl.object3D;
    // Set the camera world position as the target.
    this.targetPos.setFromMatrixPosition(camera.matrixWorld);

    if (this.data.onlyY) {
      object3D.getWorldPosition(this.worldPos);
      this.targetPos.y = this.worldPos.y;
    }

    object3D.lookAt(this.targetPos);
  },
});
