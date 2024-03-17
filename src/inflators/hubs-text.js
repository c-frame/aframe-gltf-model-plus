import { createEntityAndReparent } from "./utils";

export function inflateText(node, componentProps, otherComponents) {
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
  let troikaProps = Object.assign({
    align: componentProps.textAlign,
    anchor: componentProps.anchorX,
    baseline: componentProps.anchorY,
  }, componentProps);

  // Remove properties not handled or different in the A-Frame troika-text.
  delete troikaProps.textAlign;
  delete troikaProps.anchorX;
  delete troikaProps.anchorY;
  delete troikaProps.anchorY;
  delete troikaProps.opacity;
  delete troikaProps.side;

  el.setAttribute("troika-text", troikaProps);

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
