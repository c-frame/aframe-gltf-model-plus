import "./components/environment-settings";
import "./components/gltf-model-plus";
import "./components/media-frame";
import "./components/reflection-probe";
import "./components/simple-water";
import "./components/uv-scroll";
import "./components/waypoint";
import "./inflators";
// Calculate the base URL based on the script's src attribute
const baseUrl = new URL(document.currentScript.src).href.replace(/gltf-model-plus.min.js$/, "");
// Set the webpack public path to load assets from the correct location
__webpack_public_path__ = `${baseUrl}dist/`;
