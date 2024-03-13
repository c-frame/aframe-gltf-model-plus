import { createEntityAndReparent } from "./utils";

export function inflateWaypoint(node, componentProps, otherComponents) {
  const el = createEntityAndReparent(node);

  if (componentProps.canBeOccupied) {
    el.setAttribute("networked", {
      template: "#waypoint-template",
      attachTemplateToLocal: false,
      networkId: otherComponents.networked.id,
      persistent: true,
      owner: "scene",
    });
  }

  el.setAttribute("waypoint", componentProps);

  if (componentProps.canBeClicked && componentProps.canBeOccupied) {
    if (componentProps.willDisableMotion) {
      el.setAttribute("gltf-model", new URL("/models/waypoint_sit.glb", import.meta.url).href);
    } else {
      el.setAttribute("gltf-model", new URL("/models/waypoint_stand.glb", import.meta.url).href);
    }
  }

  return el;
}
