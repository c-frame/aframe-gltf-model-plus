import { inflateMediaImage } from "./media-image";
import { inflateMediaVideo } from "./media-video";

// Example in `objects.gltf`:

// ```json
//   {
//     "translation": [
//       -6.264312744140625,
//       -0.7287607192993164,
//       28.872106552124023
//     ],
//     "scale": [
//       5.6425134124436225,
//       5.642513440854807,
//       5.642513439416321
//     ],
//     "rotation": [
//       -0.06519320126696304,
//       0.7125317521233958,
//       0.6954044762629629,
//       0.06679043852278975
//     ],
//     "name": "e6uyuow",
//     "extensions": {
//       "HUBS_components": {
//         "pinnable": {
//           "pinned": true
//         },
//         "media": {
//           "version": 1,
//           "src": "https://uploads-prod.reticulum.io/files/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.jpg?token=536c829011e6cdd6d6cd8a0ff6439f0f",
//           "id": "e6uyuow",
//           "contentSubtype": null
//         }
//       }
//     }
//   }
// ```

const images = ["png", "jpg", "jpeg", "gif", "webp", "avif", "ktx2"];
const videos = ["mp4", "webm"];

export function inflateMedia(node, componentProps, otherComponents) {
  const ext = componentProps.src.split(".").pop().toLowerCase().split("?")[0];
  if (ext === "glb") {
    console.warn("GLB files are not supported yet");
    return null;
    // return inflateMediaGLB(node, componentProps, {networked: {id: componentProps.id}});
  } else if (videos.includes(ext)) {
    return inflateMediaVideo(node, componentProps, { networked: { id: componentProps.id } });
  } else if (images.includes(ext)) {
    return inflateMediaImage(node, componentProps, { networked: { id: componentProps.id } });
  }
  return null;
}
