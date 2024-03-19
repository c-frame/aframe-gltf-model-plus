export function inflateLink(node, componentProps, otherComponents) {
  const sceneEl = node.el.sceneEl;
  // We need the node closest mesh to be a real entity with class clickable for raycaster to work
  let parent = node;
  while (!parent.isMesh) {
    parent = node.parent;
  }

  const el = document.createElement("a-entity");
  sceneEl.appendChild(el);
  el.setObject3D("mesh", parent);
  el.classList.add(parent.name);
  el.classList.add("clickable");
  el.setAttribute("open-link", componentProps);
  return el;
}
