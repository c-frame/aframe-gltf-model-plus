import { addComponent } from "./utils";
import { FakeEntity } from "../components/FakeEntity";

export function inflateUVScroll(node, componentProps, otherComponents) {
  // set the node (plane geometry) as the 'mesh' first
  node.fakeEl = new FakeEntity(node);
  node.fakeEl.setObject3D("mesh", node);
  // then add uv-scroll that uses getObject3D("mesh")
  addComponent(node, "uv-scroll", componentProps);
}
