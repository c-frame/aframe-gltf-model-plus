/* global AFRAME, THREE */
import { addComponent } from "../inflators/utils";
import { EventDispatcher } from "./EventDispatcher";

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
export class FakeEntity extends EventDispatcher {
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
