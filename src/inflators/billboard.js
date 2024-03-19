import { addComponent } from "./utils";

export function inflateBillboard(node, componentProps, otherComponents) {
  addComponent(node, "billboard", componentProps);
}
