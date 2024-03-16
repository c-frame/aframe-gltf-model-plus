export function inflateSimpleWater(node, componentProps, otherComponents) {
  const sceneEl = node.el.sceneEl;
  const el = document.createElement("a-entity");
  el.classList.add(node.name); // to view it in the editor
  el.setAttribute("simple-water", componentProps);
  el.object3D.position.copy(node.position);
  el.object3D.quaternion.copy(node.quaternion);
  el.object3D.scale.copy(node.scale);
  sceneEl.appendChild(el);
  if (node.isMesh) {
    node.geometry.dispose();
    node.material.dispose();
  }
  node.removeFromParent();
  return el;
}
