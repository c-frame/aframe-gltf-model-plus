import { inflateEnvironmentSettings } from "./environment-settings";
import { inflateMediaFrame } from "./media-frame";
import { inflateNavMesh } from "./nav-mesh";
import { inflateReflectionProbe } from "./reflection-probe";
import { inflateUVScroll } from "./uv-scroll";
import { inflateWaypoint } from "./waypoint";

export const gltfInflators = new Map();
gltfInflators.set("environment-settings", inflateEnvironmentSettings);
gltfInflators.set("media-frame", inflateMediaFrame);
gltfInflators.set("nav-mesh", inflateNavMesh);
gltfInflators.set("reflection-probe", inflateReflectionProbe);
gltfInflators.set("uv-scroll", inflateUVScroll);
gltfInflators.set("waypoint", inflateWaypoint);
