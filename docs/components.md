# Components

## billboard

Rotate plane towards the camera:

```html
<a-plane
  width="1.5"
  height="0.5"
  material="color: black"
  text="value: hello world; width: 4; align: center"
  position="-2.5 -3.5 -1"
  billboard
></a-plane>
```

By default it rotates only on the vertical axis (`onlyY: true`).
To rotate on all axes: `billboard="onlyY: false"`

## move-to-spawn-point

Move camera rig to the first spawn point after the scene glb is loaded.

```html
<a-entity id="rig" move-to-spawn-point></a-entity>
```

## move-to-unoccupied-waypoint

After 3s delay on naf connected event:

```html
<a-entity id="rig" move-to-unoccupied-waypoint="on: connected; delay: 3"></a-entity>
```

A delay is needed so we have the waypoints isOccupied information from the other participants.

or on a plane on click (default):

```html
<a-plane
  class="clickable"
  width="1.5"
  height="0.5"
  material="color: black"
  text="value: sit on a\nnearby seat; width: 4; align: center"
  position="-2.5 -3.5 -1"
  billboard
  move-to-unoccupied-waypoint
></a-plane>
```

## a-waypoint primitive

Seated waypoint:

```html
<a-cylinder radius="0.25" height="0.5" position="-3.5 -4.74 -3" rotation="0 -150 0">
  <a-waypoint
    id="seat1"
    position="0 0.2 0"
    can-be-clicked="true"
    can-be-occupied="true"
    will-disable-motion="true"
  ></a-waypoint>
</a-cylinder>
```

Spawn point:

```html
<a-waypoint id="spawnpoint" can-be-spawn-point="true" position="-25 0 0" rotation="0 90 0"></a-waypoint>
```
