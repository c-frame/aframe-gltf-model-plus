/* global AFRAME */
import { ParticleEmitter } from "lib-hubs/packages/three-particle-emitter/lib/esm/index";
import { TextureLoader } from "three";
import { disposeNode } from "../components/gltf-model-plus";

AFRAME.registerComponent("particle-emitter", {
  schema: {
    src: { type: "string", default: "" },
    startColor: { type: "color", default: "#ffffff" },
    middleColor: { type: "color", default: "#ffffff" },
    endColor: { type: "color", default: "#ffffff" },
    startOpacity: { type: "number", default: 1 },
    middleOpacity: { type: "number", default: 1 },
    endOpacity: { type: "number", default: 1 },
    colorCurve: { type: "string", default: "linear" },
    sizeCurve: { type: "string", default: "linear" },
    startSize: { type: "number", default: 0.25 },
    endSize: { type: "number", default: 0.25 },
    sizeRandomness: { type: "number", default: 0 },
    ageRandomness: { type: "number", default: 10 },
    lifetime: { type: "number", default: 5 },
    lifetimeRandomness: { type: "number", default: 10 },
    particleCount: { type: "number", default: 100 },
    startVelocity: { type: "vec3", default: { x: 0, y: 0, z: 0.5 } },
    endVelocity: { type: "vec3", default: { x: 0, y: 0, z: 0.5 } },
    velocityCurve: { type: "string", default: "linear" },
    angularVelocity: { type: "number", default: 0 },
  },

  init() {
    this.particleEmitter = new ParticleEmitter(null);
    this.particleEmitter.visible = false;
    this.el.setObject3D("particle-emitter", this.particleEmitter);
    this.updateParticles = false;
  },

  remove() {
    disposeNode(this.particleEmitter);
  },

  async setTexture(src) {
    const textureLoader = new TextureLoader().setCrossOrigin('anonymous');
    const texture = await textureLoader.loadAsync(src);

    // Guard against src changing while request was in flight
    if (this.data.src !== src) {
      return;
    }

    this.particleEmitter.material.uniforms.map.value = texture;
    this.particleEmitter.visible = true;
    this.updateParticles = true;
  },

  update(prevData) {
    const data = this.data;
    const particleEmitter = this.particleEmitter;

    if (prevData.src !== data.src) {
      this.setTexture(data.src).catch(console.error);
    }

    if (
      prevData.startColor !== data.startColor ||
      prevData.startSize !== data.startSize ||
      prevData.sizeRandomness !== data.sizeRandomness ||
      prevData.ageRandomness !== data.ageRandomness ||
      prevData.lifetime !== data.lifetime ||
      prevData.lifetimeRandomness !== data.lifetimeRandomness ||
      prevData.particleCount !== data.particleCount
    ) {
      this.updateParticles = true;
    }

    particleEmitter.startColor.set(data.startColor);
    particleEmitter.middleColor.set(data.middleColor);
    particleEmitter.endColor.set(data.endColor);
    particleEmitter.startOpacity = data.startOpacity;
    particleEmitter.middleOpacity = data.middleOpacity;
    particleEmitter.endOpacity = data.endOpacity;
    particleEmitter.colorCurve = data.colorCurve;
    particleEmitter.sizeCurve = data.sizeCurve;
    particleEmitter.startSize = data.startSize;
    particleEmitter.endSize = data.endSize;
    particleEmitter.sizeRandomness = data.sizeRandomness;
    particleEmitter.ageRandomness = data.ageRandomness;
    particleEmitter.lifetime = data.lifetime;
    particleEmitter.lifetimeRandomness = data.lifetimeRandomness;
    particleEmitter.particleCount = data.particleCount;
    particleEmitter.startVelocity.copy(data.startVelocity);
    particleEmitter.endVelocity.copy(data.endVelocity);
    particleEmitter.velocityCurve = data.velocityCurve;
    particleEmitter.angularVelocity = data.angularVelocity;
  },

  tick(time, dt) {
    if (this.updateParticles) {
      this.particleEmitter.updateParticles();
      this.updateParticles = false;
    }

    if (this.particleEmitter.visible) {
      this.particleEmitter.update(dt / 1000);
    }
  },
});
