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

AFRAME.registerSystem("waypoint", {
  schema: {
    hideWaypointsAfterClick: { type: "boolean", default: true },
  },
  init() {
    this.occupyWaypoint = false;
    this.showClickableWaypoints = false;
    this.registeredWaypoints = [];
    this.glbLoading = 0;
    this.pendingEmitWaypointsReady = false;
  },
  scheduleEmitWaypointsReady() {
    if (this.pendingEmitWaypointsReady) return;
    this.pendingEmitWaypointsReady = true;
    console.log("[wp] schedule emitting waypoints-ready in a microtask");
    queueMicrotask(() => {
      if (this.glbLoading > 0) {
        console.log(`[wp] ${this.glbLoading} glb still loading, cancel emitting waypoints-ready`);
        this.pendingEmitWaypointsReady = false;
        return;
      }

      console.log("[wp] emit waypoints-ready");
      this.el.emit("waypoints-ready");
      this.pendingEmitWaypointsReady = false;
    });
  },
  toggleClickableWaypoints() {
    this.showClickableWaypoints = !this.showClickableWaypoints;
    for (const waypoint of this.registeredWaypoints) {
      const waypointComponent = waypoint.components.waypoint;
      if (waypointComponent.mesh) {
        waypointComponent.mesh.material.visible = !waypointComponent.data.isOccupied && this.showClickableWaypoints;
      }
    }
  },
  teleportTo(position, rotation, withTransition = true) {
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
  },
  unoccupyWaypoint() {
    const cameraRig = document.querySelector("#rig,#cameraRig");
    const camera = cameraRig.querySelector("[camera]");

    for (const waypoint of this.registeredWaypoints) {
      if (waypoint.components.waypoint.data.occupiedBy === getClientId()) {
        waypoint.setAttribute("waypoint", { isOccupied: false, occupiedBy: "scene" });
        const waypointComponent = waypoint.components.waypoint;
        if (waypointComponent.mesh) {
          waypointComponent.mesh.material.visible = !waypointComponent.data.isOccupied && this.showClickableWaypoints;
        }
        // In case of reconnect, someone else may have the actual ownership
        // of my seat, so be sure to take ownership.
        if (waypoint.components.networked && NAF.connection.adapter) NAF.utils.takeOwnership(waypoint);
      }
    }

    this.occupyWaypoint = false;
    cameraRig.setAttribute("player-info", "avatarPose", "stand");
    camera.object3D.position.y = 1.6;
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
      if (this.el.object3D.visible) {
        this.el.classList.add("clickable");
      }
      let rootNode = this.el.object3D.getObjectByName("RootNode");
      if (!rootNode.material && rootNode.children.length > 0) {
        rootNode = rootNode.children[0];
      }
      if (rootNode && rootNode.material) {
        this.mesh = rootNode;
        if (!this.originalColor) {
          this.originalColor = this.mesh.material.color.clone();
        }
        this.mesh.material.visible = !this.data.isOccupied && this.system.showClickableWaypoints;
        this.mesh.material.side = THREE.FrontSide;
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
        this.mesh.material.visible = !this.data.isOccupied && this.system.showClickableWaypoints;
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
      if (this.system.data.hideWaypointsAfterClick && this.system.showClickableWaypoints) {
        this.system.toggleClickableWaypoints();
      }
      // const withTransition = evt.detail?.withTransition ?? true;
      // Force withTransition=false for now, using cursorTeleport.teleportTo(position, quaternion) emits the navigation-start event
      // that triggers unoccupyWaypoint because of the listener in player-info.
      const withTransition = false;
      this.system.unoccupyWaypoint();
      const cameraRig = document.querySelector("#rig,#cameraRig");
      const camera = cameraRig.querySelector("[camera]");

      // There is a check for occupyWaypoint in the player-info component for the moved event
      // to call this.el.sceneEl.systems.waypoint.unoccupyWaypoint()
      // We set isOccupied here even for waypoint canBeClicked && !canBeOccupied on purpose to not show the figure if we're on it
      this.system.occupyWaypoint = true;
      this.el.setAttribute("waypoint", { isOccupied: true, occupiedBy: getClientId() });
      if (this.el.components.networked && NAF.connection.adapter) NAF.utils.takeOwnership(this.el);

      const spawnPoint = this.el;
      const avatarPose = this.data.canBeOccupied && this.data.willDisableMotion ? "sit" : "stand";
      cameraRig.setAttribute("player-info", "avatarPose", avatarPose);

      const position = new THREE.Vector3();
      spawnPoint.object3D.getWorldPosition(position);
      const playerInfo = cameraRig.components["player-info"];
      const avatarSitOffset = playerInfo.avatarSitOffset ?? 0.45;
      if (avatarPose === "sit") {
        position.y -= avatarSitOffset;
        camera.object3D.position.y = 1.15;
      }

      const quaternion = new THREE.Quaternion();
      spawnPoint.object3D.getWorldQuaternion(quaternion);
      const euler = new THREE.Euler().setFromQuaternion(quaternion, "YXZ");
      const rotation = { x: 0, y: euler.y * THREE.MathUtils.RAD2DEG + 180, z: 0 };
      this.system.teleportTo(position, rotation, withTransition);
      cameraRig.setAttribute("player-info", { seatRotation: camera.object3D.rotation.y });
    },
  },
  registerWaypoint() {
    // be sure to not add it twice
    const idx = this.system.registeredWaypoints.indexOf(this.el);
    if (idx === -1) {
      this.system.registeredWaypoints.push(this.el);
      console.log("[wp] register waypoint");
      this.system.scheduleEmitWaypointsReady();
    }
  },
  unregisterWaypoint() {
    // it may already be removed, so be careful indexOf is not -1 otherwise it will remove the last item of the array
    const idx = this.system.registeredWaypoints.indexOf(this.el);
    if (idx > -1) {
      this.system.registeredWaypoints.splice(idx, 1);
    }
  },
  init() {
    this.registerWaypoint();
    if (this.data.canBeClicked) {
      if (this.data.willDisableMotion) {
        this.el.setAttribute("gltf-model", new URL("../assets/models/waypoint_sit.glb", import.meta.url).href);
      } else {
        this.el.setAttribute("gltf-model", new URL("../assets/models/waypoint_stand.glb", import.meta.url).href);
      }
    }
    if (!this.data.canBeOccupied && this.el.hasAttribute("networked")) {
      // waypoint created from a-waypoint primitive
      this.el.removeAttribute("networked");
    }
  },
  remove() {
    this.unregisterWaypoint();
  },
  update(oldData) {
    // this.data.isOccupied is false if some other participant set it to
    // false in ownership-gained and sent me back the change when I'm reconnected
    if (!this.data.isOccupied && this.data.occupiedBy === getClientId()) {
      // take back my seat if I didn't choose another seat while I was reconnecting
      const currentlyOnAnotherSeat = this.el.sceneEl.systems.waypoint.registeredWaypoints.find((waypoint) => {
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

AFRAME.registerComponent("move-to-spawn-point", {
  init() {
    this.move = this.move.bind(this);
    this.locationHashChanged = this.locationHashChanged.bind(this);
  },

  locationHashChanged() {
    const hash = window.location.hash;
    if (hash !== "") {
      const waypoint = document.querySelector(hash);
      if (waypoint) {
        waypoint.emit("click", { withTransition: false });
        return true;
      }
    }
    return false;
  },

  play() {
    this.el.sceneEl.addEventListener("waypoints-ready", this.move);
    window.addEventListener("hashchange", this.locationHashChanged);
  },

  pause() {
    this.el.sceneEl.removeEventListener("waypoints-ready", this.move);
    window.removeEventListener("hashchange", this.locationHashChanged);
  },

  move() {
    // If the url has a hash and the hash is a waypoint then spawn at that waypoint.
    if (this.locationHashChanged()) {
      return;
    }

    // Else spawn at the first defined spawn point or the center.
    const waypointSystem = this.el.sceneEl.systems.waypoint;
    const spawnPoints = waypointSystem.registeredWaypoints.filter(
      (waypoint) => waypoint.components.waypoint.data.canBeSpawnPoint
    );
    const firstSpawnPoint = spawnPoints.length > 0 ? spawnPoints[0] : null;

    if (firstSpawnPoint) {
      firstSpawnPoint.emit("click", { withTransition: false }); // even if waypoint is not canBeClickable, this is to share the logic
    } else {
      const cameraRig = document.querySelector("#rig,#cameraRig");
      const camera = cameraRig.querySelector("[camera]");
      waypointSystem.teleportTo({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, false);
      cameraRig.setAttribute("player-info", "avatarPose", "stand");
      camera.object3D.position.y = 1.6;
    }
  },
});

AFRAME.registerComponent("move-to-unoccupied-waypoint", {
  schema: {
    on: { type: "string", default: "click" },
    delay: { type: "number", default: 0 },
    filterRegExp: { type: "string", default: "" },
  },
  init() {
    this.move = this.move.bind(this);
    this.listenerTrigger = this.listenerTrigger.bind(this);
    this.listenerWaypointsReady = this.listenerWaypointsReady.bind(this);
    this.waypointsReady = false;
    this.triggered = false;
  },

  play() {
    this.el.sceneEl.addEventListener("waypoints-ready", this.listenerWaypointsReady);
    if (this.data.on === "connected") {
      document.body.addEventListener("connected", this.listenerTrigger);
    } else {
      this.el.addEventListener(this.data.on, this.listenerTrigger);
    }
  },

  pause() {
    this.el.sceneEl.removeEventListener("waypoints-ready", this.listenerWaypointsReady);
    if (this.data.on === "connected") {
      document.body.removeEventListener("connected", this.listenerTrigger);
    } else {
      this.el.removeEventListener(this.data.on, this.listenerTrigger);
    }
  },

  listenerTrigger() {
    this.triggered = true;
    // If the component is used with the connected event and the url includes a hash to spawn on a specific waypoint, then don't move.
    if (this.data.on === "connected" && window.location.hash !== "") return;
    if (this.triggered && this.waypointsReady) {
      setTimeout(this.move, this.data.delay * 1000);
    }
  },

  listenerWaypointsReady() {
    this.waypointsReady = true;
    if (this.triggered && this.waypointsReady) {
      if (this.data.delay === 0) {
        this.move();
      } else {
        setTimeout(this.move, this.data.delay * 1000);
      }
    }
  },

  move() {
    const waypointSystem = this.el.sceneEl.systems.waypoint;
    const filterRegExp = this.data.filterRegExp ? new RegExp(this.data.filterRegExp) : null;
    const waypoints = waypointSystem.registeredWaypoints.filter((waypoint) => {
      let include = waypoint.components.waypoint.data.canBeOccupied && !waypoint.components.waypoint.data.isOccupied;
      if (filterRegExp && !waypoint.id.match(filterRegExp)) {
        include = false;
      }
      return include;
    });
    const firstUnoccupiedWaypoint = waypoints.length > 0 ? waypoints[0] : null;

    if (firstUnoccupiedWaypoint) {
      firstUnoccupiedWaypoint.emit("click", { withTransition: false });
    }
  },
});

AFRAME.registerPrimitive("a-waypoint", {
  defaultComponents: {
    networked: { template: "#waypoint-template", attachTemplateToLocal: false, persistent: true, owner: "scene" },
    waypoint: {},
    // We should really add networked component only if waypoint.canBeOccupied but I don't see how to do it from the primitive
    // so we remove networked component in waypoint init if canBeOccupied.
    // The order networked then waypoint in defaultComponents is important here for it to work.
  },

  mappings: {
    id: "networked.networkId",
    "can-be-clicked": "waypoint.canBeClicked",
    "can-be-occupied": "waypoint.canBeOccupied",
    "can-be-spawn-point": "waypoint.canBeSpawnPoint",
    "snap-to-nav-mesh": "waypoint.snapToNavMesh",
    "will-disable-motion": "waypoint.willDisableMotion",
    "will-disable-teleporting": "waypoint.willDisableTeleporting",
    "will-maintain-initial-orientation": "waypoint.willMaintainInitialOrientation",
  },
});
