import { absoluteURLForAsset, addComponent } from "./utils";

export function inflateAudio(node, componentProps, otherComponents) {
  // In some cases in Hubs GLBs, the audio-params component is not present,
  // and the audio component has the audio parameters directly.
  // In audio-params component, volume is called gain.
  const hasAudioParams = typeof otherComponents["audio-params"] !== "undefined";
  const audioParams = otherComponents["audio-params"] || componentProps;

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
    volume: hasAudioParams ? audioParams.gain : audioParams.volume * 3,
  };

  addComponent(node, "sound", audioProps);
}
