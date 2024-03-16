// For very old scenes having a spawn-point component
import { createEntityAndReparent } from "./utils";

export function inflateSpawnPoint(node, componentProps, otherComponents) {
  const el = createEntityAndReparent(node);
  el.setAttribute("waypoint", {
    canBeSpawnPoint: true,
  });
  return el;
}
