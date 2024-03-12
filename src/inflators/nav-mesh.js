export function inflateNavMesh(node, componentProps, otherComponents) {
  const sceneEl = node.el.sceneEl;

  const el = document.createElement("a-entity");
  // Very important, add the class before appendChild.
  // The blink-controls component is using the child-attached event and will do a
  // evt.detail.el.matches(data.collisionEntities)) check,
  // so el.matches('.navmesh') before adding the element to collisionEntities array.
  el.classList.add("navmesh");
  el.setAttribute("nav-mesh", "");
  sceneEl.appendChild(el);
  el.setObject3D("mesh", node);
  // Reset simple-navmesh-constraint
  // Temporary until we add child-attached/child-detached support in simple-navmesh-constraint
  // https://github.com/networked-aframe/naf-valid-avatars/issues/28
  const cameraRig = document.querySelector("#rig,#cameraRig");
  if (cameraRig) {
    cameraRig.removeAttribute("simple-navmesh-constraint");
    cameraRig.setAttribute("simple-navmesh-constraint", "navmesh:.navmesh;fall:0.5;height:0;exclude:.navmesh-hole;");
  }
  return el;
}
