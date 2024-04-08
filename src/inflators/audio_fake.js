import { absoluteURLForAsset, addComponent } from "./utils";
import { FakeEntity } from "../components/FakeEntity";

export function inflateAudio(node, componentProps, otherComponents) {
  node.fakeEl = new FakeEntity(node);
  node.fakeEl.setObject3D("mesh", node);

  const audioParams = otherComponents["audio-params"];

  // Set different property names.q
  const audioProps = {
    autoplay: true,
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

  addComponent(node, "sound", audioProps);
}
