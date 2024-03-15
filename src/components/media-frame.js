/* global AFRAME, THREE */
function addMediaFrameTemplate() {
  const templateOuter = document.createElement("template");
  const templateInner = document.createElement("a-entity");
  templateOuter.id = `media-template`;
  templateOuter.appendChild(templateInner);
  const refTemplateId = `#${templateOuter.id}`;
  NAF.schemas.schemaDict[refTemplateId] = {
    template: refTemplateId,
    components: ["video-texture-target"],
  };
  NAF.schemas.templateCache[refTemplateId] = templateOuter;
}

addMediaFrameTemplate();

const registeredMediaframes = [];
const mediaFramesById = new Map();

AFRAME.registerSystem("media-frame", {
  getClosestMediaFrame: function (filterByMediaType) {
    let mediaFrames = registeredMediaframes;
    if (filterByMediaType && filterByMediaType !== "all") {
      if (filterByMediaType === "all-2d") {
        mediaFrames = mediaFrames.filter((mediaFrame) => {
          const mediaType = mediaFrame.component.data.mediaType;
          return mediaType !== "model";
        });
      } else {
        if (filterByMediaType === "model") {
          mediaFrames = mediaFrames.filter((mediaFrame) => {
            const mediaType = mediaFrame.component.data.mediaType;
            return mediaType === filterByMediaType || mediaType === "all";
          });
        } else {
          mediaFrames = mediaFrames.filter((mediaFrame) => {
            const mediaType = mediaFrame.component.data.mediaType;
            return mediaType === filterByMediaType || mediaType === "all" || mediaType === "all-2d";
          });
        }
      }
    }
    const cameraRigPosition = document.querySelector("#rig,#cameraRig").object3D.position;
    // Note: assumption that object3D.position is global world coordinate here
    mediaFrames.sort((a, b) => {
      if (a.el.object3D.position.distanceTo(cameraRigPosition) < b.el.object3D.position.distanceTo(cameraRigPosition)) {
        return -1;
      }
      return 1;
    });
    if (mediaFrames.length > 0) {
      return mediaFrames[0];
    }
    return document.getElementById("screenshare"); // TODO remove this hard coded value
  },
  getMediaFrameById(id) {
    const mediaFrame = mediaFramesById.get(id);
    if (!mediaFrame) return document.getElementById("screenshare"); // TODO remove this hard coded value
    return mediaFrame.el;
  },
});

/**
 * Define a location where you can put 2d or 3d elements
 * @component media-frame
 */
export const mediaFrameComponent = AFRAME.registerComponent("media-frame", {
  schema: {
    bounds: { type: "vec3", default: { x: 1, y: 1, z: 1 } },
    mediaType: { type: "string", oneOf: ["all", "all-2d", "model", "image", "video", "pdf"], default: "all-2d" },
    snapToCenter: { type: "boolean", default: true },
  },
  play() {
    const id = this.el.components.networked.data.networkId;
    const instance = { component: this, el: this.el, id };
    this.instance = instance;
    mediaFramesById.set(id, instance);
    registeredMediaframes.push(instance);
  },

  pause() {
    mediaFramesById.delete(this.instance.id);
    registeredMediaframes.splice(registeredMediaframes.indexOf(this.instance), 1);
  },
});
