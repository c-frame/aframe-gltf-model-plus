(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("THREE"));
	else if(typeof define === 'function' && define.amd)
		define(["THREE"], factory);
	else {
		var a = typeof exports === 'object' ? factory(require("THREE")) : factory(root["THREE"]);
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(self, (__WEBPACK_EXTERNAL_MODULE_three__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/components/EventDispatcher.js":
/*!*******************************************!*\
  !*** ./src/components/EventDispatcher.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   EventDispatcher: () => (/* binding */ EventDispatcher)
/* harmony export */ });
/**
 * @author mrdoob / http://mrdoob.com/
 * @license MIT
 * https://github.com/mrdoob/eventdispatcher.js/tree/f31179e964ce6cd76818fd25f4152d4bcc82040c/src
 * with `event.target = this` commented, target is set before calling dispatchEvent.
 * This code is used in FakeEntity.
 */

class EventDispatcher {
  addEventListener(type, listener) {
    if (this._listeners === undefined) this._listeners = {};

    const listeners = this._listeners;

    if (listeners[type] === undefined) {
      listeners[type] = [];
    }

    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener);
    }
  }

  hasEventListener(type, listener) {
    if (this._listeners === undefined) return false;

    const listeners = this._listeners;

    return listeners[type] !== undefined && listeners[type].indexOf(listener) !== -1;
  }

  removeEventListener(type, listener) {
    if (this._listeners === undefined) return;

    const listeners = this._listeners;
    const listenerArray = listeners[type];

    if (listenerArray !== undefined) {
      const index = listenerArray.indexOf(listener);

      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }

  dispatchEvent(event) {
    if (this._listeners === undefined) return;

    const listeners = this._listeners;
    const listenerArray = listeners[event.type];

    if (listenerArray !== undefined) {
      // event.target = this;

      // Make a copy, in case listeners are removed while iterating.
      const array = listenerArray.slice(0);

      for (let i = 0, l = array.length; i < l; i++) {
        array[i].call(this, event);
      }
    }
  }
}




/***/ }),

/***/ "./src/components/FakeEntity.js":
/*!**************************************!*\
  !*** ./src/components/FakeEntity.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FakeEntity: () => (/* binding */ FakeEntity)
/* harmony export */ });
/* harmony import */ var _EventDispatcher__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./EventDispatcher */ "./src/components/EventDispatcher.js");
/* global AFRAME, NAF, THREE */


const MULTIPLE_COMPONENT_DELIMITER = "__";

// Reusable object for performance
const eventData = {};
const singlePropUpdate = {};
const FAKE_NODE = { removeChild: () => {} }; // eslint-disable-line

function getRotation(entityEl) {
  const radToDeg = THREE.MathUtils.radToDeg;
  const rotation = entityEl.object3D.rotation;
  const rotationObj = entityEl.rotationObj;
  rotationObj.x = radToDeg(rotation.x);
  rotationObj.y = radToDeg(rotation.y);
  rotationObj.z = radToDeg(rotation.z);
  return rotationObj;
}

/**
 * FakeEntity has a similar API than a-entity but doesn't extend HTMLElement.
 * It allows to use existing aframe components on a THREE node (Group or Object3D) without adding extra DOM element or THREE.Group.
 * This object is created automatically via the addComponent function used in gltf-model-plus component.
 * Differences from a-entity:
 * - Doesn't support component dependencies or mixins logic
 * - Support only simple setAttribute(componentName, object), only one component of the same type, mainly used if a component is using this api.
 * - getAttribute/removeAttribute is not supported, so we're not handling special case of getAttribute for position rotation scale,
 *   use object3D.position directly.
 * - el.object3D is the node.
 *   The fake entity is there only to have a compatible API to use some existing aframe components.
 * - Be careful, node.el may not be the FakeEntity until the FakeEntity is created by adding a first component to the node,
 *   before that it will be the closest a-entity node, you may use node.fakeEl if you need to access the fake entity.
 * - In a component associated to a FakeEntity, this.el.children and this.el.parentNode won't be supported. The THREE node is the primary element here,
 *   so you probably want to modify the component to use this.el.object3D.children for example.
 * - FakeEntity remove is not implemented because we don't have children/parentNode set. (We actually have a weird hack for parentNode, see below.)
 *   Properly removing all components are done externarly by calling node.fakeEl.destroy() in gltf-model-plus remove function.
 * - Because FakeEntity is not a DOM element, you can't use this.el.querySelector API.
 * - You can't use document.querySelectorAll('[waypoint]')) to find all waypoint component set on a FakeEntity either.
 *
 * This implementation has been tested with the following components: gltf-model uv-scroll reflection-probe waypoint/networked
 * but we currently don't use it for waypoint/networked because of compatibility with raycaster and querySelector
 */
class FakeEntity extends _EventDispatcher__WEBPACK_IMPORTED_MODULE_0__.EventDispatcher {
  constructor(node) {
    super();
    this.components = {};
    // To avoid double initializations and infinite loops.
    this.initializingComponents = {};
    this.object3D = node;
    this.sceneEl = node.el.sceneEl; // node.el at this point is a a-entity where we loaded the glb
    this.object3D.el = this; // override node.el with this FakeEntity instance
    this.isEntity = true; // used for raycaster refreshObjects
    this.isPlaying = true; // true by default, we don't implement the play/pause logic on this FakeEntity implementation
    this.object3DMap = {};
    this.rotationObj = {};
    this.states = [];
    // networked component needs parentElement and getAttribute('networked') to set
    // syncData.parent = this.getParentId();
    // we don't really support networked parent here, so setting them to sceneEl
    this.parentElement = this.sceneEl;
    // networked and networked-audio-source components verify if the entity wasn't removed by checking this.el.parentNode
    // NAF also have this code
    // entity.parentNode.removeChild(entity)
    // that is executed via NAF.connection.disconnect() that calls this.entities.removeRemoteEntities()
    // so setting a dummy object with removeChild to make them happy.
    this.parentNode = FAKE_NODE;

    // variables defined by a-node api that are used by the component api
    this.hasLoaded = true;
    this.mixinEls = [];
    this.tagName = "FAKE_ENTITY";
    this.isFakeEntity = true;
  }

  get children() {
    throw Error("FakeEntity el.children not implemented, try another way, maybe el.object3D.children");
  }

  // get parentNode() {
  //   throw Error("FakeEntity el.parentNode not implemented, try another way, maybe el.object3D.parent");
  // }

  addState(state) {
    if (this.is(state)) {
      return;
    }
    this.states.push(state);
    this.emit("stateadded", state);
  }

  removeState(state) {
    const stateIndex = this.states.indexOf(state);
    if (stateIndex === -1) {
      return;
    }
    this.states.splice(stateIndex, 1);
    this.emit("stateremoved", state);
  }

  /**
   * Checks if the element is in a given state. e.g. el.is('alive');
   * @type {string} state - Name of the state we want to check
   */
  is(state) {
    return this.states.indexOf(state) !== -1;
  }

  getAttribute(attr) {
    if (attr === "position") {
      return this.object3D.position;
    }
    if (attr === "rotation") {
      return getRotation(this);
    }
    if (attr === "scale") {
      return this.object3D.scale;
    }
    if (attr === "visible") {
      return this.object3D.visible;
    }
    if (attr === "class" || attr === "mixin") {
      console.warn(`FakeEntity el.getAttribute('${attr}') called`, this.object3D);
      return "";
    }
    // If component, return component data.
    const component = this.components[attr];
    if (component) {
      return component.data;
    }
    throw Error(`FakeEntity el.getAttribute('${attr}') not implemented`);
  }

  getDOMAttribute(attr) {
    console.warn(`FakeEntity el.getDOMAttribute('${attr}') called`, this.object3D);
    return "";
  }

  flushToDOM() {
    // do nothing
  }

  removeAttribute() {
    throw Error("FakeEntity el.removeAttribute not implemented");
  }

  /**
   * setAttribute can:
   *
   * 1. Set a single property of a multi-property component.
   * 2. Set multiple properties of a multi-property component.
   * 3. Replace properties of a multi-property component.
   * 4. Set a value for a single-property component, ~~mixin, or normal HTML attribute~~.
   *
   * @param {string} attrName - Component ~~or attribute~~ name.
   * @param {*} arg1 - Can be a value, property name, CSS-style property string, or
   *   object of properties.
   * @param {*|bool} arg2 - If arg1 is a property name, this should be a value. Otherwise,
   *   it is a boolean indicating whether to clobber previous values (defaults to false).
   */
  setAttribute(componentName, arg1, arg2) {
    if (componentName.indexOf(MULTIPLE_COMPONENT_DELIMITER) > -1) {
      throw Error(
        `FakeEntity setAttribute("${componentName}", ...) using multiple components of the same type is not supported`
      );
    }
    if (!AFRAME.components[componentName]) {
      if (componentName === "id") {
        // networked component is setting the id to be the same as networkId
        this.id = arg1;
        return;
      }
      throw Error(`FakeEntity setAttribute("${componentName}", ...) not supported, this is not a registered component`);
    }

    let newAttrValue, clobber;
    // Determine new attributes from the arguments
    if (
      typeof arg2 !== "undefined" &&
      typeof arg1 === "string" &&
      arg1.length > 0 &&
      typeof AFRAME.utils.styleParser.parse(arg1) === "string"
    ) {
      // Update a single property of a multi-property component
      for (const key in singlePropUpdate) {
        delete singlePropUpdate[key];
      }
      newAttrValue = singlePropUpdate;
      newAttrValue[arg1] = arg2;
      clobber = false;
    } else {
      // Update with a value, object, or CSS-style property string, with the possiblity
      // of clobbering previous values.
      newAttrValue = arg1;
      clobber = arg2 === true;
    }

    this.updateComponent(componentName, newAttrValue, clobber);
  }

  updateComponent(attr, attrValue, clobber) {
    const component = this.components[attr];

    if (component) {
      // Remove component.
      // if (attrValue === null && !checkComponentDefined(this, attr)) {
      if (attrValue === null) {
        this.removeComponent(attr, true);
        return;
      }
      // Component already initialized. Update component.
      component.updateProperties(attrValue, clobber);
      return;
    }

    // Component not yet initialized. Initialize component.
    this.initComponent(attr, attrValue, false);
  }

  /**
   * Initialize component.
   *
   * @param {string} attrName - Attribute name associated to the component.
   * @param {object} data - Component data
   * @param {boolean} isDependency - True if the component is a dependency.
   */
  // eslint-disable-next-line
  initComponent(attrName, data, isDependency) {
    addComponent(this.object3D, attrName, data);
  }

  removeComponent(name, destroy) {
    const component = this.components[name];
    if (!component) {
      return;
    }

    // Wait for component to initialize.
    if (!component.initialized) {
      this.addEventListener("componentinitialized", function tryRemoveLater(evt) {
        if (evt.detail.name !== name) {
          return;
        }
        this.removeComponent(name, destroy);
        this.removeEventListener("componentinitialized", tryRemoveLater);
      });
      return;
    }

    component.pause();
    component.remove();

    // Keep component attached to entity in case of just full entity detach.
    if (destroy) {
      component.destroy();
      delete this.components[name];
    }

    this.emit("componentremoved", component.evtDetail, false);
  }

  getObject3D(type) {
    return this.object3DMap[type];
  }

  /**
   * Set a THREE.Object3D into the map.
   *
   * @param {string} type - Developer-set name of the type of object, will be unique per type.
   * @param {object} obj - A THREE.Object3D.
   */
  setObject3D(type, obj) {
    // Remove existing object of the type.
    const oldObj = this.getObject3D(type);
    if (oldObj) {
      this.object3D.remove(oldObj);
    }

    // Set references to this fake entity.
    obj.el = this;
    const self = this;
    if (obj.children.length) {
      obj.traverse(function bindEl(child) {
        child.el = self;
      });
    }

    // Add.
    if (obj !== this.object3D) {
      this.object3D.add(obj);
    }
    this.object3DMap[type] = obj;
    this.emit("object3dset", { object: obj, type: type });
  }

  /**
   * Remove object from scene and entity object3D map.
   */
  removeObject3D(type) {
    const obj = this.getObject3D(type);
    if (!obj) {
      console.warn("Tried to remove `Object3D` of type:", type, "which was not defined.");
      return;
    }
    this.object3D.remove(obj);
    delete this.object3DMap[type];
    this.emit("object3dremove", { type: type });
  }

  emit(name, detail, bubbles, extraData) {
    if (bubbles === undefined) {
      bubbles = true;
    }
    let data = eventData;
    data.bubbles = !!bubbles;
    data.detail = detail;

    // If extra data is present, we need to create a new object.
    if (extraData) {
      data = AFRAME.utils.extend({}, extraData, data);
    }

    // In the default EventDispatcher implementation, dispatchEvent was setting target attribute on the event
    // but we got an error with CustomEvent instance being readonly. So we're setting it in data first
    // before creating the CustomEvent.
    data.target = this;
    this.dispatchEvent(new CustomEvent(name, data));
    // And we reset target to null to be sure to not keep a reference to `this` for the garbage collector to work properly.
    data.target = null;
  }

  destroy() {
    for (const name in this.components) {
      this.removeComponent(name, true);
    }
    this.object3D.el = null;
    this.object3D = null;
    this.sceneEl = null;
    this.parentElement = null;
    this.parentNode = null;
  }
}


/***/ }),

/***/ "./src/components/environment-settings.js":
/*!************************************************!*\
  !*** ./src/components/environment-settings.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var three_addons_loaders_RGBELoader_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! three/addons/loaders/RGBELoader.js */ "./node_modules/three/examples/jsm/loaders/RGBELoader.js");
/* harmony import */ var _inflators__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../inflators */ "./src/inflators/index.js");
/* global AFRAME, THREE */



const HDR_FILE_RE = /\.hdr$/;

const absoluteURLForAsset =
  window.absoluteURLForAsset ||
  ((asset) => {
    return asset;
  });

// same defaults as the defaultEnvironmentSettings function
AFRAME.registerComponent("environment-settings", {
  schema: {
    toneMapping: {
      type: "string",
      default: "LUTToneMapping",
      oneOf: [
        "NoToneMapping",
        "LinearToneMapping",
        "ReinhardToneMapping",
        "CineonToneMapping",
        "ACESFilmicToneMapping",
        "CustomToneMapping",
        "LUTToneMapping",
      ],
    },
    toneMappingExposure: {
      type: "number",
      default: 1,
    },
    backgroundTexture: {
      type: "string",
      default: "",
    },
    backgroundColor: {
      type: "color",
      default: "skyblue",
    },
    envMapTexture: {
      type: "string",
      default: "",
    },
  },
  init() {
    (async () => {
      let backgroundTexture = null;
      if (this.data.backgroundTexture) {
        const backgroundTextureUrl = absoluteURLForAsset(this.data.backgroundTexture);
        const isHDR = HDR_FILE_RE.test(backgroundTextureUrl);
        let loader;
        if (isHDR) {
          loader = new three_addons_loaders_RGBELoader_js__WEBPACK_IMPORTED_MODULE_1__.RGBELoader().setDataType(THREE.HalfFloatType);
        } else {
          loader = new THREE.TextureLoader();
        }

        loader.setWithCredentials(false);
        backgroundTexture = await new Promise((resolve, reject) =>
          loader.load(backgroundTextureUrl, resolve, undefined, reject)
        );
        if (
          backgroundTexture.minFilter === THREE.NearestMipmapNearestFilter ||
          backgroundTexture.minFilter === THREE.NearestMipmapLinearFilter
        ) {
          backgroundTexture.minFilter = THREE.NearestFilter;
        } else if (
          backgroundTexture.minFilter === THREE.LinearMipmapNearestFilter ||
          backgroundTexture.minFilter === THREE.LinearMipmapLinearFilter
        ) {
          backgroundTexture.minFilter = THREE.LinearFilter;
        }

        if (!isHDR) {
          backgroundTexture.encoding = THREE.sRGBEncoding;
        }
      }

      let envMapTexture = null;
      if (this.data.envMapTexture) {
        const envMapTextureUrl = absoluteURLForAsset(this.data.envMapTexture);
        const isHDR = HDR_FILE_RE.test(envMapTextureUrl);
        let loader;
        if (isHDR) {
          loader = new three_addons_loaders_RGBELoader_js__WEBPACK_IMPORTED_MODULE_1__.RGBELoader().setDataType(THREE.HalfFloatType);
        } else {
          loader = new THREE.TextureLoader();
        }

        loader.setWithCredentials(false);
        envMapTexture = await new Promise((resolve, reject) =>
          loader.load(envMapTextureUrl, resolve, undefined, reject)
        );
        if (
          envMapTexture.minFilter === THREE.NearestMipmapNearestFilter ||
          envMapTexture.minFilter === THREE.NearestMipmapLinearFilter
        ) {
          envMapTexture.minFilter = THREE.NearestFilter;
        } else if (
          envMapTexture.minFilter === THREE.LinearMipmapNearestFilter ||
          envMapTexture.minFilter === THREE.LinearMipmapLinearFilter
        ) {
          envMapTexture.minFilter = THREE.LinearFilter;
        }

        if (!isHDR) {
          envMapTexture.encoding = THREE.sRGBEncoding;
        }
      }

      const settings = {
        toneMapping: this.data.toneMapping,
        toneMappingExposure: this.data.toneMappingExposure,
        backgroundTexture: backgroundTexture,
        backgroundColor: this.data.backgroundColor,
        envMapTexture: envMapTexture,
      };
      _inflators__WEBPACK_IMPORTED_MODULE_0__.gltfInflators.get("environment-settings")(this.el.sceneEl, settings);
    })();
  },
});


/***/ }),

/***/ "./src/components/gltf-model-plus.js":
/*!*******************************************!*\
  !*** ./src/components/gltf-model-plus.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   disposeNode: () => (/* binding */ disposeNode),
/* harmony export */   gltfModelPlus: () => (/* binding */ gltfModelPlus),
/* harmony export */   mapMaterials: () => (/* binding */ mapMaterials)
/* harmony export */ });
/* harmony import */ var three_addons_loaders_RGBELoader_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! three/addons/loaders/RGBELoader.js */ "./node_modules/three/examples/jsm/loaders/RGBELoader.js");
/* harmony import */ var _inflators_environment_settings__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../inflators/environment-settings */ "./src/inflators/environment-settings.js");
/* harmony import */ var _inflators__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../inflators */ "./src/inflators/index.js");
/* global AFRAME, NAF, THREE */




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

function mapMaterials(object3D, fn) {
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

function disposeNode(node) {
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
const gltfModelPlus = {
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
      .register((parser) => new GLTFMozTextureRGBE(parser, new three_addons_loaders_RGBELoader_js__WEBPACK_IMPORTED_MODULE_2__.RGBELoader().setDataType(THREE.HalfFloatType)));
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
              console.log(src, hubsComponents, node.name);
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
                        if (a) {
                          clips.push(a);
                        } else {
                          console.warn(`Could not find animation named '${n}'`);
                        }
                      }
                    }
                  }

                  for (let i = 0; i < clips.length; i++) {
                    const action = self.mixer.clipAction(clips[i], node);
                    action.enabled = true;
                    action.setLoop(THREE.LoopRepeat, Infinity).play();
                  }
                } else {
                  const inflator = _inflators__WEBPACK_IMPORTED_MODULE_1__.gltfInflators.get(componentName);
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

          if (!environmentSettings) {
            environmentSettings = _inflators_environment_settings__WEBPACK_IMPORTED_MODULE_0__.defaultEnvironmentSettings;
          }

          if (self.el.classList.contains("environment-settings")) {
            _inflators__WEBPACK_IMPORTED_MODULE_1__.gltfInflators.get("environment-settings")(self.el.sceneEl, environmentSettings);
          }

          for (let i = 0; i < finalizers.length; i++) {
            finalizers[i]();
          }
          finalizers.length = 0;

          el.emit("model-loaded", { format: "gltf", model: self.model, environmentSettings });
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


/***/ }),

/***/ "./src/components/media-frame.js":
/*!***************************************!*\
  !*** ./src/components/media-frame.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   mediaFrameComponent: () => (/* binding */ mediaFrameComponent)
/* harmony export */ });
/* global AFRAME, THREE */
const registeredMediaframes = [];
const mediaFramesById = new Map();

AFRAME.registerSystem("media-frame", {
  getClosestMediaFrame: function (filterByMediaType) {
    let mediaFrames = registeredMediaframes;
    if (filterByMediaType && filterByMediaType !== "all") {
      if (filterByMediaType === "all-2d") {
        mediaFrames = mediaFrames.filter((mediaFrame) => {
          const mediaType = mediaFrame.component.data.mediaType;
          return mediaType !== "model";
        });
      } else {
        if (filterByMediaType === "model") {
          mediaFrames = mediaFrames.filter((mediaFrame) => {
            const mediaType = mediaFrame.component.data.mediaType;
            return mediaType === filterByMediaType || mediaType === "all";
          });
        } else {
          mediaFrames = mediaFrames.filter((mediaFrame) => {
            const mediaType = mediaFrame.component.data.mediaType;
            return mediaType === filterByMediaType || mediaType === "all" || mediaType === "all-2d";
          });
        }
      }
    }
    const cameraRigPosition = document.querySelector("#rig,#cameraRig").object3D.position;
    // Note: assumption that object3D.position is global world coordinate here
    mediaFrames.sort((a, b) => {
      if (a.el.object3D.position.distanceTo(cameraRigPosition) < b.el.object3D.position.distanceTo(cameraRigPosition)) {
        return -1;
      }
      return 1;
    });
    if (mediaFrames.length > 0) {
      return mediaFrames[0];
    }
    return document.getElementById("screenshare"); // TODO remove this hard coded value
  },
  getMediaFrameById(id) {
    const mediaFrame = mediaFramesById.get(id);
    if (!mediaFrame) return document.getElementById("screenshare"); // TODO remove this hard coded value
    return mediaFrame.el;
  },
});

/**
 * Define a location where you can put 2d or 3d elements
 * @component media-frame
 */
const mediaFrameComponent = AFRAME.registerComponent("media-frame", {
  schema: {
    bounds: { type: "vec3", default: { x: 1, y: 1, z: 1 } },
    mediaType: { type: "string", oneOf: ["all", "all-2d", "model", "image", "video", "pdf"], default: "all-2d" },
    snapToCenter: { type: "boolean", default: true },
  },
  play() {
    const id = this.el.components.networked.data.networkId;
    const instance = { component: this, el: this.el, id };
    this.instance = instance;
    mediaFramesById.set(id, instance);
    registeredMediaframes.push(instance);
  },

  pause() {
    mediaFramesById.delete(this.instance.id);
    registeredMediaframes.splice(registeredMediaframes.indexOf(this.instance), 1);
  },
});


/***/ }),

/***/ "./src/components/reflection-probe.js":
/*!********************************************!*\
  !*** ./src/components/reflection-probe.js ***!
  \********************************************/
/***/ (() => {

AFRAME.registerComponent("reflection-probe", {
  schema: {
    size: { default: 1 },
    envMapTexture: { type: "map" },
  },

  init: function () {
    this.el.object3D.updateWorldMatrix(true, false);

    const box = new THREE.Box3()
      .setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3().setScalar(this.data.size * 2))
      .applyMatrix4(this.el.object3D.matrixWorld);

    this.el.setObject3D("probe", new THREE.ReflectionProbe(box, this.data.envMapTexture));

    // if (this.el.sceneEl.systems["hubs-systems"].environmentSystem.debugMode) {
    //   const debugBox = new THREE.Box3().setFromCenterAndSize(
    //     new THREE.Vector3(),
    //     new THREE.Vector3().setScalar(this.data.size * 2)
    //   );
    //   this.el.setObject3D(
    //     "helper",
    //     new THREE.Box3Helper(debugBox, new THREE.Color(Math.random(), Math.random(), Math.random()))
    //   );
    // }
  },
});


/***/ }),

/***/ "./src/components/simple-water.js":
/*!****************************************!*\
  !*** ./src/components/simple-water.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ SimpleWater)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(three__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var three_addons_math_SimplexNoise_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! three/addons/math/SimplexNoise.js */ "./node_modules/three/examples/jsm/math/SimplexNoise.js");
/* harmony import */ var _assets_waternormals_jpg__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../assets/waternormals.jpg */ "./src/assets/waternormals.jpg");
/* global AFRAME, THREE */
// This is a modified copy of https://github.com/mozilla/hubs/blob/b466e6901cb2a0310b5219e2dac41731d7fa0916/src/components/simple-water.js
// and https://github.com/mozilla/hubs/blob/f099ec6cb9a15c8f7554ffdbec592f9abf6c7267/src/objects/SimpleWaterMesh.ts
// and https://github.com/mozilla/hubs/blob/c734c4d8c09a4969ea7793de9e500f3b39cc9a8e/src/assets/waternormals.jpg
// Changes required was removing typescript annotations, removing APP.store.state.preferences.materialQualitySetting usage and replacing HubsTextureLoader by TextureLoader.
// @license MPL 2.0 https://github.com/mozilla/hubs/blob/master/LICENSE





/**
 * SimpleWater
 */

/**
 * Adapted dynamic geometry code from: https://github.com/ditzel/UnityOceanWavesAndShip
 */

class Octave {
  constructor(speed = new three__WEBPACK_IMPORTED_MODULE_0__.Vector2(1, 1), scale = new three__WEBPACK_IMPORTED_MODULE_0__.Vector2(1, 1), height = 0.0025, alternate = true) {
    this.speed = speed;
    this.scale = scale;
    this.height = height;
    this.alternate = alternate;
  }
}
class SimpleWater extends three__WEBPACK_IMPORTED_MODULE_0__.Mesh {
  constructor(normalMap, resolution = 24, lowQuality = false) {
    const geometry = new three__WEBPACK_IMPORTED_MODULE_0__.PlaneGeometry(10, 10, resolution, resolution);
    geometry.rotateX(-Math.PI / 2);

    const waterUniforms = {
      ripplesSpeed: { value: 0.25 },
      ripplesScale: { value: 1 },
      time: { value: 0 },
    };

    const MaterialClass = lowQuality ? three__WEBPACK_IMPORTED_MODULE_0__.MeshPhongMaterial : three__WEBPACK_IMPORTED_MODULE_0__.MeshStandardMaterial;

    normalMap.wrapS = normalMap.wrapT = three__WEBPACK_IMPORTED_MODULE_0__.RepeatWrapping;

    const material = new MaterialClass({ color: 0x0054df, normalMap, roughness: 0.5, metalness: 0.5 });
    material.name = "SimpleWaterMaterial";

    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, waterUniforms);

      shader.vertexShader = shader.vertexShader.replace(
        "#include <fog_pars_vertex>",
        `
        #include <fog_pars_vertex>
        varying vec3 vWPosition;
      `
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <fog_vertex>",
        `
        #include <fog_vertex>
        vWPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
      `
      );

      // getNoise function from https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water.js
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normalmap_pars_fragment>",
        `
        #include <normalmap_pars_fragment>

        uniform float time;
        uniform float ripplesSpeed;
        uniform float ripplesScale;
      
        varying vec3 vWPosition;
      
        vec4 getNoise(vec2 uv){
          float timeOffset = time * ripplesSpeed;
          uv = (uv - 0.5) * (1.0 / ripplesScale);
          vec2 uv0 = (uv/103.0)+vec2(timeOffset/17.0, timeOffset/29.0);
          vec2 uv1 = uv/107.0-vec2(timeOffset/-19.0, timeOffset/31.0);
          vec2 uv2 = uv/vec2(897.0, 983.0)+vec2(timeOffset/101.0, timeOffset/97.0);
          vec2 uv3 = uv/vec2(991.0, 877.0)-vec2(timeOffset/109.0, timeOffset/-113.0);
          vec4 noise = (texture2D(normalMap, uv0)) +
                       (texture2D(normalMap, uv1)) +
                       (texture2D(normalMap, uv2)) +
                       (texture2D(normalMap, uv3));
          return noise / 4.0;
        }
      `
      );

      // https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/normalmap_pars_fragment.glsl.js#L20
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `
          // Workaround for Adreno 3XX dFd*( vec3 ) bug. See #9988

          vec3 eye_pos = -vViewPosition;
          vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
          vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
          vec2 st0 = dFdx( vUv.st );
          vec2 st1 = dFdy( vUv.st );

          float scale = sign( st1.t * st0.s - st0.t * st1.s ); // we do not care about the magnitude

          vec3 S = normalize( ( q0 * st1.t - q1 * st0.t ) * scale );
          vec3 T = normalize( ( - q0 * st1.s + q1 * st0.s ) * scale );
          vec3 N = normalize( normal );
          mat3 tsn = mat3( S, T, N );

          vec3 mapN = getNoise(vWPosition.xz).xyz * 2.0 - 1.0;

          mapN.xy *= normalScale;
          mapN.xy *= ( float( gl_FrontFacing ) * 2.0 - 1.0 );

          normal = normalize( tsn * mapN );
        `
      );
    };

    super(geometry, material);

    this.lowQuality = lowQuality;
    this.waterUniforms = waterUniforms;

    if (lowQuality) {
      this.material.specular.set(0xffffff);
    } else {
      this.receiveShadow = true;
    }

    this.geometry.attributes.position.dynamic = true;

    this.resolution = resolution;
    this.octaves = [
      new Octave(new three__WEBPACK_IMPORTED_MODULE_0__.Vector2(0.5, 0.5), new three__WEBPACK_IMPORTED_MODULE_0__.Vector2(1, 1), 0.01, true),
      new Octave(new three__WEBPACK_IMPORTED_MODULE_0__.Vector2(0.05, 6), new three__WEBPACK_IMPORTED_MODULE_0__.Vector2(1, 20), 0.1, false),
    ];

    this.simplex = new three_addons_math_SimplexNoise_js__WEBPACK_IMPORTED_MODULE_2__.SimplexNoise();
  }

  get opacity() {
    return this.material.opacity;
  }

  set opacity(value) {
    this.material.opacity = value;
    this.material.transparent = value !== 1;
  }

  get color() {
    return this.material.color;
  }

  get tideHeight() {
    return this.octaves[0].height;
  }

  set tideHeight(value) {
    this.octaves[0].height = value;
  }

  get tideScale() {
    return this.octaves[0].scale;
  }

  get tideSpeed() {
    return this.octaves[0].speed;
  }

  get waveHeight() {
    return this.octaves[1].height;
  }

  set waveHeight(value) {
    this.octaves[1].height = value;
  }

  get waveScale() {
    return this.octaves[1].scale;
  }

  get waveSpeed() {
    return this.octaves[1].speed;
  }

  set ripplesSpeed(value) {
    this.waterUniforms.ripplesSpeed.value = value;
  }

  get ripplesSpeed() {
    return this.waterUniforms.ripplesSpeed.value;
  }

  set ripplesScale(value) {
    this.waterUniforms.ripplesScale.value = value;
  }

  get ripplesScale() {
    return this.waterUniforms.ripplesScale.value;
  }

  update(time) {
    const positionAttribute = this.geometry.attributes.position;

    for (let x = 0; x <= this.resolution; x++) {
      for (let z = 0; z <= this.resolution; z++) {
        let y = 0;

        for (let o = 0; o < this.octaves.length; o++) {
          const octave = this.octaves[o];

          if (octave.alternate) {
            const noise = this.simplex.noise(
              (x * octave.scale.x) / this.resolution,
              (z * octave.scale.y) / this.resolution
            );
            y += Math.cos(noise + octave.speed.length() * time) * octave.height;
          } else {
            const noise =
              this.simplex.noise(
                (x * octave.scale.x + time * octave.speed.x) / this.resolution,
                (z * octave.scale.y + time * octave.speed.y) / this.resolution
              ) - 0.5;
            y += noise * octave.height;
          }
        }

        positionAttribute.setY(x * (this.resolution + 1) + z, y);
      }
    }

    this.geometry.computeVertexNormals();
    positionAttribute.needsUpdate = true;
    this.waterUniforms.time.value = time;
  }

  clone(recursive) {
    return new SimpleWater(this.material.normalMap, this.resolution, this.lowQuality).copy(this, recursive);
  }

  copy(source, recursive = true) {
    super.copy(source, recursive);

    this.opacity = source.opacity;
    this.color.copy(source.color);
    this.tideHeight = source.tideHeight;
    this.tideScale.copy(source.tideScale);
    this.tideSpeed.copy(source.tideSpeed);
    this.waveHeight = source.waveHeight;
    this.waveScale.copy(source.waveScale);
    this.waveSpeed.copy(source.waveSpeed);
    this.ripplesSpeed = source.ripplesSpeed;
    this.ripplesScale = source.ripplesScale;

    return this;
  }
}

function vec2Equals(a, b) {
  return a && b && a.x === b.x && a.y === b.y;
}

let waterNormalMap = null;

AFRAME.registerComponent("simple-water", {
  schema: {
    opacity: { type: "number", default: 1 },
    color: { type: "color" },
    tideHeight: { type: "number", default: 0.01 },
    tideScale: { type: "vec2", default: { x: 1, y: 1 } },
    tideSpeed: { type: "vec2", default: { x: 0.5, y: 0.5 } },
    waveHeight: { type: "number", default: 0.1 },
    waveScale: { type: "vec2", default: { x: 1, y: 20 } },
    waveSpeed: { type: "vec2", default: { x: 0.05, y: 6 } },
    ripplesScale: { type: "number", default: 1 },
    ripplesSpeed: { type: "number", default: 0.25 },
  },

  init() {
    if (!waterNormalMap) {
      waterNormalMap = new three__WEBPACK_IMPORTED_MODULE_0__.TextureLoader().load(_assets_waternormals_jpg__WEBPACK_IMPORTED_MODULE_1__);
    }

    const usePhongShader = false; // window.APP.store.state.preferences.materialQualitySetting !== "high";
    this.water = new SimpleWater(waterNormalMap, undefined, usePhongShader);
    this.el.setObject3D("mesh", this.water);
  },

  update(oldData) {
    if (this.data.opacity !== oldData.opacity) {
      this.water.opacity = this.data.opacity;
    }

    if (this.data.color !== oldData.color) {
      this.water.color.set(this.data.color);
    }

    if (this.data.tideHeight !== oldData.tideHeight) {
      this.water.tideHeight = this.data.tideHeight;
    }

    if (!vec2Equals(this.data.tideScale, oldData.tideScale)) {
      this.water.tideScale.copy(this.data.tideScale);
    }

    if (!vec2Equals(this.data.tideSpeed, oldData.tideSpeed)) {
      this.water.tideSpeed.copy(this.data.tideSpeed);
    }

    if (this.data.waveHeight !== oldData.waveHeight) {
      this.water.waveHeight = this.data.waveHeight;
    }

    if (!vec2Equals(this.data.waveScale, oldData.waveScale)) {
      this.water.waveScale.copy(this.data.waveScale);
    }

    if (!vec2Equals(this.data.waveSpeed, oldData.waveSpeed)) {
      this.water.waveSpeed.copy(this.data.waveSpeed);
    }

    if (this.data.ripplesScale !== oldData.ripplesScale) {
      this.water.ripplesScale = this.data.ripplesScale;
    }

    if (this.data.ripplesSpeed !== oldData.ripplesSpeed) {
      this.water.ripplesSpeed = this.data.ripplesSpeed;
    }
  },

  tick(time) {
    this.water.update(time / 1000);
  },

  remove() {
    const mesh = this.el.getObject3D("mesh");
    mesh.geometry.dispose();
    // mesh.material.normalMap.dispose(); // the texture may be used by another component
    mesh.material.dispose();
    this.el.removeObject3D("mesh");
  },
});


/***/ }),

/***/ "./src/components/uv-scroll.js":
/*!*************************************!*\
  !*** ./src/components/uv-scroll.js ***!
  \*************************************/
/***/ (() => {

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


/***/ }),

/***/ "./src/components/waypoint.js":
/*!************************************!*\
  !*** ./src/components/waypoint.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registeredWaypoints: () => (/* binding */ registeredWaypoints),
/* harmony export */   teleportTo: () => (/* binding */ teleportTo),
/* harmony export */   unoccupyWaypoints: () => (/* binding */ unoccupyWaypoints),
/* harmony export */   waypointSchema: () => (/* binding */ waypointSchema)
/* harmony export */ });
/* global AFRAME, THREE, NAF */

const teleportTo = (position, rotation, withTransition = true) => {
  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(new THREE.Euler(0, THREE.MathUtils.degToRad(rotation.y), 0));
  const cameraRig = document.querySelector("#rig,#cameraRig");
  const camera = cameraRig.querySelector("[camera]");
  const cursorTeleport = cameraRig?.components["cursor-teleport"];
  withTransition = withTransition && !cameraRig.sceneEl.is("vr-mode");
  if (withTransition && cursorTeleport) {
    cursorTeleport.teleportTo(position, quaternion);
  } else {
    if (cameraRig.hasAttribute("simple-navmesh-constraint")) {
      cameraRig.setAttribute("simple-navmesh-constraint", "enabled", false);
    }
    const camForRotation = camera.object3D;
    const destQuaternion = new THREE.Quaternion();
    destQuaternion.setFromEuler(new THREE.Euler(0, camForRotation.rotation.y, 0));
    destQuaternion.invert();
    destQuaternion.multiply(quaternion);
    cameraRig.object3D.position.copy(position);
    cameraRig.object3D.quaternion.copy(destQuaternion);
    if (cameraRig.hasAttribute("simple-navmesh-constraint")) {
      cameraRig.setAttribute("simple-navmesh-constraint", "enabled", true);
    }
  }

  if (camera) {
    camera.components["look-controls"].pitchObject.rotation.x = THREE.MathUtils.DEG2RAD * rotation.x;
  }
};

const waypointSchema = {
  template: "#waypoint-template",
  components: [
    {
      component: "waypoint",
      property: "isOccupied",
    },
    {
      component: "waypoint",
      property: "occupiedBy",
    },
  ],
};

function genClientId() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0]);
}

const clientId = genClientId();

function getClientId() {
  // this.el.setAttribute("waypoint", { isOccupied: true, occupiedBy: NAF.clientId });
  // with NAF.clientId empty string didn't set empty string but kept "scene", we use here clientId that is not empty even if not connected
  // so the unoccupyWaypoints function works correctly when not connected.
  return NAF.clientId || clientId;
}

const registeredWaypoints = [];

const unoccupyWaypoints = () => {
  registeredWaypoints.forEach((waypoint) => {
    if (waypoint.components.networked && waypoint.components.waypoint.data.occupiedBy === getClientId()) {
      waypoint.setAttribute("waypoint", { isOccupied: false, occupiedBy: "scene" });
      // In case of reconnect, someone else may have the actual ownership
      // of my seat, so be sure to take ownership.
      if (NAF.connection.adapter) NAF.utils.takeOwnership(waypoint);
    }
  });

  const cameraRig = document.querySelector("#rig,#cameraRig");
  cameraRig.components["player-info"].occupyWaypoint = false;
  cameraRig.setAttribute("player-info", "avatarPose", "stand");
};

AFRAME.registerComponent("waypoint", {
  schema: {
    canBeClicked: { type: "bool", default: false },
    canBeOccupied: { type: "bool", default: false },
    canBeSpawnPoint: { type: "bool", default: false },
    snapToNavMesh: { type: "bool", default: false },
    willDisableMotion: { type: "bool", default: false },
    willDisableTeleporting: { type: "bool", default: false },
    willMaintainInitialOrientation: { type: "bool", default: false },
    isOccupied: { type: "bool", default: false },
    occupiedBy: { type: "string", default: "scene" },
  },
  events: {
    "model-loaded": function (evt) {
      this.registerWaypoint();
      this.el.classList.add("clickable");
      let rootNode = this.el.object3D.getObjectByName("RootNode");
      if (!rootNode.material && rootNode.children.length > 0) {
        rootNode = rootNode.children[0];
      }
      if (rootNode && rootNode.material) {
        this.mesh = rootNode;
        if (!this.originalColor) {
          this.originalColor = this.mesh.material.color.clone();
        }
        this.mesh.material.visible = false;
      }
    },
    mouseenter: function (evt) {
      if (this.mesh && !this.data.isOccupied) {
        this.mesh.material.color.set("#0284c7");
        this.mesh.material.visible = true;
      }
    },
    mouseleave: function (evt) {
      if (this.mesh) {
        this.mesh.material.color.set(this.originalColor);
        this.mesh.material.visible = false;
      }
    },
    "ownership-gained": function (evt) {
      // We can gain the ownership automatically when previous owner of the
      // persistent entity disconnect. Every participant gains the ownership, so
      // there is a race condition to set isOccupied:false here.
      if (
        !this.el.sceneEl.is("naf:reconnecting") &&
        this.data.isOccupied &&
        NAF.connection.activeDataChannels[this.data.occupiedBy] === false
      ) {
        setTimeout(() => {
          if (NAF.utils.isMine(this.el)) {
            // reconnected user may have taken back ownership after the 2s so do nothing in this case
            this.el.setAttribute("waypoint", { isOccupied: false });
            // don't set occupiedBy:scene, the disconnected user will have a chance to occupy it again
          }
        }, 2000);
      }
    },
    click: function (evt) {
      unoccupyWaypoints();
      const cameraRig = document.querySelector("#rig,#cameraRig");
      const camera = cameraRig.querySelector("[camera]");

      cameraRig.components["player-info"].occupyWaypoint = true;
      // Note: there is a check for occupyWaypoint in the movement-controls component
      if (this.el.components.networked) {
        this.el.setAttribute("waypoint", { isOccupied: true, occupiedBy: getClientId() });
        if (NAF.connection.adapter) NAF.utils.takeOwnership(this.el);
      }

      const spawnPoint = this.el;
      const avatarPose = this.data.canBeOccupied && this.data.willDisableMotion ? "sit" : "stand";
      cameraRig.setAttribute("player-info", "avatarPose", avatarPose);

      const position = new THREE.Vector3();
      position.copy(spawnPoint.object3D.position);
      const playerInfo = cameraRig.components["player-info"];
      const avatarSitOffset = playerInfo.avatarSitOffset ?? 0.45;
      if (playerInfo.data.avatarPose === "sit") {
        position.y -= avatarSitOffset;
      }

      const euler = new THREE.Euler().setFromQuaternion(spawnPoint.object3D.quaternion, "YXZ");
      const rotation = { x: 0, y: euler.y * THREE.MathUtils.RAD2DEG + 180, z: 0 };
      teleportTo(position, rotation, false);
      cameraRig.setAttribute("player-info", { seatRotation: camera.object3D.rotation.y });
    },
  },
  registerWaypoint() {
    // be sure to not add it twice
    const idx = registeredWaypoints.indexOf(this.el);
    if (idx === -1) {
      registeredWaypoints.push(this.el);
    }
  },
  unregisterWaypoint() {
    // it may already be removed, so be careful indexOf is not -1 otherwise it will remove the last item of the array
    const idx = registeredWaypoints.indexOf(this.el);
    if (idx > -1) {
      registeredWaypoints.splice(idx, 1);
    }
  },
  init() {
    if (!this.data.canBeClicked) {
      this.registerWaypoint();
      // so we have it in the registeredWaypoints array, and it won't be raycastable because we don't have a mesh
    }
    // if canBeClicked, then we added a gltf-model component and it will be registered in model-loaded
  },
  remove() {
    this.unregisterWaypoint();
  },
  update(oldData) {
    // this.data.isOccupied is false if some other participant set it to
    // false in ownership-gained and sent me back the change when I'm reconnected
    if (!this.data.isOccupied && this.data.occupiedBy === getClientId()) {
      // take back my seat if I didn't choose another seat while I was reconnecting
      const currentlyOnAnotherSeat = registeredWaypoints.find((waypoint) => {
        return (
          this.el !== waypoint &&
          waypoint.components.networked &&
          waypoint.components.waypoint.data.occupiedBy === getClientId()
        );
      });
      if (currentlyOnAnotherSeat) {
        this.el.setAttribute("waypoint", { isOccupied: false, occupiedBy: "scene" });
      } else {
        this.el.setAttribute("waypoint", { isOccupied: true });
      }
      if (NAF.connection.adapter) NAF.utils.takeOwnership(this.el);
    }

    if (this.data.canBeClicked && oldData.isOccupied !== this.data.isOccupied) {
      if (this.data.isOccupied) {
        this.el.object3D.visible = false;
        this.el.classList.remove("clickable");
      } else {
        this.el.object3D.visible = true;
        this.el.classList.add("clickable");
      }
    }
  },
});


/***/ }),

/***/ "./src/inflators/environment-settings.js":
/*!***********************************************!*\
  !*** ./src/inflators/environment-settings.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   defaultEnvironmentSettings: () => (/* binding */ defaultEnvironmentSettings),
/* harmony export */   inflateEnvironmentSettings: () => (/* binding */ inflateEnvironmentSettings)
/* harmony export */ });
/* harmony import */ var three_addons_loaders_LUTCubeLoader_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! three/addons/loaders/LUTCubeLoader.js */ "./node_modules/three/examples/jsm/loaders/LUTCubeLoader.js");
/* harmony import */ var _assets_blender_lut_cube__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../assets/blender-lut.cube */ "./src/assets/blender-lut.cube");
/* global THREE */



const defaultEnvironmentSettings = {
  toneMapping: "LUTToneMapping",
  toneMappingExposure: 1,
  backgroundColor: "skyblue",
  backgroundTexture: null,
  envMapTexture: null,
};

// const toneMappingOptions = {
//   None: "NoToneMapping",
//   Linear: "LinearToneMapping",
//   Reinhard: "ReinhardToneMapping",
//   Cineon: "CineonToneMapping",
//   ACESFilmic: "ACESFilmicToneMapping",
//   CustomToneMapping: "CustomToneMapping",
//   LUTToneMapping: "LUTToneMapping",
// };

let blenderLUTPromise; // lazy loaded

const updateMaterials = (scene) => {
  scene.traverse((o) => {
    if (o.material) o.material.needsUpdate = true;
  });
};

// settings example without GLTFHubsComponentsExtension plugin:
// {
//   "toneMapping": "LUTToneMapping",
//   "toneMappingExposure": 1,
//   "backgroundColor": "#ffffff",
//   "backgroundTexture": {
//       "__mhc_link_type": "texture",
//       "index": 0
//   },
//   "envMapTexture": {
//       "__mhc_link_type": "texture",
//       "index": 1
//   }
// }
// With GLTFHubsComponentsExtension plugin, backgroundTexture and envMapTexture are Texture objects.
function inflateEnvironmentSettings(sceneEl, settings) {
  const scene = sceneEl.object3D;
  const renderer = sceneEl.renderer;
  let materialsNeedUpdate = false;
  const newToneMapping = THREE[settings.toneMapping];
  if (typeof newToneMapping === "undefined") {
    console.error("You need an aframe build with the tonemappingLUT patch to make LUTToneMapping work.");
    return;
  }
  if (renderer.toneMapping !== newToneMapping) {
    renderer.toneMapping = newToneMapping;
    if (newToneMapping === THREE.LUTToneMapping) {
      if (!blenderLUTPromise) {
        blenderLUTPromise = new Promise(function (resolve, reject) {
          new three_addons_loaders_LUTCubeLoader_js__WEBPACK_IMPORTED_MODULE_1__.LUTCubeLoader().load(_assets_blender_lut_cube__WEBPACK_IMPORTED_MODULE_0__, ({ texture3D }) => resolve(texture3D), null, reject);
        });
      }

      blenderLUTPromise
        .then((t) => {
          renderer.tonemappingLUT = t;
          updateMaterials(scene);
        })
        .catch(function (e) {
          console.error("Error loading Blender LUT", e);
          blenderLUTPromise = null;
        });
    } else {
      renderer.tonemappingLUT = null;
      materialsNeedUpdate = true;
    }
  }

  renderer.toneMappingExposure = settings.toneMappingExposure;

  if (settings.backgroundTexture) {
    // Assume texture is always an equirect for now
    settings.backgroundTexture.mapping = THREE.EquirectangularReflectionMapping;
    settings.backgroundTexture.flipY = true;
    scene.background = settings.backgroundTexture;
  } else {
    scene.background = new THREE.Color(settings.backgroundColor);
  }
  if (settings.envMapTexture) {
    // if (this.prevEnvMapTextureUUID !== settings.envMapTexture.uuid) {
    // this.prevEnvMapTextureUUID = settings.envMapTexture.uuid;
    // TODO PMREMGenerator should be fixed to not assume this
    settings.envMapTexture.flipY = true;
    // Assume texture is always an equirect for now
    settings.envMapTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = settings.envMapTexture;
    // }
    // } else if (settings.skybox) {
    //   if (this.prevEnvMapTextureUUID !== settings.skybox.uuid) {
    //     this.prevEnvMapTextureUUID = settings.skybox.uuid;
    //     this.scene.environment = settings.skybox.sky.generateEnvironmentMap(this.renderer);
    //   }
  } else {
    scene.environment = null;
    // this.prevEnvMapTextureUUID = null;
  }

  if (materialsNeedUpdate) {
    updateMaterials(scene);
  }
}


/***/ }),

/***/ "./src/inflators/index.js":
/*!********************************!*\
  !*** ./src/inflators/index.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   gltfInflators: () => (/* binding */ gltfInflators)
/* harmony export */ });
/* harmony import */ var _environment_settings__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./environment-settings */ "./src/inflators/environment-settings.js");
/* harmony import */ var _media_frame__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./media-frame */ "./src/inflators/media-frame.js");
/* harmony import */ var _nav_mesh__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./nav-mesh */ "./src/inflators/nav-mesh.js");
/* harmony import */ var _reflection_probe__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./reflection-probe */ "./src/inflators/reflection-probe.js");
/* harmony import */ var _uv_scroll__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./uv-scroll */ "./src/inflators/uv-scroll.js");
/* harmony import */ var _waypoint__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./waypoint */ "./src/inflators/waypoint.js");







const gltfInflators = new Map();
gltfInflators.set("environment-settings", _environment_settings__WEBPACK_IMPORTED_MODULE_0__.inflateEnvironmentSettings);
gltfInflators.set("media-frame", _media_frame__WEBPACK_IMPORTED_MODULE_1__.inflateMediaFrame);
gltfInflators.set("nav-mesh", _nav_mesh__WEBPACK_IMPORTED_MODULE_2__.inflateNavMesh);
gltfInflators.set("reflection-probe", _reflection_probe__WEBPACK_IMPORTED_MODULE_3__.inflateReflectionProbe);
gltfInflators.set("uv-scroll", _uv_scroll__WEBPACK_IMPORTED_MODULE_4__.inflateUVScroll);
gltfInflators.set("waypoint", _waypoint__WEBPACK_IMPORTED_MODULE_5__.inflateWaypoint);


/***/ }),

/***/ "./src/inflators/media-frame.js":
/*!**************************************!*\
  !*** ./src/inflators/media-frame.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   inflateMediaFrame: () => (/* binding */ inflateMediaFrame)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils */ "./src/inflators/utils.js");


function inflateMediaFrame(node, componentProps, otherComponents) {
  const el = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.createEntityAndReparent)(node);
  el.classList.add("mediaframe");
  el.classList.add(node.name); // to view it in the editor

  // Set networked component first, media-frame is getting the networkId from networked component
  el.setAttribute("networked", {
    template: "#media-template",
    attachTemplateToLocal: false,
    networkId: otherComponents.networked.id,
    persistent: true,
    owner: "scene",
  });
  if (NAF.connection.adapter) {
    el.setAttribute("networked-video-source", {});
  } else {
    const listener = () => {
      el.setAttribute("networked-video-source", {});
    };
    document.body.addEventListener("connected", listener);
  }
  el.setAttribute("media-frame", componentProps);

  return el;
}


/***/ }),

/***/ "./src/inflators/nav-mesh.js":
/*!***********************************!*\
  !*** ./src/inflators/nav-mesh.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   inflateNavMesh: () => (/* binding */ inflateNavMesh)
/* harmony export */ });
function inflateNavMesh(node, componentProps, otherComponents) {
  const sceneEl = node.el.sceneEl;

  const el = document.createElement("a-entity");
  // Very important, add the class before appendChild.
  // The blink-controls component is using the child-attached event and will do a
  // evt.detail.el.matches(data.collisionEntities)) check,
  // so el.matches('.navmesh') before adding the element to collisionEntities array.
  el.classList.add("navmesh");
  el.setAttribute("nav-mesh", "");
  sceneEl.appendChild(el);
  el.setObject3D("mesh", node);
  // Reset simple-navmesh-constraint
  // Temporary until we add child-attached/child-detached support in simple-navmesh-constraint
  // https://github.com/networked-aframe/naf-valid-avatars/issues/28
  const cameraRig = document.querySelector("#rig,#cameraRig");
  if (cameraRig) {
    cameraRig.removeAttribute("simple-navmesh-constraint");
    cameraRig.setAttribute("simple-navmesh-constraint", "navmesh:.navmesh;fall:0.5;height:0;exclude:.navmesh-hole;");
  }
  return el;
}


/***/ }),

/***/ "./src/inflators/reflection-probe.js":
/*!*******************************************!*\
  !*** ./src/inflators/reflection-probe.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   inflateReflectionProbe: () => (/* binding */ inflateReflectionProbe)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils */ "./src/inflators/utils.js");
/* global THREE */


function inflateReflectionProbe(node, componentProps, otherComponents) {
  if (typeof THREE.ReflectionProbe === "undefined") {
    console.error("You need an aframe build with the ReflectionProbe patch to make reflection probes work.");
    return;
  }
  // TODO PMREMGenerator should be fixed to not assume this
  componentProps.envMapTexture.flipY = true;
  // Assume texture is always an equirect for now
  componentProps.envMapTexture.mapping = THREE.EquirectangularReflectionMapping;
  (0,_utils__WEBPACK_IMPORTED_MODULE_0__.addComponent)(node, "reflection-probe", componentProps);
}


/***/ }),

/***/ "./src/inflators/utils.js":
/*!********************************!*\
  !*** ./src/inflators/utils.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addComponent: () => (/* binding */ addComponent),
/* harmony export */   createEntityAndReparent: () => (/* binding */ createEntityAndReparent)
/* harmony export */ });
/* harmony import */ var _components_FakeEntity__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../components/FakeEntity */ "./src/components/FakeEntity.js");


const addComponent = (node, componentName, data) => {
  if (!node.fakeEl) {
    node.fakeEl = new _components_FakeEntity__WEBPACK_IMPORTED_MODULE_0__.FakeEntity(node);
  }
  const componentId = undefined; // supporting only one component of the same type on a FakeEntity
  const component = new AFRAME.components[componentName].Component(node.fakeEl, data, componentId);
  component.play();
  return component;
};

const createEntityAndReparent = (node, klass = undefined) => {
  const sceneEl = node.el.sceneEl;
  const entity = document.createElement("a-entity");
  if (klass) {
    entity.classList.add(klass);
  }
  sceneEl.appendChild(entity);
  entity.object3D.removeFromParent();
  entity.object3D = node;
  entity.object3D.el = entity;
  // We assume here that node local position/quaternion is the same as world position/quaternion
  sceneEl.object3D.attach(node);
  return entity;
};


/***/ }),

/***/ "./src/inflators/uv-scroll.js":
/*!************************************!*\
  !*** ./src/inflators/uv-scroll.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   inflateUVScroll: () => (/* binding */ inflateUVScroll)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils */ "./src/inflators/utils.js");
/* harmony import */ var _components_FakeEntity__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../components/FakeEntity */ "./src/components/FakeEntity.js");



function inflateUVScroll(node, componentProps, otherComponents) {
  // set the node (plane geometry) as the 'mesh' first
  node.fakeEl = new _components_FakeEntity__WEBPACK_IMPORTED_MODULE_1__.FakeEntity(node);
  node.fakeEl.setObject3D("mesh", node);
  // then add uv-scroll that uses getObject3D("mesh")
  (0,_utils__WEBPACK_IMPORTED_MODULE_0__.addComponent)(node, "uv-scroll", componentProps);
}


/***/ }),

/***/ "./src/inflators/waypoint.js":
/*!***********************************!*\
  !*** ./src/inflators/waypoint.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   inflateWaypoint: () => (/* binding */ inflateWaypoint)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils */ "./src/inflators/utils.js");


function inflateWaypoint(node, componentProps, otherComponents) {
  const el = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.createEntityAndReparent)(node);

  if (componentProps.canBeOccupied) {
    el.setAttribute("networked", {
      template: "#waypoint-template",
      attachTemplateToLocal: false,
      networkId: otherComponents.networked.id,
      persistent: true,
      owner: "scene",
    });
  }

  el.setAttribute("waypoint", componentProps);

  if (componentProps.canBeClicked && componentProps.canBeOccupied) {
    if (componentProps.willDisableMotion) {
      el.setAttribute("gltf-model", "/models/waypoint_sit.glb");
    } else {
      el.setAttribute("gltf-model", "/models/waypoint_stand.glb");
    }
  }

  return el;
}


/***/ }),

/***/ "./src/assets/blender-lut.cube":
/*!*************************************!*\
  !*** ./src/assets/blender-lut.cube ***!
  \*************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "assets/e6acb8ca8505336d09c6.cube";

/***/ }),

/***/ "./src/assets/waternormals.jpg":
/*!*************************************!*\
  !*** ./src/assets/waternormals.jpg ***!
  \*************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "assets/537ec85b965d414829ab.jpg";

/***/ }),

/***/ "three":
/*!************************!*\
  !*** external "THREE" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE_three__;

/***/ }),

/***/ "./node_modules/three/examples/jsm/loaders/LUTCubeLoader.js":
/*!******************************************************************!*\
  !*** ./node_modules/three/examples/jsm/loaders/LUTCubeLoader.js ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LUTCubeLoader: () => (/* binding */ LUTCubeLoader)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
// https://wwwimages2.adobe.com/content/dam/acom/en/products/speedgrade/cc/pdfs/cube-lut-specification-1.0.pdf



class LUTCubeLoader extends three__WEBPACK_IMPORTED_MODULE_0__.Loader {

	constructor( manager ) {

		super( manager );

		this.type = three__WEBPACK_IMPORTED_MODULE_0__.UnsignedByteType;

	}

	setType( type ) {

		if ( type !== three__WEBPACK_IMPORTED_MODULE_0__.UnsignedByteType && type !== three__WEBPACK_IMPORTED_MODULE_0__.FloatType ) {

			throw new Error( 'LUTCubeLoader: Unsupported type' );

		}

		this.type = type;

		return this;

	}

	load( url, onLoad, onProgress, onError ) {

		const loader = new three__WEBPACK_IMPORTED_MODULE_0__.FileLoader( this.manager );
		loader.setPath( this.path );
		loader.setResponseType( 'text' );
		loader.load( url, text => {

			try {

				onLoad( this.parse( text ) );

			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				this.manager.itemError( url );

			}

		}, onProgress, onError );

	}

	parse( input ) {

		const regExpTitle = /TITLE +"([^"]*)"/;
		const regExpSize = /LUT_3D_SIZE +(\d+)/;
		const regExpDomainMin = /DOMAIN_MIN +([\d.]+) +([\d.]+) +([\d.]+)/;
		const regExpDomainMax = /DOMAIN_MAX +([\d.]+) +([\d.]+) +([\d.]+)/;
		const regExpDataPoints = /^([\d.e+-]+) +([\d.e+-]+) +([\d.e+-]+) *$/gm;

		let result = regExpTitle.exec( input );
		const title = ( result !== null ) ? result[ 1 ] : null;

		result = regExpSize.exec( input );

		if ( result === null ) {

			throw new Error( 'LUTCubeLoader: Missing LUT_3D_SIZE information' );

		}

		const size = Number( result[ 1 ] );
		const length = size ** 3 * 4;
		const data = this.type === three__WEBPACK_IMPORTED_MODULE_0__.UnsignedByteType ? new Uint8Array( length ) : new Float32Array( length );

		const domainMin = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3( 0, 0, 0 );
		const domainMax = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3( 1, 1, 1 );

		result = regExpDomainMin.exec( input );

		if ( result !== null ) {

			domainMin.set( Number( result[ 1 ] ), Number( result[ 2 ] ), Number( result[ 3 ] ) );

		}

		result = regExpDomainMax.exec( input );

		if ( result !== null ) {

			domainMax.set( Number( result[ 1 ] ), Number( result[ 2 ] ), Number( result[ 3 ] ) );

		}

		if ( domainMin.x > domainMax.x || domainMin.y > domainMax.y || domainMin.z > domainMax.z ) {

			throw new Error( 'LUTCubeLoader: Invalid input domain' );

		}

		const scale = this.type === three__WEBPACK_IMPORTED_MODULE_0__.UnsignedByteType ? 255 : 1;
		let i = 0;

		while ( ( result = regExpDataPoints.exec( input ) ) !== null ) {

			data[ i ++ ] = Number( result[ 1 ] ) * scale;
			data[ i ++ ] = Number( result[ 2 ] ) * scale;
			data[ i ++ ] = Number( result[ 3 ] ) * scale;
			data[ i ++ ] = scale;

		}

		const texture = new three__WEBPACK_IMPORTED_MODULE_0__.DataTexture();
		texture.image.data = data;
		texture.image.width = size;
		texture.image.height = size * size;
		texture.type = this.type;
		texture.magFilter = three__WEBPACK_IMPORTED_MODULE_0__.LinearFilter;
		texture.minFilter = three__WEBPACK_IMPORTED_MODULE_0__.LinearFilter;
		texture.wrapS = three__WEBPACK_IMPORTED_MODULE_0__.ClampToEdgeWrapping;
		texture.wrapT = three__WEBPACK_IMPORTED_MODULE_0__.ClampToEdgeWrapping;
		texture.generateMipmaps = false;
		texture.needsUpdate = true;

		const texture3D = new three__WEBPACK_IMPORTED_MODULE_0__.Data3DTexture();
		texture3D.image.data = data;
		texture3D.image.width = size;
		texture3D.image.height = size;
		texture3D.image.depth = size;
		texture3D.type = this.type;
		texture3D.magFilter = three__WEBPACK_IMPORTED_MODULE_0__.LinearFilter;
		texture3D.minFilter = three__WEBPACK_IMPORTED_MODULE_0__.LinearFilter;
		texture3D.wrapS = three__WEBPACK_IMPORTED_MODULE_0__.ClampToEdgeWrapping;
		texture3D.wrapT = three__WEBPACK_IMPORTED_MODULE_0__.ClampToEdgeWrapping;
		texture3D.wrapR = three__WEBPACK_IMPORTED_MODULE_0__.ClampToEdgeWrapping;
		texture3D.generateMipmaps = false;
		texture3D.needsUpdate = true;

		return {
			title,
			size,
			domainMin,
			domainMax,
			texture,
			texture3D,
		};

	}

}


/***/ }),

/***/ "./node_modules/three/examples/jsm/loaders/RGBELoader.js":
/*!***************************************************************!*\
  !*** ./node_modules/three/examples/jsm/loaders/RGBELoader.js ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RGBELoader: () => (/* binding */ RGBELoader)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");


// https://github.com/mrdoob/three.js/issues/5552
// http://en.wikipedia.org/wiki/RGBE_image_format

class RGBELoader extends three__WEBPACK_IMPORTED_MODULE_0__.DataTextureLoader {

	constructor( manager ) {

		super( manager );

		this.type = three__WEBPACK_IMPORTED_MODULE_0__.HalfFloatType;

	}

	// adapted from http://www.graphics.cornell.edu/~bjw/rgbe.html

	parse( buffer ) {

		const
			/* default error routine.  change this to change error handling */
			rgbe_read_error = 1,
			rgbe_write_error = 2,
			rgbe_format_error = 3,
			rgbe_memory_error = 4,
			rgbe_error = function ( rgbe_error_code, msg ) {

				switch ( rgbe_error_code ) {

					case rgbe_read_error: throw new Error( 'THREE.RGBELoader: Read Error: ' + ( msg || '' ) );
					case rgbe_write_error: throw new Error( 'THREE.RGBELoader: Write Error: ' + ( msg || '' ) );
					case rgbe_format_error: throw new Error( 'THREE.RGBELoader: Bad File Format: ' + ( msg || '' ) );
					default:
					case rgbe_memory_error: throw new Error( 'THREE.RGBELoader: Memory Error: ' + ( msg || '' ) );

				}

			},

			/* offsets to red, green, and blue components in a data (float) pixel */
			//RGBE_DATA_RED = 0,
			//RGBE_DATA_GREEN = 1,
			//RGBE_DATA_BLUE = 2,

			/* number of floats per pixel, use 4 since stored in rgba image format */
			//RGBE_DATA_SIZE = 4,

			/* flags indicating which fields in an rgbe_header_info are valid */
			RGBE_VALID_PROGRAMTYPE = 1,
			RGBE_VALID_FORMAT = 2,
			RGBE_VALID_DIMENSIONS = 4,

			NEWLINE = '\n',

			fgets = function ( buffer, lineLimit, consume ) {

				const chunkSize = 128;

				lineLimit = ! lineLimit ? 1024 : lineLimit;
				let p = buffer.pos,
					i = - 1, len = 0, s = '',
					chunk = String.fromCharCode.apply( null, new Uint16Array( buffer.subarray( p, p + chunkSize ) ) );

				while ( ( 0 > ( i = chunk.indexOf( NEWLINE ) ) ) && ( len < lineLimit ) && ( p < buffer.byteLength ) ) {

					s += chunk; len += chunk.length;
					p += chunkSize;
					chunk += String.fromCharCode.apply( null, new Uint16Array( buffer.subarray( p, p + chunkSize ) ) );

				}

				if ( - 1 < i ) {

					/*for (i=l-1; i>=0; i--) {
						byteCode = m.charCodeAt(i);
						if (byteCode > 0x7f && byteCode <= 0x7ff) byteLen++;
						else if (byteCode > 0x7ff && byteCode <= 0xffff) byteLen += 2;
						if (byteCode >= 0xDC00 && byteCode <= 0xDFFF) i--; //trail surrogate
					}*/
					if ( false !== consume ) buffer.pos += len + i + 1;
					return s + chunk.slice( 0, i );

				}

				return false;

			},

			/* minimal header reading.  modify if you want to parse more information */
			RGBE_ReadHeader = function ( buffer ) {


				// regexes to parse header info fields
				const magic_token_re = /^#\?(\S+)/,
					gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,
					exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,
					format_re = /^\s*FORMAT=(\S+)\s*$/,
					dimensions_re = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,

					// RGBE format header struct
					header = {

						valid: 0, /* indicate which fields are valid */

						string: '', /* the actual header string */

						comments: '', /* comments found in header */

						programtype: 'RGBE', /* listed at beginning of file to identify it after "#?". defaults to "RGBE" */

						format: '', /* RGBE format, default 32-bit_rle_rgbe */

						gamma: 1.0, /* image has already been gamma corrected with given gamma. defaults to 1.0 (no correction) */

						exposure: 1.0, /* a value of 1.0 in an image corresponds to <exposure> watts/steradian/m^2. defaults to 1.0 */

						width: 0, height: 0 /* image dimensions, width/height */

					};

				let line, match;

				if ( buffer.pos >= buffer.byteLength || ! ( line = fgets( buffer ) ) ) {

					rgbe_error( rgbe_read_error, 'no header found' );

				}

				/* if you want to require the magic token then uncomment the next line */
				if ( ! ( match = line.match( magic_token_re ) ) ) {

					rgbe_error( rgbe_format_error, 'bad initial token' );

				}

				header.valid |= RGBE_VALID_PROGRAMTYPE;
				header.programtype = match[ 1 ];
				header.string += line + '\n';

				while ( true ) {

					line = fgets( buffer );
					if ( false === line ) break;
					header.string += line + '\n';

					if ( '#' === line.charAt( 0 ) ) {

						header.comments += line + '\n';
						continue; // comment line

					}

					if ( match = line.match( gamma_re ) ) {

						header.gamma = parseFloat( match[ 1 ] );

					}

					if ( match = line.match( exposure_re ) ) {

						header.exposure = parseFloat( match[ 1 ] );

					}

					if ( match = line.match( format_re ) ) {

						header.valid |= RGBE_VALID_FORMAT;
						header.format = match[ 1 ];//'32-bit_rle_rgbe';

					}

					if ( match = line.match( dimensions_re ) ) {

						header.valid |= RGBE_VALID_DIMENSIONS;
						header.height = parseInt( match[ 1 ], 10 );
						header.width = parseInt( match[ 2 ], 10 );

					}

					if ( ( header.valid & RGBE_VALID_FORMAT ) && ( header.valid & RGBE_VALID_DIMENSIONS ) ) break;

				}

				if ( ! ( header.valid & RGBE_VALID_FORMAT ) ) {

					rgbe_error( rgbe_format_error, 'missing format specifier' );

				}

				if ( ! ( header.valid & RGBE_VALID_DIMENSIONS ) ) {

					rgbe_error( rgbe_format_error, 'missing image size specifier' );

				}

				return header;

			},

			RGBE_ReadPixels_RLE = function ( buffer, w, h ) {

				const scanline_width = w;

				if (
					// run length encoding is not allowed so read flat
					( ( scanline_width < 8 ) || ( scanline_width > 0x7fff ) ) ||
					// this file is not run length encoded
					( ( 2 !== buffer[ 0 ] ) || ( 2 !== buffer[ 1 ] ) || ( buffer[ 2 ] & 0x80 ) )
				) {

					// return the flat buffer
					return new Uint8Array( buffer );

				}

				if ( scanline_width !== ( ( buffer[ 2 ] << 8 ) | buffer[ 3 ] ) ) {

					rgbe_error( rgbe_format_error, 'wrong scanline width' );

				}

				const data_rgba = new Uint8Array( 4 * w * h );

				if ( ! data_rgba.length ) {

					rgbe_error( rgbe_memory_error, 'unable to allocate buffer space' );

				}

				let offset = 0, pos = 0;

				const ptr_end = 4 * scanline_width;
				const rgbeStart = new Uint8Array( 4 );
				const scanline_buffer = new Uint8Array( ptr_end );
				let num_scanlines = h;

				// read in each successive scanline
				while ( ( num_scanlines > 0 ) && ( pos < buffer.byteLength ) ) {

					if ( pos + 4 > buffer.byteLength ) {

						rgbe_error( rgbe_read_error );

					}

					rgbeStart[ 0 ] = buffer[ pos ++ ];
					rgbeStart[ 1 ] = buffer[ pos ++ ];
					rgbeStart[ 2 ] = buffer[ pos ++ ];
					rgbeStart[ 3 ] = buffer[ pos ++ ];

					if ( ( 2 != rgbeStart[ 0 ] ) || ( 2 != rgbeStart[ 1 ] ) || ( ( ( rgbeStart[ 2 ] << 8 ) | rgbeStart[ 3 ] ) != scanline_width ) ) {

						rgbe_error( rgbe_format_error, 'bad rgbe scanline format' );

					}

					// read each of the four channels for the scanline into the buffer
					// first red, then green, then blue, then exponent
					let ptr = 0, count;

					while ( ( ptr < ptr_end ) && ( pos < buffer.byteLength ) ) {

						count = buffer[ pos ++ ];
						const isEncodedRun = count > 128;
						if ( isEncodedRun ) count -= 128;

						if ( ( 0 === count ) || ( ptr + count > ptr_end ) ) {

							rgbe_error( rgbe_format_error, 'bad scanline data' );

						}

						if ( isEncodedRun ) {

							// a (encoded) run of the same value
							const byteValue = buffer[ pos ++ ];
							for ( let i = 0; i < count; i ++ ) {

								scanline_buffer[ ptr ++ ] = byteValue;

							}
							//ptr += count;

						} else {

							// a literal-run
							scanline_buffer.set( buffer.subarray( pos, pos + count ), ptr );
							ptr += count; pos += count;

						}

					}


					// now convert data from buffer into rgba
					// first red, then green, then blue, then exponent (alpha)
					const l = scanline_width; //scanline_buffer.byteLength;
					for ( let i = 0; i < l; i ++ ) {

						let off = 0;
						data_rgba[ offset ] = scanline_buffer[ i + off ];
						off += scanline_width; //1;
						data_rgba[ offset + 1 ] = scanline_buffer[ i + off ];
						off += scanline_width; //1;
						data_rgba[ offset + 2 ] = scanline_buffer[ i + off ];
						off += scanline_width; //1;
						data_rgba[ offset + 3 ] = scanline_buffer[ i + off ];
						offset += 4;

					}

					num_scanlines --;

				}

				return data_rgba;

			};

		const RGBEByteToRGBFloat = function ( sourceArray, sourceOffset, destArray, destOffset ) {

			const e = sourceArray[ sourceOffset + 3 ];
			const scale = Math.pow( 2.0, e - 128.0 ) / 255.0;

			destArray[ destOffset + 0 ] = sourceArray[ sourceOffset + 0 ] * scale;
			destArray[ destOffset + 1 ] = sourceArray[ sourceOffset + 1 ] * scale;
			destArray[ destOffset + 2 ] = sourceArray[ sourceOffset + 2 ] * scale;
			destArray[ destOffset + 3 ] = 1;

		};

		const RGBEByteToRGBHalf = function ( sourceArray, sourceOffset, destArray, destOffset ) {

			const e = sourceArray[ sourceOffset + 3 ];
			const scale = Math.pow( 2.0, e - 128.0 ) / 255.0;

			// clamping to 65504, the maximum representable value in float16
			destArray[ destOffset + 0 ] = three__WEBPACK_IMPORTED_MODULE_0__.DataUtils.toHalfFloat( Math.min( sourceArray[ sourceOffset + 0 ] * scale, 65504 ) );
			destArray[ destOffset + 1 ] = three__WEBPACK_IMPORTED_MODULE_0__.DataUtils.toHalfFloat( Math.min( sourceArray[ sourceOffset + 1 ] * scale, 65504 ) );
			destArray[ destOffset + 2 ] = three__WEBPACK_IMPORTED_MODULE_0__.DataUtils.toHalfFloat( Math.min( sourceArray[ sourceOffset + 2 ] * scale, 65504 ) );
			destArray[ destOffset + 3 ] = three__WEBPACK_IMPORTED_MODULE_0__.DataUtils.toHalfFloat( 1 );

		};

		const byteArray = new Uint8Array( buffer );
		byteArray.pos = 0;
		const rgbe_header_info = RGBE_ReadHeader( byteArray );

		const w = rgbe_header_info.width,
			h = rgbe_header_info.height,
			image_rgba_data = RGBE_ReadPixels_RLE( byteArray.subarray( byteArray.pos ), w, h );


		let data, type;
		let numElements;

		switch ( this.type ) {

			case three__WEBPACK_IMPORTED_MODULE_0__.FloatType:

				numElements = image_rgba_data.length / 4;
				const floatArray = new Float32Array( numElements * 4 );

				for ( let j = 0; j < numElements; j ++ ) {

					RGBEByteToRGBFloat( image_rgba_data, j * 4, floatArray, j * 4 );

				}

				data = floatArray;
				type = three__WEBPACK_IMPORTED_MODULE_0__.FloatType;
				break;

			case three__WEBPACK_IMPORTED_MODULE_0__.HalfFloatType:

				numElements = image_rgba_data.length / 4;
				const halfArray = new Uint16Array( numElements * 4 );

				for ( let j = 0; j < numElements; j ++ ) {

					RGBEByteToRGBHalf( image_rgba_data, j * 4, halfArray, j * 4 );

				}

				data = halfArray;
				type = three__WEBPACK_IMPORTED_MODULE_0__.HalfFloatType;
				break;

			default:

				throw new Error( 'THREE.RGBELoader: Unsupported type: ' + this.type );
				break;

		}

		return {
			width: w, height: h,
			data: data,
			header: rgbe_header_info.string,
			gamma: rgbe_header_info.gamma,
			exposure: rgbe_header_info.exposure,
			type: type
		};

	}

	setDataType( value ) {

		this.type = value;
		return this;

	}

	load( url, onLoad, onProgress, onError ) {

		function onLoadCallback( texture, texData ) {

			switch ( texture.type ) {

				case three__WEBPACK_IMPORTED_MODULE_0__.FloatType:
				case three__WEBPACK_IMPORTED_MODULE_0__.HalfFloatType:

					texture.colorSpace = three__WEBPACK_IMPORTED_MODULE_0__.LinearSRGBColorSpace;
					texture.minFilter = three__WEBPACK_IMPORTED_MODULE_0__.LinearFilter;
					texture.magFilter = three__WEBPACK_IMPORTED_MODULE_0__.LinearFilter;
					texture.generateMipmaps = false;
					texture.flipY = true;

					break;

			}

			if ( onLoad ) onLoad( texture, texData );

		}

		return super.load( url, onLoadCallback, onProgress, onError );

	}

}




/***/ }),

/***/ "./node_modules/three/examples/jsm/math/SimplexNoise.js":
/*!**************************************************************!*\
  !*** ./node_modules/three/examples/jsm/math/SimplexNoise.js ***!
  \**************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SimplexNoise: () => (/* binding */ SimplexNoise)
/* harmony export */ });
// Ported from Stefan Gustavson's java implementation
// http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
// Read Stefan's excellent paper for details on how this code works.
//
// Sean McCullough banksean@gmail.com
//
// Added 4D noise

/**
 * You can pass in a random number generator object if you like.
 * It is assumed to have a random() method.
 */
class SimplexNoise {

	constructor( r = Math ) {

		this.grad3 = [[ 1, 1, 0 ], [ - 1, 1, 0 ], [ 1, - 1, 0 ], [ - 1, - 1, 0 ],
			[ 1, 0, 1 ], [ - 1, 0, 1 ], [ 1, 0, - 1 ], [ - 1, 0, - 1 ],
			[ 0, 1, 1 ], [ 0, - 1, 1 ], [ 0, 1, - 1 ], [ 0, - 1, - 1 ]];

		this.grad4 = [[ 0, 1, 1, 1 ], [ 0, 1, 1, - 1 ], [ 0, 1, - 1, 1 ], [ 0, 1, - 1, - 1 ],
			[ 0, - 1, 1, 1 ], [ 0, - 1, 1, - 1 ], [ 0, - 1, - 1, 1 ], [ 0, - 1, - 1, - 1 ],
			[ 1, 0, 1, 1 ], [ 1, 0, 1, - 1 ], [ 1, 0, - 1, 1 ], [ 1, 0, - 1, - 1 ],
			[ - 1, 0, 1, 1 ], [ - 1, 0, 1, - 1 ], [ - 1, 0, - 1, 1 ], [ - 1, 0, - 1, - 1 ],
			[ 1, 1, 0, 1 ], [ 1, 1, 0, - 1 ], [ 1, - 1, 0, 1 ], [ 1, - 1, 0, - 1 ],
			[ - 1, 1, 0, 1 ], [ - 1, 1, 0, - 1 ], [ - 1, - 1, 0, 1 ], [ - 1, - 1, 0, - 1 ],
			[ 1, 1, 1, 0 ], [ 1, 1, - 1, 0 ], [ 1, - 1, 1, 0 ], [ 1, - 1, - 1, 0 ],
			[ - 1, 1, 1, 0 ], [ - 1, 1, - 1, 0 ], [ - 1, - 1, 1, 0 ], [ - 1, - 1, - 1, 0 ]];

		this.p = [];

		for ( let i = 0; i < 256; i ++ ) {

			this.p[ i ] = Math.floor( r.random() * 256 );

		}

		// To remove the need for index wrapping, double the permutation table length
		this.perm = [];

		for ( let i = 0; i < 512; i ++ ) {

			this.perm[ i ] = this.p[ i & 255 ];

		}

		// A lookup table to traverse the simplex around a given point in 4D.
		// Details can be found where this table is used, in the 4D noise method.
		this.simplex = [
			[ 0, 1, 2, 3 ], [ 0, 1, 3, 2 ], [ 0, 0, 0, 0 ], [ 0, 2, 3, 1 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 1, 2, 3, 0 ],
			[ 0, 2, 1, 3 ], [ 0, 0, 0, 0 ], [ 0, 3, 1, 2 ], [ 0, 3, 2, 1 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 1, 3, 2, 0 ],
			[ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ],
			[ 1, 2, 0, 3 ], [ 0, 0, 0, 0 ], [ 1, 3, 0, 2 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 2, 3, 0, 1 ], [ 2, 3, 1, 0 ],
			[ 1, 0, 2, 3 ], [ 1, 0, 3, 2 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 2, 0, 3, 1 ], [ 0, 0, 0, 0 ], [ 2, 1, 3, 0 ],
			[ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ],
			[ 2, 0, 1, 3 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 3, 0, 1, 2 ], [ 3, 0, 2, 1 ], [ 0, 0, 0, 0 ], [ 3, 1, 2, 0 ],
			[ 2, 1, 0, 3 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 3, 1, 0, 2 ], [ 0, 0, 0, 0 ], [ 3, 2, 0, 1 ], [ 3, 2, 1, 0 ]];

	}

	dot( g, x, y ) {

		return g[ 0 ] * x + g[ 1 ] * y;

	}

	dot3( g, x, y, z ) {

		return g[ 0 ] * x + g[ 1 ] * y + g[ 2 ] * z;

	}

	dot4( g, x, y, z, w ) {

		return g[ 0 ] * x + g[ 1 ] * y + g[ 2 ] * z + g[ 3 ] * w;

	}

	noise( xin, yin ) {

		let n0; // Noise contributions from the three corners
		let n1;
		let n2;
		// Skew the input space to determine which simplex cell we're in
		const F2 = 0.5 * ( Math.sqrt( 3.0 ) - 1.0 );
		const s = ( xin + yin ) * F2; // Hairy factor for 2D
		const i = Math.floor( xin + s );
		const j = Math.floor( yin + s );
		const G2 = ( 3.0 - Math.sqrt( 3.0 ) ) / 6.0;
		const t = ( i + j ) * G2;
		const X0 = i - t; // Unskew the cell origin back to (x,y) space
		const Y0 = j - t;
		const x0 = xin - X0; // The x,y distances from the cell origin
		const y0 = yin - Y0;

		// For the 2D case, the simplex shape is an equilateral triangle.
		// Determine which simplex we are in.
		let i1; // Offsets for second (middle) corner of simplex in (i,j) coords

		let j1;
		if ( x0 > y0 ) {

			i1 = 1; j1 = 0;

			// lower triangle, XY order: (0,0)->(1,0)->(1,1)

		}	else {

			i1 = 0; j1 = 1;

		} // upper triangle, YX order: (0,0)->(0,1)->(1,1)

		// A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
		// a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
		// c = (3-sqrt(3))/6
		const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
		const y1 = y0 - j1 + G2;
		const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
		const y2 = y0 - 1.0 + 2.0 * G2;
		// Work out the hashed gradient indices of the three simplex corners
		const ii = i & 255;
		const jj = j & 255;
		const gi0 = this.perm[ ii + this.perm[ jj ] ] % 12;
		const gi1 = this.perm[ ii + i1 + this.perm[ jj + j1 ] ] % 12;
		const gi2 = this.perm[ ii + 1 + this.perm[ jj + 1 ] ] % 12;
		// Calculate the contribution from the three corners
		let t0 = 0.5 - x0 * x0 - y0 * y0;
		if ( t0 < 0 ) n0 = 0.0;
		else {

			t0 *= t0;
			n0 = t0 * t0 * this.dot( this.grad3[ gi0 ], x0, y0 ); // (x,y) of grad3 used for 2D gradient

		}

		let t1 = 0.5 - x1 * x1 - y1 * y1;
		if ( t1 < 0 ) n1 = 0.0;
		else {

			t1 *= t1;
			n1 = t1 * t1 * this.dot( this.grad3[ gi1 ], x1, y1 );

		}

		let t2 = 0.5 - x2 * x2 - y2 * y2;
		if ( t2 < 0 ) n2 = 0.0;
		else {

			t2 *= t2;
			n2 = t2 * t2 * this.dot( this.grad3[ gi2 ], x2, y2 );

		}

		// Add contributions from each corner to get the final noise value.
		// The result is scaled to return values in the interval [-1,1].
		return 70.0 * ( n0 + n1 + n2 );

	}

	// 3D simplex noise
	noise3d( xin, yin, zin ) {

		let n0; // Noise contributions from the four corners
		let n1;
		let n2;
		let n3;
		// Skew the input space to determine which simplex cell we're in
		const F3 = 1.0 / 3.0;
		const s = ( xin + yin + zin ) * F3; // Very nice and simple skew factor for 3D
		const i = Math.floor( xin + s );
		const j = Math.floor( yin + s );
		const k = Math.floor( zin + s );
		const G3 = 1.0 / 6.0; // Very nice and simple unskew factor, too
		const t = ( i + j + k ) * G3;
		const X0 = i - t; // Unskew the cell origin back to (x,y,z) space
		const Y0 = j - t;
		const Z0 = k - t;
		const x0 = xin - X0; // The x,y,z distances from the cell origin
		const y0 = yin - Y0;
		const z0 = zin - Z0;

		// For the 3D case, the simplex shape is a slightly irregular tetrahedron.
		// Determine which simplex we are in.
		let i1; // Offsets for second corner of simplex in (i,j,k) coords

		let j1;
		let k1;
		let i2; // Offsets for third corner of simplex in (i,j,k) coords
		let j2;
		let k2;
		if ( x0 >= y0 ) {

			if ( y0 >= z0 ) {

				i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;

				// X Y Z order

			} else if ( x0 >= z0 ) {

				i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;

				// X Z Y order

			} else {

				i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;

			} // Z X Y order

		} else { // x0<y0

			if ( y0 < z0 ) {

				i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;

				// Z Y X order

			} else if ( x0 < z0 ) {

				i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;

				// Y Z X order

			} else {

				i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;

			} // Y X Z order

		}

		// A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
		// a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
		// a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
		// c = 1/6.
		const x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
		const y1 = y0 - j1 + G3;
		const z1 = z0 - k1 + G3;
		const x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
		const y2 = y0 - j2 + 2.0 * G3;
		const z2 = z0 - k2 + 2.0 * G3;
		const x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
		const y3 = y0 - 1.0 + 3.0 * G3;
		const z3 = z0 - 1.0 + 3.0 * G3;
		// Work out the hashed gradient indices of the four simplex corners
		const ii = i & 255;
		const jj = j & 255;
		const kk = k & 255;
		const gi0 = this.perm[ ii + this.perm[ jj + this.perm[ kk ] ] ] % 12;
		const gi1 = this.perm[ ii + i1 + this.perm[ jj + j1 + this.perm[ kk + k1 ] ] ] % 12;
		const gi2 = this.perm[ ii + i2 + this.perm[ jj + j2 + this.perm[ kk + k2 ] ] ] % 12;
		const gi3 = this.perm[ ii + 1 + this.perm[ jj + 1 + this.perm[ kk + 1 ] ] ] % 12;
		// Calculate the contribution from the four corners
		let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
		if ( t0 < 0 ) n0 = 0.0;
		else {

			t0 *= t0;
			n0 = t0 * t0 * this.dot3( this.grad3[ gi0 ], x0, y0, z0 );

		}

		let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
		if ( t1 < 0 ) n1 = 0.0;
		else {

			t1 *= t1;
			n1 = t1 * t1 * this.dot3( this.grad3[ gi1 ], x1, y1, z1 );

		}

		let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
		if ( t2 < 0 ) n2 = 0.0;
		else {

			t2 *= t2;
			n2 = t2 * t2 * this.dot3( this.grad3[ gi2 ], x2, y2, z2 );

		}

		let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
		if ( t3 < 0 ) n3 = 0.0;
		else {

			t3 *= t3;
			n3 = t3 * t3 * this.dot3( this.grad3[ gi3 ], x3, y3, z3 );

		}

		// Add contributions from each corner to get the final noise value.
		// The result is scaled to stay just inside [-1,1]
		return 32.0 * ( n0 + n1 + n2 + n3 );

	}

	// 4D simplex noise
	noise4d( x, y, z, w ) {

		// For faster and easier lookups
		const grad4 = this.grad4;
		const simplex = this.simplex;
		const perm = this.perm;

		// The skewing and unskewing factors are hairy again for the 4D case
		const F4 = ( Math.sqrt( 5.0 ) - 1.0 ) / 4.0;
		const G4 = ( 5.0 - Math.sqrt( 5.0 ) ) / 20.0;
		let n0; // Noise contributions from the five corners
		let n1;
		let n2;
		let n3;
		let n4;
		// Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
		const s = ( x + y + z + w ) * F4; // Factor for 4D skewing
		const i = Math.floor( x + s );
		const j = Math.floor( y + s );
		const k = Math.floor( z + s );
		const l = Math.floor( w + s );
		const t = ( i + j + k + l ) * G4; // Factor for 4D unskewing
		const X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
		const Y0 = j - t;
		const Z0 = k - t;
		const W0 = l - t;
		const x0 = x - X0; // The x,y,z,w distances from the cell origin
		const y0 = y - Y0;
		const z0 = z - Z0;
		const w0 = w - W0;

		// For the 4D case, the simplex is a 4D shape I won't even try to describe.
		// To find out which of the 24 possible simplices we're in, we need to
		// determine the magnitude ordering of x0, y0, z0 and w0.
		// The method below is a good way of finding the ordering of x,y,z,w and
		// then find the correct traversal order for the simplex we’re in.
		// First, six pair-wise comparisons are performed between each possible pair
		// of the four coordinates, and the results are used to add up binary bits
		// for an integer index.
		const c1 = ( x0 > y0 ) ? 32 : 0;
		const c2 = ( x0 > z0 ) ? 16 : 0;
		const c3 = ( y0 > z0 ) ? 8 : 0;
		const c4 = ( x0 > w0 ) ? 4 : 0;
		const c5 = ( y0 > w0 ) ? 2 : 0;
		const c6 = ( z0 > w0 ) ? 1 : 0;
		const c = c1 + c2 + c3 + c4 + c5 + c6;

		// simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
		// Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
		// impossible. Only the 24 indices which have non-zero entries make any sense.
		// We use a thresholding to set the coordinates in turn from the largest magnitude.
		// The number 3 in the "simplex" array is at the position of the largest coordinate.
		const i1 = simplex[ c ][ 0 ] >= 3 ? 1 : 0;
		const j1 = simplex[ c ][ 1 ] >= 3 ? 1 : 0;
		const k1 = simplex[ c ][ 2 ] >= 3 ? 1 : 0;
		const l1 = simplex[ c ][ 3 ] >= 3 ? 1 : 0;
		// The number 2 in the "simplex" array is at the second largest coordinate.
		const i2 = simplex[ c ][ 0 ] >= 2 ? 1 : 0;
		const j2 = simplex[ c ][ 1 ] >= 2 ? 1 : 0;
		const k2 = simplex[ c ][ 2 ] >= 2 ? 1 : 0;
		const l2 = simplex[ c ][ 3 ] >= 2 ? 1 : 0;
		// The number 1 in the "simplex" array is at the second smallest coordinate.
		const i3 = simplex[ c ][ 0 ] >= 1 ? 1 : 0;
		const j3 = simplex[ c ][ 1 ] >= 1 ? 1 : 0;
		const k3 = simplex[ c ][ 2 ] >= 1 ? 1 : 0;
		const l3 = simplex[ c ][ 3 ] >= 1 ? 1 : 0;
		// The fifth corner has all coordinate offsets = 1, so no need to look that up.
		const x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
		const y1 = y0 - j1 + G4;
		const z1 = z0 - k1 + G4;
		const w1 = w0 - l1 + G4;
		const x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
		const y2 = y0 - j2 + 2.0 * G4;
		const z2 = z0 - k2 + 2.0 * G4;
		const w2 = w0 - l2 + 2.0 * G4;
		const x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
		const y3 = y0 - j3 + 3.0 * G4;
		const z3 = z0 - k3 + 3.0 * G4;
		const w3 = w0 - l3 + 3.0 * G4;
		const x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
		const y4 = y0 - 1.0 + 4.0 * G4;
		const z4 = z0 - 1.0 + 4.0 * G4;
		const w4 = w0 - 1.0 + 4.0 * G4;
		// Work out the hashed gradient indices of the five simplex corners
		const ii = i & 255;
		const jj = j & 255;
		const kk = k & 255;
		const ll = l & 255;
		const gi0 = perm[ ii + perm[ jj + perm[ kk + perm[ ll ] ] ] ] % 32;
		const gi1 = perm[ ii + i1 + perm[ jj + j1 + perm[ kk + k1 + perm[ ll + l1 ] ] ] ] % 32;
		const gi2 = perm[ ii + i2 + perm[ jj + j2 + perm[ kk + k2 + perm[ ll + l2 ] ] ] ] % 32;
		const gi3 = perm[ ii + i3 + perm[ jj + j3 + perm[ kk + k3 + perm[ ll + l3 ] ] ] ] % 32;
		const gi4 = perm[ ii + 1 + perm[ jj + 1 + perm[ kk + 1 + perm[ ll + 1 ] ] ] ] % 32;
		// Calculate the contribution from the five corners
		let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
		if ( t0 < 0 ) n0 = 0.0;
		else {

			t0 *= t0;
			n0 = t0 * t0 * this.dot4( grad4[ gi0 ], x0, y0, z0, w0 );

		}

		let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
		if ( t1 < 0 ) n1 = 0.0;
		else {

			t1 *= t1;
			n1 = t1 * t1 * this.dot4( grad4[ gi1 ], x1, y1, z1, w1 );

		}

		let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
		if ( t2 < 0 ) n2 = 0.0;
		else {

			t2 *= t2;
			n2 = t2 * t2 * this.dot4( grad4[ gi2 ], x2, y2, z2, w2 );

		}

		let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
		if ( t3 < 0 ) n3 = 0.0;
		else {

			t3 *= t3;
			n3 = t3 * t3 * this.dot4( grad4[ gi3 ], x3, y3, z3, w3 );

		}

		let t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
		if ( t4 < 0 ) n4 = 0.0;
		else {

			t4 *= t4;
			n4 = t4 * t4 * this.dot4( grad4[ gi4 ], x4, y4, z4, w4 );

		}

		// Sum up and scale the result to cover the range [-1,1]
		return 27.0 * ( n0 + n1 + n2 + n3 + n4 );

	}

}




/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "";
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _components_environment_settings__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./components/environment-settings */ "./src/components/environment-settings.js");
/* harmony import */ var _components_gltf_model_plus__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./components/gltf-model-plus */ "./src/components/gltf-model-plus.js");
/* harmony import */ var _components_media_frame__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./components/media-frame */ "./src/components/media-frame.js");
/* harmony import */ var _components_reflection_probe__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./components/reflection-probe */ "./src/components/reflection-probe.js");
/* harmony import */ var _components_reflection_probe__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_components_reflection_probe__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _components_simple_water__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./components/simple-water */ "./src/components/simple-water.js");
/* harmony import */ var _components_uv_scroll__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./components/uv-scroll */ "./src/components/uv-scroll.js");
/* harmony import */ var _components_uv_scroll__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_components_uv_scroll__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _components_waypoint__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./components/waypoint */ "./src/components/waypoint.js");
/* harmony import */ var _inflators__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./inflators */ "./src/inflators/index.js");








// Calculate the base URL based on the script's src attribute
const baseUrl = new URL(document.currentScript.src).href.replace(/gltf-model-plus.min.js$/, "");
// Set the webpack public path to load assets from the correct location
__webpack_require__.p = `${baseUrl}dist/`;

})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=gltf-model-plus.js.map