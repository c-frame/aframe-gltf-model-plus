AFRAME.registerComponent("reflection-probe", {
  schema: {
    size: { default: 1 },
    envMapTexture: { type: "map" },
  },

  init: function () {
    this.el.object3D.updateWorldMatrix(true, false);

    const box = new THREE.Box3()
      .setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3().setScalar(this.data.size * 2))
      .applyMatrix4(this.el.object3D.matrixWorld);

    this.el.setObject3D("probe", new THREE.ReflectionProbe(box, this.data.envMapTexture));

    // if (this.el.sceneEl.systems["hubs-systems"].environmentSystem.debugMode) {
    //   const debugBox = new THREE.Box3().setFromCenterAndSize(
    //     new THREE.Vector3(),
    //     new THREE.Vector3().setScalar(this.data.size * 2)
    //   );
    //   this.el.setObject3D(
    //     "helper",
    //     new THREE.Box3Helper(debugBox, new THREE.Color(Math.random(), Math.random(), Math.random()))
    //   );
    // }
  },
});
