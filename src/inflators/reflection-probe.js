/* global THREE */
import { addComponent } from "./utils";

export function inflateReflectionProbe(node, componentProps, otherComponents) {
  if (typeof THREE.ReflectionProbe === "undefined") {
    console.error("You need an aframe build with the ReflectionProbe patch to make reflection probes work.");
    return;
  }
  // TODO PMREMGenerator should be fixed to not assume this
  componentProps.envMapTexture.flipY = true;
  // Assume texture is always an equirect for now
  componentProps.envMapTexture.mapping = THREE.EquirectangularReflectionMapping;
  addComponent(node, "reflection-probe", componentProps);
}
