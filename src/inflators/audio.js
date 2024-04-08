import { absoluteURLForAsset, addComponent } from "./utils";

export function inflateAudio(node, componentProps, otherComponents) {
  const audioParams = otherComponents["audio-params"];

  // Set properties.
  const audioProps = {
    autoplay: componentProps.autoPlay,
    distanceModel: audioParams.distanceModel,
    loop: componentProps.loop,
    maxDistance: audioParams.maxDistance,
    positional: audioParams.audioType !== "stereo",
    refDistance: audioParams.refDistance,
    rolloffFactor: audioParams.rolloffFactor,
    src: absoluteURLForAsset(componentProps.src),
    volume: audioParams.gain,
  };

  addComponent(node, "sound", audioProps);
}
