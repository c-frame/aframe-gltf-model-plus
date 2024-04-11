/* global AFRAME, THREE */
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { defaultEnvironmentSettings } from "../inflators/environment-settings";
import { gltfInflators } from "../inflators";

class GLTFMozTextureRGBE {
  constructor(parser, loader) {
    this.parser = parser;
    this.loader = loader;
    this.name = "MOZ_texture_rgbe";
  }

  loadTexture(textureIndex) {
    const parser = this.parser;
    const json = parser.json;
    const textureDef = json.textures[textureIndex];

    if (!textureDef.extensions || !textureDef.extensions[this.name]) {
      return null;
    }

    const extensionDef = textureDef.extensions[this.name];
    const source = extensionDef.source;

    return parser
      .loadTextureImage(textureIndex, source, this.loader)
      .then((t) => {
        // TODO pretty severe artifacting when using mipmaps, disable for now
        if (t.minFilter === THREE.NearestMipmapNearestFilter || t.minFilter === THREE.NearestMipmapLinearFilter) {
          t.minFilter = THREE.NearestFilter;
        } else if (t.minFilter === THREE.LinearMipmapNearestFilter || t.minFilter === THREE.LinearMipmapLinearFilter) {
          t.minFilter = THREE.LinearFilter;
        }
        return t;
      })
      .catch((error) => {
        console.error("issue while loading hdr texture", error);
      });
  }
}

export function mapMaterials(object3D, fn) {
  if (!object3D.material) return [];

  if (Array.isArray(object3D.material)) {
    return object3D.material.map(fn);
  } else {
    return [fn(object3D.material)];
  }
}

class GLTFHubsComponentsExtension {
  constructor(parser) {
    this.parser = parser;
    this.name = "MOZ_hubs_components";
  }

  afterRoot({ scenes, parser }) {
    const deps = [];

    const resolveComponents = (gltfRootType, obj) => {
      const idx = parser.associations.get(obj)?.[gltfRootType];
      // parser.associations.get(obj) will be undefined if you have two scenes in the gltf because of
      // parser.associations = reduceAssociations( scene );
      // line causing parser.associations to be cleaned when loading the second scene.
      // https://github.com/mrdoob/three.js/blob/c965d3b5dcab2575d6a73aec583c29fa44c0c60d/examples/jsm/loaders/GLTFLoader.js#L4373
      // console.log(obj.name, parser.associations.get(obj), gltfRootType, idx, parser.json[gltfRootType][idx]);
      // Empty undefined nodes undefined undefined
      // Be sure to export with "Include / Active Scene" checked in blender to have only one scene in the gltf
      if (idx === undefined) return;
      const ext = parser.json[gltfRootType][idx].extensions?.[this.name];

      if (!ext) return;
      // console.log(obj.name, { ext });

      // TODO putting this into userData is a bit silly, we should just inflate here, but entities need to be inflated first...
      obj.userData.gltfExtensions = Object.assign(obj.userData.gltfExtensions || {}, {
        MOZ_hubs_components: ext,
      });

      for (const componentName in ext) {
        const props = ext[componentName];
        for (const propName in props) {
          const value = props[propName];
          const type = value?.__mhc_link_type;
          if (type && value.index !== undefined) {
            deps.push(
              parser.getDependency(type, value.index).then((loadedDep) => {
                // TODO similar to above, this logic being spread out in multiple places is not great...
                // Node refences are assumed to always be in the scene graph. These referneces are late-resolved in inflateComponents
                // otherwise they will need to be updated when cloning (which happens as part of caching).
                if (type === "node") return;

                if (type === "texture" && !parser.json.textures[value.index].extensions?.MOZ_texture_rgbe) {
                  // For now assume all non HDR textures linked in hubs components are sRGB.
                  // We can allow this to be overriden later if needed
                  loadedDep.encoding = THREE.sRGBEncoding;
                }

                props[propName] = loadedDep;

                return loadedDep;
              })
            );
          }
        }
      }
    };

    // object.userData.gltfExtensions.MOZ_hubs_components is not set because we have a plugin registered for MOZ_hubs_components
    // https://github.com/mrdoob/three.js/blob/c965d3b5dcab2575d6a73aec583c29fa44c0c60d/examples/jsm/loaders/GLTFLoader.js#L2330-L2335
    // called here
    // https://github.com/mrdoob/three.js/blob/c965d3b5dcab2575d6a73aec583c29fa44c0c60d/examples/jsm/loaders/GLTFLoader.js#L4264
    // that's why we traverse all scenes, nodes, materials to set MOZ_hubs_components
    // Actually we're only interested by transforming envMapTexture and backgroundTexture for scene MOZ_hubs_components.environment-settings
    // and reflection probes textures
    for (let i = 0; i < scenes.length; i++) {
      // TODO this should be done by GLTLoader
      parser.associations.set(scenes[i], { scenes: i });
      scenes[i].traverse((obj) => {
        resolveComponents("scenes", obj);
        resolveComponents("nodes", obj);
        mapMaterials(obj, resolveComponents.bind(this, "materials"));
      });
    }

    return Promise.all(deps);
  }
}

class GLTFHubsLightMapExtension {
  constructor(parser) {
    this.parser = parser;
    this.name = "MOZ_lightmap";
  }

  // @TODO: Ideally we should use extendMaterialParams hook.
  //        But the current official glTF loader doesn't fire extendMaterialParams
  //        hook for unlit and specular-glossiness materials.
  //        So using loadMaterial hook as workaround so far.
  //        Cons is loadMaterial hook is fired as _invokeOne so
  //        if other plugins defining loadMaterial is registered
  //        there is a chance that this light map extension handler isn't called.
  //        The glTF loader should be updated to remove the limitation.
  loadMaterial(materialIndex) {
    const parser = this.parser;
    const json = parser.json;
    const materialDef = json.materials[materialIndex];
    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return null;
    }

    const extensionDef = materialDef.extensions[this.name];

    const pending = [];
    pending.push(parser.loadMaterial(materialIndex));
    pending.push(parser.getDependency("texture", extensionDef.index));

    return Promise.all(pending)
      .then((results) => {
        const material = results[0];
        const lightMap = results[1];
        material.lightMap = lightMap;
        material.lightMapIntensity = extensionDef.intensity !== undefined ? extensionDef.intensity : 1;
        if (material.isMeshBasicMaterial) {
          material.lightMapIntensity *= Math.PI;
        }
        return material;
      })
      .catch((error) => {
        console.error("issue while loading MOZ_lightmap material", error);
      });
  }
}

function disposeTextures(material) {
  // Explicitly dispose any textures assigned to this material
  for (const propertyName in material) {
    const texture = material[propertyName];
    if (texture instanceof THREE.Texture) {
      const image = texture.source.data;
      if (image instanceof ImageBitmap) {
        image.close && image.close();
      }
      texture.dispose();
    }
  }
}

export function disposeNode(node) {
  if (node.fakeEl) {
    node.fakeEl.destroy();
  }
  if (node instanceof THREE.Mesh) {
    const geometry = node.geometry;
    if (geometry) {
      geometry.dispose();
    }

    const material = node.material;
    if (material) {
      if (Array.isArray(material)) {
        for (let i = 0, l = material.length; i < l; i++) {
          const m = material[i];
          disposeTextures(m);
          m.dispose();
        }
      } else {
        disposeTextures(material);
        material.dispose(); // disposes any programs associated with the material
      }
    }
  }
}
export const gltfModelPlus = {
  schema: { type: "model" },

  init: function () {
    const self = this;
    const dracoLoader = this.el.sceneEl.systems["gltf-model"].getDRACOLoader();
    const meshoptDecoder = this.el.sceneEl.systems["gltf-model"].getMeshoptDecoder();
    const ktxLoader = this.el.sceneEl.systems["gltf-model"].getKTX2Loader();
    this.model = null;
    this.removers = [];
    this.loader = new THREE.GLTFLoader();
    this.mixer = null;
    this.loader
      .register((parser) => new GLTFHubsComponentsExtension(parser))
      .register((parser) => new GLTFHubsLightMapExtension(parser))
      .register((parser) => new GLTFMozTextureRGBE(parser, new RGBELoader().setDataType(THREE.HalfFloatType)));
    if (dracoLoader) {
      this.loader.setDRACOLoader(dracoLoader);
    }
    if (meshoptDecoder) {
      this.ready = meshoptDecoder.then(function (meshoptDecoder) {
        self.loader.setMeshoptDecoder(meshoptDecoder);
      });
    } else {
      this.ready = Promise.resolve();
    }
    if (ktxLoader) {
      this.loader.setKTX2Loader(ktxLoader);
    }
  },

  update: function () {
    const self = this;
    const el = this.el;
    const src = this.data;

    this.remove();

    if (!src) {
      return;
    }

    el.sceneEl.systems.waypoint.glbLoading += 1;
    console.log("[wp] increment glbLoading", el.sceneEl.systems.waypoint.glbLoading);
    this.ready.then(function () {
      self.el.emit("model-loading", { src });
      self.loader.load(
        src,
        function gltfLoaded(gltfModel) {
          el.emit("model-downloaded");
          self.model = gltfModel.scene || gltfModel.scenes[0];
          self.model.animations = gltfModel.animations;
          el.setObject3D("mesh", self.model);

          // Handle Hubs components
          const animations = gltfModel.animations;
          const finalizers = [];
          let environmentSettings = null;
          gltfModel.scene.traverse((node) => {
            if (node.isMesh) {
              node.reflectionProbeMode = "static";
            }

            if (node.userData.gltfExtensions && node.userData.gltfExtensions.MOZ_hubs_components) {
              const hubsComponents = node.userData.gltfExtensions.MOZ_hubs_components;
              const srcForLogging = src.startsWith("data:") ? "data:application/octet-stream;base64,..." : src;
              console.log(srcForLogging, hubsComponents, node.name);
              Object.entries(hubsComponents).forEach(([componentName, componentProps]) => {
                if (componentName === "environment-settings") {
                  environmentSettings = componentProps;
                } else if (componentName === "visible") {
                  node.visible = componentProps.visible;
                } else if (componentName === "networked") {
                  // ignore, handled in other inflators
                } else if (componentName === "loop-animation") {
                  if (!self.mixer) {
                    self.mixer = new THREE.AnimationMixer(gltfModel.scene);
                    // add tick
                    self.tick = function (t, dt) {
                      if (self.mixer && !isNaN(dt)) self.mixer.update(dt / 1000);
                    };
                    self.el.sceneEl.addBehavior(self);
                  }
                  const activeClipIndices = componentProps.activeClipIndices;
                  let clips = [];
                  if (activeClipIndices && activeClipIndices.length > 0) {
                    // Support for Spoke->Hubs activeClipIndices struct
                    clips = activeClipIndices.map((index) => animations[index]);
                  } else {
                    // Support for Blender imports with { clip: 'train', paused: false} struct.
                    const clipName = componentProps.clip;
                    if (clipName !== "") {
                      const clipNames = clipName.split(",");
                      for (let i = 0; i < clipNames.length; i++) {
                        const n = clipNames[i];
                        const a = animations.find(({ name }) => name === n);
                        // Add the Hubs defined componentProps, we need them later.
                        a.componentProps = componentProps;
                        if (a) {
                          clips.push(a);
                        } else {
                          console.warn(`Could not find animation named '${n}'`);
                        }
                      }
                    }
                  }

                  for (const clip of clips) {
                    const action = self.mixer.clipAction(clip, node);
                    action.enabled = true;
                    // If timeScale is set, use it.
                    if (clip.componentProps.timeScale !== 1) {
                      action.timeScale = clip.componentProps.timeScale;
                    }
                    // If startOffset is set, use it.
                    if (clip.componentProps.startOffset !== 0) {
                      action.time = clip.componentProps.startOffset;
                    }
                    action.setLoop(THREE.LoopRepeat, Infinity).play();
                  }
                } else {
                  const inflator = gltfInflators.get(componentName);
                  if (inflator) {
                    // Create entity and move node to a different parent when we're done traversing the scene
                    finalizers.push(() => {
                      const entity = inflator(node, componentProps, hubsComponents);
                      if (entity) {
                        self.removers.push(() => {
                          entity.object3D.traverse(disposeNode);
                          if (entity.parentNode) entity.parentNode.removeChild(entity);
                          if (componentName === "nav-mesh") {
                            // Temporary until we add child-attached/child-detached support in simple-navmesh-constraint
                            // https://github.com/networked-aframe/naf-valid-avatars/issues/28
                            const cameraRig = document.querySelector("#rig,#cameraRig");
                            cameraRig?.removeAttribute("simple-navmesh-constraint");
                          }
                        });
                      }
                    });
                  } else {
                    console.warn(`Unknown Hubs component '${componentName}'`);
                  }
                }
              });
            }
          });

          // Need to be decremented before executing finalizers that create waypoints
          el.sceneEl.systems.waypoint.glbLoading -= 1;
          console.log("[wp] decrement glbLoading", el.sceneEl.systems.waypoint.glbLoading);
          // We still need to call scheduleEmitWaypointsReady() in case there is no waypoints
          // in the glb but we defined waypoints with a-waypoint primitive.
          el.sceneEl.systems.waypoint.scheduleEmitWaypointsReady();

          for (let i = 0; i < finalizers.length; i++) {
            finalizers[i]();
          }
          finalizers.length = 0;

          if (!environmentSettings) {
            environmentSettings = defaultEnvironmentSettings;
          }

          el.emit("model-loaded", { format: "gltf", model: self.model, environmentSettings });

          // el could be a FakeEntity if we aliased gtlf-model to gtlf-model-plus, so we check classList is not undefined
          if (el.classList?.contains("environment-settings")) {
            gltfInflators.get("environment-settings")(el.sceneEl, environmentSettings);
          }

          setTimeout(() => {
            el.sceneEl.renderer.shadowMap.needsUpdate = true;
          }, 2000);
        },
        function onProgress(evt) {
          el.emit("progress", { originalEvent: evt });
        },
        function gltfFailed(error) {
          el.emit("model-downloaded");
          console.error(error, src);
          const message = error && error.message ? error.message : "Failed to load glTF model";
          console.warn(message);
          el.emit("model-error", { format: "gltf", src: src });
        }
      );
    });
  },

  remove: function () {
    if (!this.model) {
      return;
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
      // remove tick
      this.el.sceneEl.removeBehavior(this);
      this.tick = undefined;
    }

    for (let i = 0; i < this.removers.length; i++) {
      this.removers[i]();
    }
    this.removers.length = 0;

    this.el.removeObject3D("mesh");
    this.model.traverse(disposeNode);
    this.model = null;
  },
};

AFRAME.registerComponent("gltf-model-plus", gltfModelPlus);
