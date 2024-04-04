import { createEntityAndReparent } from "./utils";

export function inflateWaypoint(node, componentProps, otherComponents) {
  const el = createEntityAndReparent(node);
  el.id = node.name;
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
}
