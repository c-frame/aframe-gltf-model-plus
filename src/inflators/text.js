/* global AFRAME */
import { createEntityAndReparent } from "./utils";

export function inflateText(node, componentProps, otherComponents) {
  const componentName = "troika-text";
  if (!AFRAME.components[componentName]) {
    console.error(`Component ${componentName} not registered`);
    return;
  }

  const el = createEntityAndReparent(node);
  el.classList.add(node.name);

  // Rename the Hubs properties for the baseline settings.
  switch (componentProps.anchorY) {
    case "middle":
      componentProps.anchorY = "center";
      break;

    case "bottom":
    case "bottom-baseline":
      componentProps.anchorY = "bottom";
      break;

    case "top":
    case "top-baseline":
      componentProps.anchorY = "top";
      break;
  }

  // Set different property names.
  const textProps = {
    align: componentProps.textAlign,
    anchor: componentProps.anchorX,
    baseline: componentProps.anchorY,
    ...componentProps,
  };

  // Remove properties not handled or different in A-Frame troika-text.
  delete textProps.textAlign;
  delete textProps.anchorX;
  delete textProps.anchorY;
  delete textProps.anchorY;
  delete textProps.opacity;
  delete textProps.side;

  el.setAttribute("troika-text", textProps);

  // Set opacity if the value is not "1.0".
  // The "troika-text-material" setAttribute only works
  // when the attribute is a string. The object creates an error.
  let opacityProp = "";
  if (componentProps.opacity !== 1.0) {
    opacityProp = "opacity: " + componentProps.opacity + "; transparent: true;";
  }

  el.setAttribute("troika-text-material", "side: " + componentProps.side + "; " + opacityProp);

  // This code throws an error.
  // const materialProps = {side: componentProps.side};
  // if (componentProps.opacity !== 1.0) {
  //   materialProps.opacity = componentProps.opacity
  //   materialProps.transparent = true
  // }

  // el.setAttribute("troika-text-material", materialProps);
  // el.setAttribute("material", materialProps);

  return el;
}
