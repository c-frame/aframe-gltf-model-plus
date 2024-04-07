// import { absoluteURLForAsset, createEntityAndReparent } from "./utils";
import { absoluteURLForAsset, addComponent } from "./utils";

export function inflateAudio(node, componentProps, otherComponents) {
  // const componentName = "sound";
  // if (!AFRAME.components[componentName]) {
  //   console.error(`Component ${componentName} not registered`);
  //   return;
  // }

  console.log(node);
  // const el = createEntityAndReparent(node);
  // el.classList.add(node.name);

  const audioParams = otherComponents["audio-params"];

  // Set different property names.q
  const audioProps = {
    autoplay: false,
    distanceModel: audioParams.distanceModel,
    loop: componentProps.loop,
    maxDistance: audioParams.maxDistance,
    positional: audioParams.audioType !== "stereo",
    refDistance: audioParams.refDistance,
    rolloffFactor: audioParams.rolloffFactor,
    src: absoluteURLForAsset(componentProps.src),
    volume: audioParams.gain,
  };

  // if (componentProps.autoPlay) {
  //   el.setAttribute("sound-autoplay", true);
  // }

  // Remove properties not handled or different in A-Frame troika-text.
  // delete audioProps.autoPlay;
  // delete audioProps.controls;

  // el.setAttribute("sound", audioProps);

  const el = addComponent(node, "sound", audioProps);

  return el;
}
