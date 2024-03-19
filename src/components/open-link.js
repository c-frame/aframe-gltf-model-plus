/* global AFRAME */
AFRAME.registerComponent("open-link", {
  schema: {
    on: { type: "string", default: "click" },
    href: { type: "string", default: "" },
  },

  init() {
    this.move = this.move.bind(this);
  },

  play() {
    this.el.addEventListener(this.data.on, this.move);
  },

  pause() {
    this.el.removeEventListener(this.data.on, this.move);
  },

  move() {
    if (this.data.href.startsWith("#")) {
      const waypoint = document.querySelector(this.data.href);
      if (!waypoint) {
        console.warn(`No waypoint found with the id ${this.data.href}`);
      } else {
        waypoint.emit("click");
      }
    } else {
      if (this.el.sceneEl.is("vr-mode")) {
        this.el.sceneEl.exitVR();
      }
      window.open(this.data.href);
    }
  },
});
