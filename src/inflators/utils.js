/* global AFRAME */
import { FakeEntity } from "../components/FakeEntity";

export const addComponent = (node, componentName, data) => {
  if (!AFRAME.components[componentName]) {
    console.error(`Component ${componentName} not registered`);
    return;
  }

  if (!node.fakeEl) {
    node.fakeEl = new FakeEntity(node);
  }
  const componentId = undefined; // supporting only one component of the same type on a FakeEntity
  const component = new AFRAME.components[componentName].Component(node.fakeEl, data, componentId);
  component.play();
  return component;
};

export const createEntityAndReparent = (node, klass = undefined) => {
  const sceneEl = node.el.sceneEl;
  const entity = document.createElement("a-entity");
  if (klass) {
    entity.classList.add(klass);
  }
  sceneEl.appendChild(entity);
  entity.object3D.removeFromParent();
  entity.object3D = node;
  entity.object3D.el = entity;
  // We assume here that node local position/quaternion is the same as world position/quaternion
  sceneEl.object3D.attach(node);
  return entity;
};

export const absoluteURLForAsset =
  window.absoluteURLForAsset ||
  ((asset) => {
    return asset;
  });
