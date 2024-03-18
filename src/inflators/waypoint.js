import { createEntityAndReparent } from "./utils";

export function inflateWaypoint(node, componentProps, otherComponents) {
  const el = createEntityAndReparent(node);
  inflateWaypointFromJSON(el, componentProps, otherComponents);
  return el;
}

export function inflateWaypointFromJSON(el, componentProps, otherComponents) {
  const networkId = otherComponents?.networked?.id ?? el.id ?? "";
  if (componentProps.canBeOccupied) {
    el.setAttribute("networked", {
      template: "#waypoint-template",
      attachTemplateToLocal: false,
      networkId: networkId,
      persistent: true,
      owner: "scene",
    });
  }

  el.setAttribute("waypoint", componentProps);

  if (componentProps.canBeClicked) {
    if (componentProps.willDisableMotion) {
      el.setAttribute("gltf-model", new URL("../assets/models/waypoint_sit.glb", import.meta.url).href);
    } else {
      el.setAttribute("gltf-model", new URL("../assets/models/waypoint_stand.glb", import.meta.url).href);
    }
  }
}
