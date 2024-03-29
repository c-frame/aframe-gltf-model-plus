/* global AFRAME, THREE */
// This is a modified copy of
// https://github.com/mozilla/hubs/blob/6c49ce303ad7e030c80b301dbc3ce100cac7d9c1/src/components/uv-scroll.js
// to work with an aframe system and waiting for material to be loaded via the materialtextureloaded event.
// @license MPL 2.0 https://github.com/mozilla/hubs/blob/master/LICENSE

const textureToData = new Map();
const registeredTextures = [];

AFRAME.registerSystem("uv-scroll", {
  tick(t, dt) {
    for (let i = 0; i < registeredTextures.length; i++) {
      const map = registeredTextures[i];
      const { offset, instances } = textureToData.get(map);
      const { component } = instances[0];

      offset.addScaledVector(component.data.speed, dt / 1000);

      offset.x = offset.x % 1.0;
      offset.y = offset.y % 1.0;

      const increment = component.data.increment;
      map.offset.x = increment.x ? offset.x - (offset.x % increment.x) : offset.x;
      map.offset.y = increment.y ? offset.y - (offset.y % increment.y) : offset.y;
    }
  },
});

/**
 * Animate the UV offset of a mesh's material
 * @component uv-scroll
 */
AFRAME.registerComponent("uv-scroll", {
  schema: {
    speed: { type: "vec2", default: { x: 0, y: 0 } },
    increment: { type: "vec2", default: { x: 0, y: 0 } },
  },
  play() {
    const mesh = this.el.getObject3D("mesh") || this.el.getObject3D("skinnedmesh");
    const material = mesh && mesh.material;
    if (material) {
      // We store mesh here instead of the material directly because we end up swapping out the material in injectCustomShaderChunks.
      // We need material in the first place because of MobileStandardMaterial
      const instance = { component: this, mesh };

      this.instance = instance;
      this.map = material.map || material.emissiveMap;

      if (this.map && !textureToData.has(this.map)) {
        textureToData.set(this.map, {
          offset: new THREE.Vector2(),
          instances: [instance],
        });
        registeredTextures.push(this.map);
      } else if (!this.map) {
        if (this.el.components.material) {
          // when using material and uv-scroll components
          this.el.addEventListener("materialtextureloaded", () => {
            this.map = material.map || material.emissiveMap;
            if (!textureToData.has(this.map)) {
              textureToData.set(this.map, {
                offset: new THREE.Vector2(),
                instances: [instance],
              });
              registeredTextures.push(this.map);
            }
          });
        } else {
          console.warn("Ignoring uv-scroll added to mesh with no scrollable texture.");
        }
      } else {
        console.warn(
          "Multiple uv-scroll instances added to objects sharing a texture, only the speed/increment from the first one will have any effect"
        );
        textureToData.get(this.map).instances.push(instance);
      }
    }
  },

  pause() {
    if (this.map) {
      const instances = textureToData.get(this.map).instances;
      instances.splice(instances.indexOf(this.instance), 1);
      // If this was the last uv-scroll component for a given texture
      if (!instances.length) {
        textureToData.delete(this.map);
        registeredTextures.splice(registeredTextures.indexOf(this.map), 1);
      }
    }
  },
});
