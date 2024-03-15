/* global AFRAME, THREE, NAF */
function addWaypointTemplate() {
  const templateOuter = document.createElement("template");
  const templateInner = document.createElement("a-entity");
  templateOuter.id = `waypoint-template`;
  templateOuter.appendChild(templateInner);
  const refTemplateId = `#${templateOuter.id}`;
  NAF.schemas.schemaDict[refTemplateId] = {
    template: refTemplateId,
    components: [
      {
        component: "waypoint",
        property: "isOccupied",
      },
      {
        component: "waypoint",
        property: "occupiedBy",
      },
    ],
  };
  NAF.schemas.templateCache[refTemplateId] = templateOuter;
}

addWaypointTemplate();

export const teleportTo = (position, rotation, withTransition = true) => {
  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(new THREE.Euler(0, THREE.MathUtils.degToRad(rotation.y), 0));
  const cameraRig = document.querySelector("#rig,#cameraRig");
  const camera = cameraRig.querySelector("[camera]");
  const cursorTeleport = cameraRig?.components["cursor-teleport"];
  withTransition = withTransition && !cameraRig.sceneEl.is("vr-mode");
  if (withTransition && cursorTeleport) {
    cursorTeleport.teleportTo(position, quaternion);
  } else {
    if (cameraRig.hasAttribute("simple-navmesh-constraint")) {
      cameraRig.setAttribute("simple-navmesh-constraint", "enabled", false);
    }
    const camForRotation = camera.object3D;
    const destQuaternion = new THREE.Quaternion();
    destQuaternion.setFromEuler(new THREE.Euler(0, camForRotation.rotation.y, 0));
    destQuaternion.invert();
    destQuaternion.multiply(quaternion);
    cameraRig.object3D.position.copy(position);
    cameraRig.object3D.quaternion.copy(destQuaternion);
    if (cameraRig.hasAttribute("simple-navmesh-constraint")) {
      cameraRig.setAttribute("simple-navmesh-constraint", "enabled", true);
    }
  }

  if (camera) {
    camera.components["look-controls"].pitchObject.rotation.x = THREE.MathUtils.DEG2RAD * rotation.x;
  }
};

function genClientId() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0]);
}

const clientId = genClientId();

function getClientId() {
  // this.el.setAttribute("waypoint", { isOccupied: true, occupiedBy: NAF.clientId });
  // with NAF.clientId empty string didn't set empty string but kept "scene", we use here clientId that is not empty even if not connected
  // so the unoccupyWaypoint function works correctly when not connected.
  return NAF.clientId || clientId;
}

export const registeredWaypoints = [];

AFRAME.registerSystem("waypoint", {
  init() {
    this.occupyWaypoint = false;
  },
  unoccupyWaypoint() {
    registeredWaypoints.forEach((waypoint) => {
      if (waypoint.components.networked && waypoint.components.waypoint.data.occupiedBy === getClientId()) {
        waypoint.setAttribute("waypoint", { isOccupied: false, occupiedBy: "scene" });
        // In case of reconnect, someone else may have the actual ownership
        // of my seat, so be sure to take ownership.
        if (NAF.connection.adapter) NAF.utils.takeOwnership(waypoint);
      }
    });

    const cameraRig = document.querySelector("#rig,#cameraRig");
    this.occupyWaypoint = false;
    cameraRig.setAttribute("player-info", "avatarPose", "stand");
  },
});

AFRAME.registerComponent("waypoint", {
  schema: {
    canBeClicked: { type: "bool", default: false },
    canBeOccupied: { type: "bool", default: false },
    canBeSpawnPoint: { type: "bool", default: false },
    snapToNavMesh: { type: "bool", default: false },
    willDisableMotion: { type: "bool", default: false },
    willDisableTeleporting: { type: "bool", default: false },
    willMaintainInitialOrientation: { type: "bool", default: false },
    isOccupied: { type: "bool", default: false },
    occupiedBy: { type: "string", default: "scene" },
  },
  events: {
    "model-loaded": function (evt) {
      this.registerWaypoint();
      this.el.classList.add("clickable");
      let rootNode = this.el.object3D.getObjectByName("RootNode");
      if (!rootNode.material && rootNode.children.length > 0) {
        rootNode = rootNode.children[0];
      }
      if (rootNode && rootNode.material) {
        this.mesh = rootNode;
        if (!this.originalColor) {
          this.originalColor = this.mesh.material.color.clone();
        }
        this.mesh.material.visible = false;
      }
    },
    mouseenter: function (evt) {
      if (this.mesh && !this.data.isOccupied) {
        this.mesh.material.color.set("#0284c7");
        this.mesh.material.visible = true;
      }
    },
    mouseleave: function (evt) {
      if (this.mesh) {
        this.mesh.material.color.set(this.originalColor);
        this.mesh.material.visible = false;
      }
    },
    "ownership-gained": function (evt) {
      // We can gain the ownership automatically when previous owner of the
      // persistent entity disconnect. Every participant gains the ownership, so
      // there is a race condition to set isOccupied:false here.
      if (
        !this.el.sceneEl.is("naf:reconnecting") &&
        this.data.isOccupied &&
        NAF.connection.activeDataChannels[this.data.occupiedBy] === false
      ) {
        setTimeout(() => {
          if (NAF.utils.isMine(this.el)) {
            // reconnected user may have taken back ownership after the 2s so do nothing in this case
            this.el.setAttribute("waypoint", { isOccupied: false });
            // don't set occupiedBy:scene, the disconnected user will have a chance to occupy it again
          }
        }, 2000);
      }
    },
    click: function (evt) {
      this.system.unoccupyWaypoint();
      const cameraRig = document.querySelector("#rig,#cameraRig");
      const camera = cameraRig.querySelector("[camera]");

      // There is a check for occupyWaypoint in the player-info component for the moved event
      // to call this.el.sceneEl.systems.waypoint.unoccupyWaypoint()
      this.system.occupyWaypoint = true;
      if (this.el.components.networked) {
        this.el.setAttribute("waypoint", { isOccupied: true, occupiedBy: getClientId() });
        if (NAF.connection.adapter) NAF.utils.takeOwnership(this.el);
      }

      const spawnPoint = this.el;
      const avatarPose = this.data.canBeOccupied && this.data.willDisableMotion ? "sit" : "stand";
      cameraRig.setAttribute("player-info", "avatarPose", avatarPose);

      const position = new THREE.Vector3();
      position.copy(spawnPoint.object3D.position);
      const playerInfo = cameraRig.components["player-info"];
      const avatarSitOffset = playerInfo.avatarSitOffset ?? 0.45;
      if (playerInfo.data.avatarPose === "sit") {
        position.y -= avatarSitOffset;
      }

      const euler = new THREE.Euler().setFromQuaternion(spawnPoint.object3D.quaternion, "YXZ");
      const rotation = { x: 0, y: euler.y * THREE.MathUtils.RAD2DEG + 180, z: 0 };
      teleportTo(position, rotation, false);
      cameraRig.setAttribute("player-info", { seatRotation: camera.object3D.rotation.y });
    },
  },
  registerWaypoint() {
    // be sure to not add it twice
    const idx = registeredWaypoints.indexOf(this.el);
    if (idx === -1) {
      registeredWaypoints.push(this.el);
    }
  },
  unregisterWaypoint() {
    // it may already be removed, so be careful indexOf is not -1 otherwise it will remove the last item of the array
    const idx = registeredWaypoints.indexOf(this.el);
    if (idx > -1) {
      registeredWaypoints.splice(idx, 1);
    }
  },
  init() {
    if (!this.data.canBeClicked) {
      this.registerWaypoint();
      // so we have it in the registeredWaypoints array, and it won't be raycastable because we don't have a mesh
    }
    // if canBeClicked, then we added a gltf-model component and it will be registered in model-loaded
  },
  remove() {
    this.unregisterWaypoint();
  },
  update(oldData) {
    // this.data.isOccupied is false if some other participant set it to
    // false in ownership-gained and sent me back the change when I'm reconnected
    if (!this.data.isOccupied && this.data.occupiedBy === getClientId()) {
      // take back my seat if I didn't choose another seat while I was reconnecting
      const currentlyOnAnotherSeat = registeredWaypoints.find((waypoint) => {
        return (
          this.el !== waypoint &&
          waypoint.components.networked &&
          waypoint.components.waypoint.data.occupiedBy === getClientId()
        );
      });
      if (currentlyOnAnotherSeat) {
        this.el.setAttribute("waypoint", { isOccupied: false, occupiedBy: "scene" });
      } else {
        this.el.setAttribute("waypoint", { isOccupied: true });
      }
      if (NAF.connection.adapter) NAF.utils.takeOwnership(this.el);
    }

    if (this.data.canBeClicked && oldData.isOccupied !== this.data.isOccupied) {
      if (this.data.isOccupied) {
        this.el.object3D.visible = false;
        this.el.classList.remove("clickable");
      } else {
        this.el.object3D.visible = true;
        this.el.classList.add("clickable");
      }
    }
  },
});
