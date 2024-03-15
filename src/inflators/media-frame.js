import { createEntityAndReparent } from "./utils";

export function inflateMediaFrame(node, componentProps, otherComponents) {
  const el = createEntityAndReparent(node);
  el.classList.add("mediaframe");
  el.classList.add(node.name); // to view it in the editor

  // Set networked component first, media-frame is getting the networkId from networked component
  el.setAttribute("networked", {
    template: "#media-template",
    attachTemplateToLocal: false,
    networkId: otherComponents.networked.id,
    persistent: true,
    owner: "scene",
  });
  el.setAttribute("video-texture-target", {});
  el.setAttribute("media-frame", componentProps);

  return el;
}
