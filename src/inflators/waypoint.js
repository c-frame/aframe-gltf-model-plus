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
      el.setAttribute("gltf-model", "/models/waypoint_sit.glb");
    } else {
      el.setAttribute("gltf-model", "/models/waypoint_stand.glb");
    }
  }

  return el;
}
