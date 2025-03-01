import { absoluteURLForAsset, createEntityAndReparent } from "./utils";

export function inflateMediaVideo(node, componentProps, otherComponents) {
  componentProps.src = absoluteURLForAsset(componentProps.src);
  const el = createEntityAndReparent(node);
  el.classList.add("mediavideo");
  el.classList.add(node.name); // to view it in the editor

  // Set networked component first, media-video is getting the networkId from networked component
  el.setAttribute("networked", {
    template: "#media-template",
    attachTemplateToLocal: false,
    networkId: otherComponents.networked.id,
    persistent: true,
    owner: "scene",
  });
  el.setAttribute("media-video", componentProps);

  return el;
}
