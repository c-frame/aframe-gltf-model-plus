import { createEntityAndReparent } from "./utils";

export function inflateText(node, componentProps, otherComponents) {
  let hasTroika = false;
  if ('troika-text' in AFRAME.components) {
    hasTroika = true;
  } else {
    return;
  }

  const el = createEntityAndReparent(node);

  // Rename the Hubs properties for the baseline settings.
  switch (componentProps.anchorY) {
    case 'middle':
      componentProps.anchorY = 'center';
      break;

    case 'bottom':
    case 'bottom-baseline':
      componentProps.anchorY = 'bottom';
      break;

    case 'top':
    case 'top-baseline':
      componentProps.anchorY = 'top';
      break;
  }

  // Set different property names.
  let textProps = Object.assign({
    align: componentProps.textAlign,
    anchor: componentProps.anchorX,
    baseline: componentProps.anchorY,
  }, componentProps);

  // Remove properties not handled or different in A-Frame troika-text.
  delete textProps.textAlign;
  delete textProps.anchorX;
  delete textProps.anchorY;
  delete textProps.anchorY;
  delete textProps.opacity;
  delete textProps.side;

  el.setAttribute("troika-text", textProps);

  // Set opacity if the value is not »1.0«.
  let opacityProp = '';
  if (componentProps.opacity !== 1.0) {
    opacityProp = "opacity: " + componentProps.opacity + "; transparent: true;";
  }

  if (componentProps.opacity !== 1.0) {
    el.setAttribute("troika-text-material",
      "side: " + componentProps.side + "; " +
      opacityProp);
  }
}
