import { absoluteURLForAsset, addComponent } from "./utils";

export function inflateParticleEmitter(node, componentProps, otherComponents) {
  componentProps.src = absoluteURLForAsset(componentProps.src);

  addComponent(node, "particle-emitter", componentProps);
}
